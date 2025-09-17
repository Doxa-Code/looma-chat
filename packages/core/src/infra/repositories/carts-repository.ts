import { Cart } from "../../domain/entities/cart";
import { CartProduct } from "../../domain/entities/cart-product";
import { and, eq, or, sql } from "drizzle-orm";
import { createDatabaseConnection } from "../database";
import {
  addresses,
  carts,
  clients,
  contacts,
  conversations,
  productsOnCart,
  users,
} from "../database/schemas";
import { PaymentMethodValue } from "../../domain/value-objects/payment-method";
import { asc } from "drizzle-orm";
import { desc } from "drizzle-orm";

export class CartsDatabaseRepository {
  private timestampToDate(timestamp: number) {
    return new Date(timestamp * 1000);
  }

  private dateToTimestamp(date: Date) {
    return Math.floor(date.getTime() / 1000);
  }

  async upsert(cart: Cart, conversationId: string) {
    const db = createDatabaseConnection();
    const [conversation] = await db
      .select({
        contactPhone: conversations.contactPhone,
        channel: conversations.channel,
      })
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    if (!conversation) return;

    const cartNewValues = {
      id: cart.id,
      attendantId: cart.attendant.id,
      contactPhone: conversation.contactPhone!,
      channel: conversation.channel!,
      clientId: cart.client?.id,
      addressId: cart.address?.id ?? null,
      status: cart.status.value,
      createdAt: this.dateToTimestamp(cart.createdAt),
      orderedAt: cart.orderedAt ? this.dateToTimestamp(cart.orderedAt) : null,
      expiredAt: cart.expiredAt ? this.dateToTimestamp(cart.expiredAt) : null,
      shippedAt: cart.shippedAt ? this.dateToTimestamp(cart.shippedAt) : null,
      processingAt: cart.processingAt
        ? this.dateToTimestamp(cart.processingAt)
        : null,
      finishedAt: cart.finishedAt
        ? this.dateToTimestamp(cart.finishedAt)
        : null,
      canceledAt: cart.canceledAt
        ? this.dateToTimestamp(cart.canceledAt)
        : null,
      paymentMethod: cart.paymentMethod?.value ?? null,
      paymentChange: cart.paymentChange ? cart.paymentChange * 100 : null,
      cancelReason: cart.cancelReason,
    };

    const productsOnCartNewValues =
      (await Promise.all(
        cart.products?.map(async (product) => {
          const [productOnCart] = await db
            .select({
              id: productsOnCart.id,
            })
            .from(productsOnCart)
            .where(
              and(
                eq(productsOnCart.cartId, cart.id),
                eq(productsOnCart.productId, product.id)
              )
            );

          return {
            id: productOnCart?.id
              ? productOnCart.id
              : crypto.randomUUID().toString(),
            cartId: cart.id,
            productId: product.id,
            description: product.description,
            price: Math.round(product.price * 100),
            realPrice: Math.round(product.realPrice * 100),
            quantity: product.quantity,
          };
        })
      )) ?? [];

    await db.transaction(async (tx) => {
      if (cart.address) {
        await tx.insert(addresses).values(cart.address).onConflictDoUpdate({
          set: cart.address,
          target: addresses.id,
        });
      }
      await tx
        .insert(carts)
        .values(cartNewValues)
        .onConflictDoUpdate({
          target: [carts.contactPhone, carts.channel],
          set: cartNewValues,
        });
      await Promise.all(
        productsOnCartNewValues.map(async (product) => {
          await tx.insert(productsOnCart).values(product).onConflictDoUpdate({
            target: productsOnCart.id,
            set: product,
          });
        })
      );
    });
  }

  async removeProduct(cartId: string, productId: string) {
    const db = createDatabaseConnection();
    await db
      .delete(productsOnCart)
      .where(
        and(
          eq(productsOnCart.cartId, cartId),
          eq(productsOnCart.productId, productId)
        )
      );
  }

  async retrieveConversationId(cartId: string) {
    const db = createDatabaseConnection();

    const [cart] = await db
      .select({
        contactPhone: carts.contactPhone,
        channel: carts.channel,
      })
      .from(carts)
      .where(eq(carts.id, cartId));

    return cart || null;
  }

  async retrieveOpenCartByConversationId(
    conversationId: string,
    workspaceId: string
  ): Promise<Cart | null> {
    const db = createDatabaseConnection();

    const [cart] = await db
      .select({
        id: carts.id,
        attendant: {
          id: users.id,
          name: users.name,
        },
        address: {
          id: addresses.id,
          street: addresses.street,
          number: addresses.number,
          neighborhood: addresses.neighborhood,
          city: addresses.city,
          state: addresses.state,
          zipCode: addresses.zipCode,
          country: addresses.country,
          note: addresses.note,
        },
        status: carts.status,
        createdAt: carts.createdAt,
        orderedAt: carts.orderedAt,
        processingAt: carts.processingAt,
        shippedAt: carts.shippedAt,
        expiredAt: carts.expiredAt,
        finishedAt: carts.finishedAt,
        canceledAt: carts.canceledAt,
        paymentMethod: carts.paymentMethod,
        paymentChange: carts.paymentChange,
        cancelReason: carts.cancelReason,
        clientId: carts.clientId,
        products: sql`
                COALESCE(
                  JSON_AGG(
                    JSON_BUILD_OBJECT(
                      'id', ${productsOnCart.productId},
                      'description', ${productsOnCart.description},
                      'price', ${productsOnCart.price},
                      'realPrice', ${productsOnCart.realPrice},
                      'quantity', ${productsOnCart.quantity}
                    )
                  )
                FILTER (WHERE ${productsOnCart.id} IS NOT NULL), '[]')::json
              `.as("products"),
      })
      .from(carts)
      .innerJoin(users, eq(carts.attendantId, users.id))
      .leftJoin(
        conversations,
        and(
          eq(conversations.channel, carts.channel),
          eq(conversations.contactPhone, carts.contactPhone)
        )
      )
      .innerJoin(addresses, eq(addresses.id, carts.addressId))
      .leftJoin(productsOnCart, eq(carts.id, productsOnCart.cartId))
      .where(
        and(
          eq(conversations.id, conversationId),
          or(eq(carts.status, "budget"), eq(carts.status, "order"))
        )
      )
      .groupBy(
        carts.id,
        users.id,
        users.name,
        addresses.id,
        addresses.street,
        addresses.number,
        addresses.neighborhood,
        addresses.city,
        addresses.state,
        addresses.zipCode,
        addresses.country,
        addresses.note,
        carts.status
      );

    if (!cart) return null;

    const [client] = await db
      .select({
        id: clients.id,
        address: {
          id: addresses.id,
          street: addresses.street,
          number: addresses.number,
          neighborhood: addresses.neighborhood,
          city: addresses.city,
          state: addresses.state,
          zipCode: addresses.zipCode,
          country: addresses.country,
          note: addresses.note,
        },
        contact: {
          phone: contacts.phone,
          name: contacts.name,
        },
      })
      .from(clients)
      .leftJoin(addresses, eq(clients.addressId, addresses.id))
      .leftJoin(contacts, eq(clients.contactPhone, contacts.phone))
      .leftJoin(
        conversations,
        eq(clients.contactPhone, conversations.contactPhone)
      )
      .where(
        and(
          eq(clients.id, cart.clientId!),
          eq(clients.workspaceId, workspaceId)
        )
      );

    if (!client) return null;

    return Cart.instance({
      address: cart.address,
      attendant: cart.attendant,
      client: {
        address: client.address,
        contact: client.contact!,
        id: client.id,
      },
      id: cart.id,
      products: (cart.products as CartProduct.Props[]).map((p) => ({
        id: p.id,
        description: p.description,
        price: p.price / 100,
        realPrice: p.realPrice / 100,
        quantity: p.quantity,
      })),
      status: cart.status as any,
      createdAt: this.timestampToDate(cart.createdAt),
      orderedAt: cart.orderedAt ? this.timestampToDate(cart.orderedAt) : null,
      expiredAt: cart.expiredAt ? this.timestampToDate(cart.expiredAt) : null,
      processingAt: cart.processingAt
        ? this.timestampToDate(cart.processingAt)
        : null,
      shippedAt: cart.shippedAt ? this.timestampToDate(cart.shippedAt) : null,
      finishedAt: cart.finishedAt
        ? this.timestampToDate(cart.finishedAt)
        : null,
      canceledAt: cart.canceledAt
        ? this.timestampToDate(cart.canceledAt)
        : null,
      paymentMethod: cart.paymentMethod as PaymentMethodValue,
      paymentChange: cart.paymentChange ? cart.paymentChange / 100 : null,
      cancelReason: cart.cancelReason,
    });
  }

  async retrieveLastCartByContactPhone(
    contactPhone: string,
    workspaceId: string
  ): Promise<Cart | null> {
    const db = createDatabaseConnection();

    const [client] = await db
      .select({
        id: clients.id,
        address: {
          id: addresses.id,
          street: addresses.street,
          number: addresses.number,
          neighborhood: addresses.neighborhood,
          city: addresses.city,
          state: addresses.state,
          zipCode: addresses.zipCode,
          country: addresses.country,
          note: addresses.note,
        },
        contact: {
          phone: contacts.phone,
          name: contacts.name,
        },
      })
      .from(clients)
      .leftJoin(addresses, eq(clients.addressId, addresses.id))
      .leftJoin(contacts, eq(clients.contactPhone, contacts.phone))
      .leftJoin(
        conversations,
        eq(clients.contactPhone, conversations.contactPhone)
      )
      .where(
        and(
          eq(clients.contactPhone, contactPhone),
          eq(clients.workspaceId, workspaceId)
        )
      );

    if (!client) return null;

    const [cart] = await db
      .select({
        id: carts.id,
        attendant: {
          id: users.id,
          name: users.name,
        },
        address: {
          id: addresses.id,
          street: addresses.street,
          number: addresses.number,
          neighborhood: addresses.neighborhood,
          city: addresses.city,
          state: addresses.state,
          zipCode: addresses.zipCode,
          country: addresses.country,
          note: addresses.note,
        },
        status: carts.status,
        createdAt: carts.createdAt,
        orderedAt: carts.orderedAt,
        expiredAt: carts.expiredAt,
        shippedAt: carts.shippedAt,
        processingAt: carts.processingAt,
        finishedAt: carts.finishedAt,
        canceledAt: carts.canceledAt,
        paymentMethod: carts.paymentMethod,
        paymentChange: carts.paymentChange,
        cancelReason: carts.cancelReason,
        products: sql`
                COALESCE(
                  JSON_AGG(
                    JSON_BUILD_OBJECT(
                      'id', ${productsOnCart.productId},
                      'description', ${productsOnCart.description},
                      'price', ${productsOnCart.price},
                      'realPrice', ${productsOnCart.realPrice},
                      'quantity', ${productsOnCart.quantity}
                    )
                  )
                FILTER (WHERE ${productsOnCart.id} IS NOT NULL), '[]')::json
              `.as("products"),
      })
      .from(carts)
      .innerJoin(users, eq(carts.attendantId, users.id))
      .innerJoin(addresses, eq(addresses.id, carts.addressId))
      .leftJoin(productsOnCart, eq(carts.id, productsOnCart.cartId))
      .where(
        and(
          eq(carts.clientId, client.id),
          or(
            eq(carts.status, "finished"),
            eq(carts.status, "order"),
            eq(carts.status, "shipped")
          )
        )
      )
      .orderBy(desc(carts.createdAt))
      .groupBy(
        carts.id,
        users.id,
        users.name,
        addresses.id,
        addresses.street,
        addresses.number,
        addresses.neighborhood,
        addresses.city,
        addresses.state,
        addresses.zipCode,
        addresses.country,
        addresses.note,
        carts.status
      );

    if (!cart) return null;

    return Cart.instance({
      address: cart.address,
      attendant: cart.attendant,
      client: {
        address: client.address,
        contact: client.contact!,
        id: client.id,
      },
      id: cart.id,
      products: (cart.products as CartProduct.Props[]).map((p) => ({
        id: p.id,
        description: p.description,
        price: p.price / 100,
        realPrice: p.realPrice / 100,
        quantity: p.quantity,
      })),
      status: cart.status as any,
      createdAt: this.timestampToDate(cart.createdAt),
      orderedAt: cart.orderedAt ? this.timestampToDate(cart.orderedAt) : null,
      expiredAt: cart.expiredAt ? this.timestampToDate(cart.expiredAt) : null,
      processingAt: cart.processingAt
        ? this.timestampToDate(cart.processingAt)
        : null,
      shippedAt: cart.shippedAt ? this.timestampToDate(cart.shippedAt) : null,
      finishedAt: cart.finishedAt
        ? this.timestampToDate(cart.finishedAt)
        : null,
      canceledAt: cart.canceledAt
        ? this.timestampToDate(cart.canceledAt)
        : null,
      paymentMethod: cart.paymentMethod as PaymentMethodValue,
      paymentChange: cart.paymentChange ? cart.paymentChange / 100 : null,
      cancelReason: cart.cancelReason,
    });
  }

  async retrieve(id: string): Promise<Cart | null> {
    const db = createDatabaseConnection();

    const [client] = await db
      .select({
        id: clients.id,
        address: {
          id: addresses.id,
          street: addresses.street,
          number: addresses.number,
          neighborhood: addresses.neighborhood,
          city: addresses.city,
          state: addresses.state,
          zipCode: addresses.zipCode,
          country: addresses.country,
          note: addresses.note,
        },
        contact: {
          phone: contacts.phone,
          name: contacts.name,
        },
      })
      .from(clients)
      .leftJoin(addresses, eq(clients.addressId, addresses.id))
      .leftJoin(contacts, eq(clients.contactPhone, contacts.phone))
      .leftJoin(
        conversations,
        eq(clients.contactPhone, conversations.contactPhone)
      )
      .leftJoin(
        conversations,
        and(
          eq(conversations.channel, carts.channel),
          eq(conversations.contactPhone, carts.contactPhone)
        )
      )
      .where(eq(carts.id, id));

    if (!client) return null;

    const [cart] = await db
      .select({
        id: carts.id,
        attendant: {
          id: users.id,
          name: users.name,
        },
        address: {
          id: addresses.id,
          street: addresses.street,
          number: addresses.number,
          neighborhood: addresses.neighborhood,
          city: addresses.city,
          state: addresses.state,
          zipCode: addresses.zipCode,
          country: addresses.country,
          note: addresses.note,
        },
        status: carts.status,
        createdAt: carts.createdAt,
        orderedAt: carts.orderedAt,
        expiredAt: carts.expiredAt,
        finishedAt: carts.finishedAt,
        shippedAt: carts.shippedAt,
        processingAt: carts.processingAt,
        canceledAt: carts.canceledAt,
        paymentMethod: carts.paymentMethod,
        paymentChange: carts.paymentChange,
        cancelReason: carts.cancelReason,
        products: sql`
                COALESCE(
                  JSON_AGG(
                    JSON_BUILD_OBJECT(
                      'id', ${productsOnCart.productId},
                      'description', ${productsOnCart.description},
                      'price', ${productsOnCart.price},
                      'realPrice', ${productsOnCart.realPrice},
                      'quantity', ${productsOnCart.quantity}
                    )
                  )
                FILTER (WHERE ${productsOnCart.id} IS NOT NULL), '[]')::json
              `.as("products"),
      })
      .from(carts)
      .innerJoin(users, eq(carts.attendantId, users.id))
      .innerJoin(addresses, eq(addresses.id, carts.addressId))
      .leftJoin(productsOnCart, eq(carts.id, productsOnCart.cartId))
      .where(eq(carts.id, id))
      .groupBy(
        carts.id,
        users.id,
        users.name,
        addresses.id,
        addresses.street,
        addresses.number,
        addresses.neighborhood,
        addresses.city,
        addresses.state,
        addresses.zipCode,
        addresses.country,
        addresses.note,
        carts.status
      );

    if (!cart) return null;

    return Cart.instance({
      address: cart.address,
      attendant: cart.attendant,
      client: {
        address: client.address,
        contact: client.contact!,
        id: client.id,
      },
      id: cart.id,
      products: (cart.products as CartProduct.Props[]).map((p) => ({
        id: p.id,
        description: p.description,
        price: p.price / 100,
        realPrice: p.realPrice / 100,
        quantity: p.quantity,
      })),
      status: cart.status as any,
      createdAt: this.timestampToDate(cart.createdAt),
      orderedAt: cart.orderedAt ? this.timestampToDate(cart.orderedAt) : null,
      expiredAt: cart.expiredAt ? this.timestampToDate(cart.expiredAt) : null,
      processingAt: cart.processingAt
        ? this.timestampToDate(cart.processingAt)
        : null,
      shippedAt: cart.shippedAt ? this.timestampToDate(cart.shippedAt) : null,
      finishedAt: cart.finishedAt
        ? this.timestampToDate(cart.finishedAt)
        : null,
      canceledAt: cart.canceledAt
        ? this.timestampToDate(cart.canceledAt)
        : null,
      paymentMethod: cart.paymentMethod as PaymentMethodValue,
      paymentChange: cart.paymentChange ? cart.paymentChange / 100 : null,
      cancelReason: cart.cancelReason ?? null,
    });
  }

  async list(workspaceId: string): Promise<Cart.Raw[]> {
    const db = createDatabaseConnection();

    const allCarts = await db
      .select({
        id: carts.id,
        attendant: {
          id: users.id,
          name: users.name,
        },
        address: {
          id: addresses.id,
          street: addresses.street,
          number: addresses.number,
          neighborhood: addresses.neighborhood,
          city: addresses.city,
          state: addresses.state,
          zipCode: addresses.zipCode,
          country: addresses.country,
          note: addresses.note,
        },
        status: carts.status,
        createdAt: carts.createdAt,
        orderedAt: carts.orderedAt,
        expiredAt: carts.expiredAt,
        finishedAt: carts.finishedAt,
        shippedAt: carts.shippedAt,
        processingAt: carts.processingAt,
        canceledAt: carts.canceledAt,
        paymentMethod: carts.paymentMethod,
        paymentChange: carts.paymentChange,
        products: sql`
                COALESCE(
                  JSON_AGG(
                    JSON_BUILD_OBJECT(
                      'id', ${productsOnCart.productId},
                      'description', ${productsOnCart.description},
                      'price', ${productsOnCart.price},
                      'realPrice', ${productsOnCart.realPrice},
                      'quantity', ${productsOnCart.quantity}
                    )
                  )
                FILTER (WHERE ${productsOnCart.id} IS NOT NULL), '[]')::json
              `.as("products"),
      })
      .from(carts)
      .innerJoin(
        conversations,
        and(
          eq(conversations.channel, carts.channel),
          eq(conversations.contactPhone, carts.contactPhone)
        )
      )
      .innerJoin(users, eq(carts.attendantId, users.id))
      .innerJoin(addresses, eq(addresses.id, carts.addressId))
      .leftJoin(productsOnCart, eq(carts.id, productsOnCart.cartId))
      .where(eq(conversations.workspaceId, workspaceId))
      .orderBy(asc(carts.createdAt))
      .groupBy(
        carts.id,
        users.id,
        users.name,
        addresses.id,
        addresses.street,
        addresses.number,
        addresses.neighborhood,
        addresses.city,
        addresses.state,
        addresses.zipCode,
        addresses.country,
        addresses.note,
        carts.status
      );

    const result = await Promise.all(
      allCarts.map(async (cart) => {
        const [client] = await db
          .select({
            id: clients.id,
            address: {
              id: addresses.id,
              street: addresses.street,
              number: addresses.number,
              neighborhood: addresses.neighborhood,
              city: addresses.city,
              state: addresses.state,
              zipCode: addresses.zipCode,
              country: addresses.country,
              note: addresses.note,
            },
            contact: {
              phone: contacts.phone,
              name: contacts.name,
            },
          })
          .from(clients)
          .leftJoin(addresses, eq(clients.addressId, addresses.id))
          .leftJoin(contacts, eq(clients.contactPhone, contacts.phone))
          .leftJoin(
            conversations,
            eq(clients.contactPhone, conversations.contactPhone)
          )
          .leftJoin(
            conversations,
            and(
              eq(conversations.channel, carts.channel),
              eq(conversations.contactPhone, carts.contactPhone)
            )
          )
          .where(eq(carts.id, cart.id));

        if (!client) return null;

        return {
          address: cart.address,
          attendant: cart.attendant,
          client: {
            address: client.address,
            contact: client.contact!,
            id: client.id,
          },
          id: cart.id,
          products: (cart.products as CartProduct.Props[]).map((p) => ({
            id: p.id,
            description: p.description,
            price: p.price / 100,
            realPrice: p.realPrice / 100,
            quantity: p.quantity,
          })),
          status: cart.status as any,
          createdAt: this.timestampToDate(cart.createdAt),
          orderedAt: cart.orderedAt
            ? this.timestampToDate(cart.orderedAt)
            : null,
          expiredAt: cart.expiredAt
            ? this.timestampToDate(cart.expiredAt)
            : null,
          finishedAt: cart.finishedAt
            ? this.timestampToDate(cart.finishedAt)
            : null,
          canceledAt: cart.canceledAt
            ? this.timestampToDate(cart.canceledAt)
            : null,
          paymentMethod: cart.paymentMethod as PaymentMethodValue,
          paymentChange: cart.paymentChange ? cart.paymentChange / 100 : null,
        } as Cart.Raw;
      })
    );

    return result.filter((c) => c !== null);
  }
  static instance() {
    return new CartsDatabaseRepository();
  }
}
