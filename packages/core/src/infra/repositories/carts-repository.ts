import { Cart } from "@looma/core/domain/entities/cart";
import { CartProduct } from "@looma/core/domain/entities/cart-product";
import { Client } from "@looma/core/domain/entities/client";
import { Address } from "@looma/core/domain/value-objects/address";
import { Attendant } from "@looma/core/domain/value-objects/attendant";
import { Contact } from "@looma/core/domain/value-objects/contact";
import { Status } from "@looma/core/domain/value-objects/status";
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
import {
  PaymentMethod,
  PaymentMethodValue,
} from "./../../domain/value-objects/payment-method";

export class CartsRepository {
  private timestampToDate(timestamp: number) {
    return new Date(timestamp * 1000);
  }

  private dateToTimestamp(date: Date) {
    return Math.floor(date.getTime() / 1000);
  }

  async upsert(cart: Cart, workspaceId: string) {
    const db = createDatabaseConnection();

    const [client] = await db
      .select({
        id: clients.id,
        contactPhone: clients.contactPhone,
        addressId: clients.addressId,
        conversationId: conversations.id,
      })
      .from(clients)
      .innerJoin(contacts, eq(clients.contactPhone, contacts.phone))
      .leftJoin(
        conversations,
        and(
          eq(conversations.contactPhone, clients.contactPhone),
          eq(conversations.status, "open")
        )
      )
      .where(
        and(
          eq(contacts.phone, cart.client.contact.phone),
          eq(clients.workspaceId, workspaceId)
        )
      );

    const cartNewValues = {
      id: cart.id,
      attendantId: cart.attendant.id,
      conversationId: client?.conversationId,
      clientId: client?.id,
      addressId: cart.address?.id ?? null,
      status: cart.status.value,
      createdAt: this.dateToTimestamp(cart.createdAt),
      orderedAt: cart.orderedAt ? this.dateToTimestamp(cart.orderedAt) : null,
      expiredAt: cart.expiredAt ? this.dateToTimestamp(cart.expiredAt) : null,
      finishedAt: cart.finishedAt
        ? this.dateToTimestamp(cart.finishedAt)
        : null,
      canceledAt: cart.canceledAt
        ? this.dateToTimestamp(cart.canceledAt)
        : null,
      paymentMethod: cart.paymentMethod?.value,
      paymentChange: cart.paymentChange ? cart.paymentChange * 100 : null,
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
            price: product.price * 100,
            realPrice: product.realPrice * 100,
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
          target: carts.id,
          set: cartNewValues,
        })
        .returning();

      await Promise.all(
        productsOnCartNewValues.map(async (product) => {
          const [productInserted] = await tx
            .insert(productsOnCart)
            .values(product)
            .onConflictDoUpdate({
              target: productsOnCart.id,
              set: product,
            })
            .returning();
          return productInserted;
        })
      );
    });

    await db.$client.end();
  }

  async retrieveOpenCartByConversationId(
    conversationId: string,
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
          eq(conversations.id, conversationId),
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
        finishedAt: carts.finishedAt,
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
      .innerJoin(users, eq(carts.attendantId, users.id))
      .innerJoin(addresses, eq(addresses.id, carts.addressId))
      .leftJoin(productsOnCart, eq(carts.id, productsOnCart.cartId))
      .where(
        and(
          eq(carts.conversationId, conversationId),
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

    await db.$client.end();

    if (!cart) return null;

    return Cart.instance({
      address: Address.create(cart.address),
      attendant: Attendant.create(cart.attendant.id, cart.attendant.name),
      client: Client.instance({
        address: Address.create(client.address!),
        contact: Contact.create(client.contact!.phone, client.contact?.name),
        id: client.id,
      }),
      id: cart.id,
      products: (cart.products as CartProduct.Props[]).map((p) =>
        CartProduct.instance({
          id: p.id,
          description: p.description,
          price: p.price / 100,
          realPrice: p.realPrice / 100,
          quantity: p.quantity,
        })
      ),
      status: Status.create(cart.status),
      createdAt: this.timestampToDate(cart.createdAt),
      orderedAt: cart.orderedAt ? this.timestampToDate(cart.orderedAt) : null,
      expiredAt: cart.expiredAt ? this.timestampToDate(cart.expiredAt) : null,
      finishedAt: cart.finishedAt
        ? this.timestampToDate(cart.finishedAt)
        : null,
      canceledAt: cart.canceledAt
        ? this.timestampToDate(cart.canceledAt)
        : null,
      paymentMethod: cart.paymentMethod
        ? PaymentMethod.create(cart.paymentMethod as PaymentMethodValue)
        : null,
      paymentChange: cart.paymentChange ? cart.paymentChange / 100 : null,
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
        finishedAt: carts.finishedAt,
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
      .innerJoin(users, eq(carts.attendantId, users.id))
      .innerJoin(addresses, eq(addresses.id, carts.addressId))
      .leftJoin(productsOnCart, eq(carts.id, productsOnCart.cartId))
      .where(eq(carts.clientId, client.id))
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

    await db.$client.end();

    if (!cart) return null;

    return Cart.instance({
      address: Address.create(cart.address),
      attendant: Attendant.create(cart.attendant.id, cart.attendant.name),
      client: Client.instance({
        address: Address.create(client.address!),
        contact: Contact.create(client.contact!.phone, client.contact?.name),
        id: client.id,
      }),
      id: cart.id,
      products: (cart.products as CartProduct.Props[]).map((p) =>
        CartProduct.instance({
          id: p.id,
          description: p.description,
          price: p.price / 100,
          realPrice: p.realPrice / 100,
          quantity: p.quantity,
        })
      ),
      status: Status.create(cart.status),
      createdAt: this.timestampToDate(cart.createdAt),
      orderedAt: cart.orderedAt ? this.timestampToDate(cart.orderedAt) : null,
      expiredAt: cart.expiredAt ? this.timestampToDate(cart.expiredAt) : null,
      finishedAt: cart.finishedAt
        ? this.timestampToDate(cart.finishedAt)
        : null,
      canceledAt: cart.canceledAt
        ? this.timestampToDate(cart.canceledAt)
        : null,
      paymentMethod: cart.paymentMethod
        ? PaymentMethod.create(cart.paymentMethod as PaymentMethodValue)
        : null,
      paymentChange: cart.paymentChange ? cart.paymentChange / 100 : null,
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
      .leftJoin(carts, eq(carts.conversationId, conversations.id))
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

    await db.$client.end();

    if (!cart) return null;

    return Cart.instance({
      address: Address.create(cart.address),
      attendant: Attendant.create(cart.attendant.id, cart.attendant.name),
      client: Client.instance({
        address: Address.create(client.address!),
        contact: Contact.create(client.contact!.phone, client.contact?.name),
        id: client.id,
      }),
      id: cart.id,
      products: (cart.products as CartProduct.Props[]).map((p) =>
        CartProduct.instance({
          id: p.id,
          description: p.description,
          price: p.price / 100,
          realPrice: p.realPrice / 100,
          quantity: p.quantity,
        })
      ),
      status: Status.create(cart.status),
      createdAt: this.timestampToDate(cart.createdAt),
      orderedAt: cart.orderedAt ? this.timestampToDate(cart.orderedAt) : null,
      expiredAt: cart.expiredAt ? this.timestampToDate(cart.expiredAt) : null,
      finishedAt: cart.finishedAt
        ? this.timestampToDate(cart.finishedAt)
        : null,
      canceledAt: cart.canceledAt
        ? this.timestampToDate(cart.canceledAt)
        : null,
      paymentMethod: cart.paymentMethod
        ? PaymentMethod.create(cart.paymentMethod as PaymentMethodValue)
        : null,
      paymentChange: cart.paymentChange ? cart.paymentChange / 100 : null,
    });
  }

  async removeProductFromCart(
    productId: string,
    cartId: string
  ): Promise<boolean> {
    const db = createDatabaseConnection();

    await db
      .delete(productsOnCart)
      .where(
        and(
          eq(productsOnCart.productId, productId),
          eq(productsOnCart.cartId, cartId)
        )
      );

    await db.$client.end();

    return true;
  }

  static instance() {
    return new CartsRepository();
  }
}
