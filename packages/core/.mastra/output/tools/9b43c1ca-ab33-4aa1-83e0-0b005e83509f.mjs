import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { I as InvalidCreation, C as Client, A as Attendant, a as Address, N as NotFound, b as ConversationsDatabaseRepository, c as ClientsDatabaseRepository, M as Message } from '../conversations-repository.mjs';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { randomUUID } from 'node:crypto';
import { and, eq, sql, or, desc, asc } from 'drizzle-orm';
import { c as createDatabaseConnection, p as productsOnCart, a as addresses, b as carts, u as users, d as contacts, e as clients, f as conversations, s as settings } from '../schemas.mjs';
import { P as ProductsDatabaseRepository } from '../products-repository.mjs';
import axios from 'axios';
import FormData from 'form-data';
import { s as saveMessageOnThread } from '../index2.mjs';
import '/Users/fernandosouza/dev/looma/node_modules/.pnpm/drizzle-orm@0.44.4_@libsql+client@0.15.10_@opentelemetry+api@1.9.0_@types+pg@8.15.5_@upstash+_pohuuurtoropy5iivcwxc6dgde/node_modules/drizzle-orm/postgres-js/index.cjs';
import 'postgres';
import '/Users/fernandosouza/dev/looma/node_modules/.pnpm/drizzle-orm@0.44.4_@libsql+client@0.15.10_@opentelemetry+api@1.9.0_@types+pg@8.15.5_@upstash+_pohuuurtoropy5iivcwxc6dgde/node_modules/drizzle-orm/pg-core/index.cjs';
import '@mastra/memory';
import '@ai-sdk/azure';
import '@mastra/pg';

class SQSMessagingDriver {
  async sendDataToQueue(data) {
    const sqsClient = new SQSClient({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      },
      region: process.env.AWS_DEFAULT_REGION
    });
    const params = {
      QueueUrl: data.queueURL,
      MessageBody: JSON.stringify({
        data: data.data,
        workspaceId: data.workspaceId,
        operation: data.operation
      }),
      MessageGroupId: "defaultGroup",
      MessageDeduplicationId: randomUUID()
    };
    const command = new SendMessageCommand(params);
    const response = await sqsClient.send(command);
    console.log(response);
    return true;
  }
  static instance() {
    return new SQSMessagingDriver();
  }
}

class PaymentMethod {
  constructor(value) {
    this.value = value;
  }
  static values = [
    "CASH",
    "CREDIT_CARD",
    "DEBIT_CARD",
    "CHECK",
    "DIGITAL_PAYMENT"
  ];
  raw() {
    return this.value;
  }
  get formatted() {
    const formatteds = /* @__PURE__ */ new Map([
      ["CASH", "Dinheiro"],
      ["CHECK", "Cheque"],
      ["CREDIT_CARD", "Cart\xE3o de cr\xE9dito"],
      ["DEBIT_CARD", "Cart\xE3o de d\xE9bito"],
      ["DIGITAL_PAYMENT", "Pix"]
    ]);
    return formatteds.get(this.value) ?? "";
  }
  validate() {
    if (!PaymentMethod.values.includes(this.value))
      throw InvalidCreation.throw();
  }
  static create(type) {
    const instance = new PaymentMethod(type);
    instance.validate();
    return instance;
  }
}

class CartProduct {
  id;
  description;
  price;
  realPrice;
  quantity;
  constructor(props) {
    this.id = props.id;
    this.description = props.description;
    this.price = props.price;
    this.realPrice = props.realPrice;
    this.quantity = props.quantity;
  }
  raw() {
    return {
      id: this.id,
      description: this.description,
      price: this.price,
      realPrice: this.realPrice,
      quantity: this.quantity
    };
  }
  get total() {
    return this.price * this.quantity;
  }
  changeQuantity(quantity) {
    this.quantity = quantity;
  }
  static instance(props) {
    return new CartProduct(props);
  }
  static create(props) {
    if (!props.product) {
      throw InvalidCreation.throw();
    }
    return new CartProduct({
      id: props.product.id,
      description: props.product.description,
      price: props.product.promotionPrice ?? props.product.price,
      quantity: props.quantity ? props.quantity > 0 ? props.quantity : 1 : 1,
      realPrice: props.product.price
    });
  }
}

class Status {
  constructor(value) {
    this.value = value;
  }
  static values = [
    "expired",
    "budget",
    "order",
    "cancelled",
    "shipped",
    "finished"
  ];
  raw() {
    return this.value;
  }
  is(value) {
    return this.value === value;
  }
  get formatted() {
    const formatteds = /* @__PURE__ */ new Map([
      ["budget", "Em or\xE7amento"],
      ["cancelled", "Pedido cancelado"],
      ["expired", "Pedido expirado"],
      ["finished", "Venda conclu\xEDda"],
      ["shipped", "Pedido expedido"],
      ["order", "Pedido realizado"]
    ]);
    return formatteds.get(this.value) ?? "";
  }
  validate() {
    if (!Status.values.includes(this.value)) throw InvalidCreation.throw();
  }
  static create(value) {
    const instance = new Status(value);
    instance.validate();
    return instance;
  }
}

class Cart {
  id;
  client;
  attendant;
  _products;
  _address;
  status;
  createdAt;
  orderedAt;
  expiredAt;
  finishedAt;
  canceledAt;
  paymentMethod;
  paymentChange;
  cancelReason;
  constructor(props) {
    this.id = props.id;
    this.client = props.client;
    this.attendant = props.attendant;
    this.products = props.products;
    this.address = props.address;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.orderedAt = props.orderedAt;
    this.expiredAt = props.expiredAt;
    this.finishedAt = props.finishedAt;
    this.canceledAt = props.canceledAt;
    this.paymentMethod = props.paymentMethod;
    this.paymentChange = props.paymentChange;
    this.cancelReason = props.cancelReason;
  }
  set address(address) {
    this._address = address;
  }
  get address() {
    return this._address ?? this.client.address;
  }
  set products(products) {
    if (!this._products) {
      this._products = /* @__PURE__ */ new Map();
    }
    for (const product of products) {
      this._products.set(product.id, product);
    }
  }
  get products() {
    return Array.from(this._products.values());
  }
  get total() {
    return this.products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  }
  upsertProduct(product) {
    if (this.status.is("finished") || this.status.is("expired") || this.status.is("shipped")) {
      throw new Error(
        "O pedido j\xE1 est\xE1 fechado e j\xE1 n\xE3o pode mais adicionar produtos"
      );
    }
    this._products.set(product.id, product);
  }
  setPaymentMethod(method) {
    this.paymentMethod = method;
  }
  order() {
    if (!this.address)
      throw new Error("N\xE3o \xE9 poss\xEDvel finalizar o pedido sem um endere\xE7o.");
    const validateAddress = this.address.validate();
    if (!validateAddress.isValid)
      throw new Error(`
        N\xE3o \xE9 poss\xEDvel finalizar o pedido com o endere\xE7o incompleto.
        Campos faltantes: ${validateAddress.missingFields}
      `);
    if (!this.paymentMethod) throw new Error("Defina um m\xE9todo de pagamento.");
    if (!this.products.length)
      throw new Error(`
        N\xE3o \xE9 poss\xEDvel finalizar o pedido sem nenhum produto adicionado.
      `);
    this.status = Status.create("order");
    this.orderedAt = /* @__PURE__ */ new Date();
  }
  expire() {
    this.status = Status.create("expired");
    this.expiredAt = /* @__PURE__ */ new Date();
  }
  finish() {
    this.status = Status.create("finished");
    this.finishedAt = /* @__PURE__ */ new Date();
  }
  cancel(reason) {
    this.status = Status.create("cancelled");
    this.canceledAt = /* @__PURE__ */ new Date();
    this.cancelReason = reason ?? "N\xE3o informado";
  }
  removeProduct(productId) {
    if (this.status.is("order")) {
      throw new Error(
        "O pedido j\xE1 est\xE1 fechado e j\xE1 n\xE3o pode mais remover produtos"
      );
    }
    return this._products.delete(productId);
  }
  get formatted() {
    return `
*Resumo do pedido*:
      
*Lista de Produtos*:
${this.products.length ? this.products.map(
      (p) => `- ${p.description} - ${p.quantity} x ${p.price.toLocaleString(
        "pt-BR",
        {
          currency: "BRL",
          style: "currency"
        }
      )} = ${p.total.toLocaleString("pt-BR", {
        currency: "BRL",
        style: "currency"
      }) ?? "Sem produtos no pedido"}`
    ).join("\n") : "Nenhum produto"}

*Informa\xE7\xF5es de entrega*:
${this.address?.isEmpty() || !this.address ? "Ainda n\xE3o informado" : this.address?.fullAddress()}
      
*Informa\xE7\xF5es de Pagamento*:
${this.paymentMethod?.formatted || "Ainda n\xE3o informado"} ${this.paymentChange ? `(Troco para ${this.paymentChange.toLocaleString("pt-BR", {
      currency: "BRL",
      style: "currency"
    })})` : ""}

*Valor Total*:
${this.total.toLocaleString("pt-BR", {
      currency: "BRL",
      style: "currency"
    })}
`.trim();
  }
  setPaymentChange(paymentChange) {
    this.paymentChange = paymentChange ?? null;
  }
  static create(props) {
    if (!props.client || !props.attendant) {
      throw new Error(
        `Informa\xE7\xF5es faltando, verifique: client: ${JSON.stringify(props.client ?? "{}", null, 2)} | attendant: ${JSON.stringify(props.attendant ?? "{}", null, 2)}`
      );
    }
    return new Cart({
      id: crypto.randomUUID().toString(),
      client: props.client,
      products: [],
      attendant: props.attendant,
      address: null,
      status: Status.create("budget"),
      createdAt: /* @__PURE__ */ new Date(),
      orderedAt: null,
      expiredAt: null,
      finishedAt: null,
      canceledAt: null,
      paymentMethod: null,
      paymentChange: null,
      cancelReason: null
    });
  }
  static instance(props) {
    return new Cart({
      address: props.address ? Address.create(props.address) : null,
      attendant: Attendant.create(props.attendant.id, props.attendant.name),
      canceledAt: props.canceledAt,
      client: Client.instance(props.client),
      createdAt: props.createdAt,
      expiredAt: props.expiredAt,
      finishedAt: props.finishedAt,
      id: props.id,
      orderedAt: props.orderedAt,
      paymentChange: props.paymentChange,
      paymentMethod: props.paymentMethod ? PaymentMethod.create(props.paymentMethod) : null,
      products: props.products.map((p) => CartProduct.instance(p)),
      status: Status.create(props.status),
      cancelReason: props.cancelReason
    });
  }
  raw() {
    return {
      id: this.id,
      client: this.client.raw(),
      attendant: this.attendant.raw(),
      products: this.products.map((p) => p.raw()),
      address: this.address?.raw?.() ?? null,
      status: this.status.raw(),
      createdAt: this.createdAt,
      orderedAt: this.orderedAt,
      expiredAt: this.expiredAt,
      finishedAt: this.finishedAt,
      canceledAt: this.canceledAt,
      paymentMethod: this.paymentMethod?.raw() ?? null,
      paymentChange: this.paymentChange ?? null,
      cancelReason: this.cancelReason ?? null
    };
  }
}

class CartsDatabaseRepository {
  timestampToDate(timestamp) {
    return new Date(timestamp * 1e3);
  }
  dateToTimestamp(date) {
    return Math.floor(date.getTime() / 1e3);
  }
  async upsert(cart, conversationId) {
    const db = createDatabaseConnection();
    const cartNewValues = {
      id: cart.id,
      attendantId: cart.attendant.id,
      conversationId,
      clientId: cart.client?.id,
      addressId: cart.address?.id ?? null,
      status: cart.status.value,
      createdAt: this.dateToTimestamp(cart.createdAt),
      orderedAt: cart.orderedAt ? this.dateToTimestamp(cart.orderedAt) : null,
      expiredAt: cart.expiredAt ? this.dateToTimestamp(cart.expiredAt) : null,
      finishedAt: cart.finishedAt ? this.dateToTimestamp(cart.finishedAt) : null,
      canceledAt: cart.canceledAt ? this.dateToTimestamp(cart.canceledAt) : null,
      paymentMethod: cart.paymentMethod?.value,
      paymentChange: cart.paymentChange ? cart.paymentChange * 100 : null,
      cancelReason: cart.cancelReason
    };
    const productsOnCartNewValues = await Promise.all(
      cart.products?.map(async (product) => {
        const [productOnCart] = await db.select({
          id: productsOnCart.id
        }).from(productsOnCart).where(
          and(
            eq(productsOnCart.cartId, cart.id),
            eq(productsOnCart.productId, product.id)
          )
        );
        return {
          id: productOnCart?.id ? productOnCart.id : crypto.randomUUID().toString(),
          cartId: cart.id,
          productId: product.id,
          description: product.description,
          price: Math.round(product.price * 100),
          realPrice: Math.round(product.realPrice * 100),
          quantity: product.quantity
        };
      })
    ) ?? [];
    await db.transaction(async (tx) => {
      if (cart.address) {
        await tx.insert(addresses).values(cart.address).onConflictDoUpdate({
          set: cart.address,
          target: addresses.id
        });
      }
      await tx.insert(carts).values(cartNewValues).onConflictDoUpdate({
        target: carts.conversationId,
        set: cartNewValues
      });
      await Promise.all(
        productsOnCartNewValues.map(async (product) => {
          await tx.insert(productsOnCart).values(product).onConflictDoUpdate({
            target: productsOnCart.id,
            set: product
          });
        })
      );
    });
  }
  async retrieveOpenCartByConversationId(conversationId, workspaceId) {
    const db = createDatabaseConnection();
    const [cart] = await db.select({
      id: carts.id,
      attendant: {
        id: users.id,
        name: users.name
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
        note: addresses.note
      },
      status: carts.status,
      createdAt: carts.createdAt,
      orderedAt: carts.orderedAt,
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
              `.as("products")
    }).from(carts).innerJoin(users, eq(carts.attendantId, users.id)).innerJoin(addresses, eq(addresses.id, carts.addressId)).leftJoin(productsOnCart, eq(carts.id, productsOnCart.cartId)).where(
      and(
        eq(carts.conversationId, conversationId),
        or(eq(carts.status, "budget"), eq(carts.status, "order"))
      )
    ).groupBy(
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
    const [client] = await db.select({
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
        note: addresses.note
      },
      contact: {
        phone: contacts.phone,
        name: contacts.name
      }
    }).from(clients).leftJoin(addresses, eq(clients.addressId, addresses.id)).leftJoin(contacts, eq(clients.contactPhone, contacts.phone)).leftJoin(
      conversations,
      eq(clients.contactPhone, conversations.contactPhone)
    ).where(
      and(
        eq(clients.id, cart.clientId),
        eq(clients.workspaceId, workspaceId)
      )
    );
    if (!client) return null;
    return Cart.instance({
      address: cart.address,
      attendant: cart.attendant,
      client: {
        address: client.address,
        contact: client.contact,
        id: client.id
      },
      id: cart.id,
      products: cart.products.map((p) => ({
        id: p.id,
        description: p.description,
        price: p.price / 100,
        realPrice: p.realPrice / 100,
        quantity: p.quantity
      })),
      status: cart.status,
      createdAt: this.timestampToDate(cart.createdAt),
      orderedAt: cart.orderedAt ? this.timestampToDate(cart.orderedAt) : null,
      expiredAt: cart.expiredAt ? this.timestampToDate(cart.expiredAt) : null,
      finishedAt: cart.finishedAt ? this.timestampToDate(cart.finishedAt) : null,
      canceledAt: cart.canceledAt ? this.timestampToDate(cart.canceledAt) : null,
      paymentMethod: cart.paymentMethod,
      paymentChange: cart.paymentChange ? cart.paymentChange / 100 : null,
      cancelReason: cart.cancelReason
    });
  }
  async retrieveLastCartByContactPhone(contactPhone, workspaceId) {
    const db = createDatabaseConnection();
    const [client] = await db.select({
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
        note: addresses.note
      },
      contact: {
        phone: contacts.phone,
        name: contacts.name
      }
    }).from(clients).leftJoin(addresses, eq(clients.addressId, addresses.id)).leftJoin(contacts, eq(clients.contactPhone, contacts.phone)).leftJoin(
      conversations,
      eq(clients.contactPhone, conversations.contactPhone)
    ).where(
      and(
        eq(clients.contactPhone, contactPhone),
        eq(clients.workspaceId, workspaceId)
      )
    );
    if (!client) return null;
    const [cart] = await db.select({
      id: carts.id,
      attendant: {
        id: users.id,
        name: users.name
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
        note: addresses.note
      },
      status: carts.status,
      createdAt: carts.createdAt,
      orderedAt: carts.orderedAt,
      expiredAt: carts.expiredAt,
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
              `.as("products")
    }).from(carts).innerJoin(users, eq(carts.attendantId, users.id)).innerJoin(addresses, eq(addresses.id, carts.addressId)).leftJoin(productsOnCart, eq(carts.id, productsOnCart.cartId)).where(
      and(
        eq(carts.clientId, client.id),
        or(
          eq(carts.status, "finished"),
          eq(carts.status, "order"),
          eq(carts.status, "shipped")
        )
      )
    ).orderBy(desc(carts.createdAt)).groupBy(
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
        contact: client.contact,
        id: client.id
      },
      id: cart.id,
      products: cart.products.map((p) => ({
        id: p.id,
        description: p.description,
        price: p.price / 100,
        realPrice: p.realPrice / 100,
        quantity: p.quantity
      })),
      status: cart.status,
      createdAt: this.timestampToDate(cart.createdAt),
      orderedAt: cart.orderedAt ? this.timestampToDate(cart.orderedAt) : null,
      expiredAt: cart.expiredAt ? this.timestampToDate(cart.expiredAt) : null,
      finishedAt: cart.finishedAt ? this.timestampToDate(cart.finishedAt) : null,
      canceledAt: cart.canceledAt ? this.timestampToDate(cart.canceledAt) : null,
      paymentMethod: cart.paymentMethod,
      paymentChange: cart.paymentChange ? cart.paymentChange / 100 : null,
      cancelReason: cart.cancelReason
    });
  }
  async retrieve(id) {
    const db = createDatabaseConnection();
    const [client] = await db.select({
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
        note: addresses.note
      },
      contact: {
        phone: contacts.phone,
        name: contacts.name
      }
    }).from(clients).leftJoin(addresses, eq(clients.addressId, addresses.id)).leftJoin(contacts, eq(clients.contactPhone, contacts.phone)).leftJoin(
      conversations,
      eq(clients.contactPhone, conversations.contactPhone)
    ).leftJoin(carts, eq(carts.conversationId, conversations.id)).where(eq(carts.id, id));
    if (!client) return null;
    const [cart] = await db.select({
      id: carts.id,
      attendant: {
        id: users.id,
        name: users.name
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
        note: addresses.note
      },
      status: carts.status,
      createdAt: carts.createdAt,
      orderedAt: carts.orderedAt,
      expiredAt: carts.expiredAt,
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
              `.as("products")
    }).from(carts).innerJoin(users, eq(carts.attendantId, users.id)).innerJoin(addresses, eq(addresses.id, carts.addressId)).leftJoin(productsOnCart, eq(carts.id, productsOnCart.cartId)).where(eq(carts.id, id)).groupBy(
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
        contact: client.contact,
        id: client.id
      },
      id: cart.id,
      products: cart.products.map((p) => ({
        id: p.id,
        description: p.description,
        price: p.price / 100,
        realPrice: p.realPrice / 100,
        quantity: p.quantity
      })),
      status: cart.status,
      createdAt: this.timestampToDate(cart.createdAt),
      orderedAt: cart.orderedAt ? this.timestampToDate(cart.orderedAt) : null,
      expiredAt: cart.expiredAt ? this.timestampToDate(cart.expiredAt) : null,
      finishedAt: cart.finishedAt ? this.timestampToDate(cart.finishedAt) : null,
      canceledAt: cart.canceledAt ? this.timestampToDate(cart.canceledAt) : null,
      paymentMethod: cart.paymentMethod,
      paymentChange: cart.paymentChange ? cart.paymentChange / 100 : null,
      cancelReason: cart.cancelReason ?? null
    });
  }
  async list(workspaceId) {
    const db = createDatabaseConnection();
    const allCarts = await db.select({
      id: carts.id,
      attendant: {
        id: users.id,
        name: users.name
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
        note: addresses.note
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
              `.as("products")
    }).from(carts).innerJoin(conversations, eq(conversations.id, carts.conversationId)).innerJoin(users, eq(carts.attendantId, users.id)).innerJoin(addresses, eq(addresses.id, carts.addressId)).leftJoin(productsOnCart, eq(carts.id, productsOnCart.cartId)).where(eq(conversations.workspaceId, workspaceId)).orderBy(asc(carts.createdAt)).groupBy(
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
        const [client] = await db.select({
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
            note: addresses.note
          },
          contact: {
            phone: contacts.phone,
            name: contacts.name
          }
        }).from(clients).leftJoin(addresses, eq(clients.addressId, addresses.id)).leftJoin(contacts, eq(clients.contactPhone, contacts.phone)).leftJoin(
          conversations,
          eq(clients.contactPhone, conversations.contactPhone)
        ).leftJoin(carts, eq(carts.conversationId, conversations.id)).where(eq(carts.id, cart.id));
        if (!client) return null;
        return {
          address: cart.address,
          attendant: cart.attendant,
          client: {
            address: client.address,
            contact: client.contact,
            id: client.id
          },
          id: cart.id,
          products: cart.products.map((p) => ({
            id: p.id,
            description: p.description,
            price: p.price / 100,
            realPrice: p.realPrice / 100,
            quantity: p.quantity
          })),
          status: cart.status,
          createdAt: this.timestampToDate(cart.createdAt),
          orderedAt: cart.orderedAt ? this.timestampToDate(cart.orderedAt) : null,
          expiredAt: cart.expiredAt ? this.timestampToDate(cart.expiredAt) : null,
          finishedAt: cart.finishedAt ? this.timestampToDate(cart.finishedAt) : null,
          canceledAt: cart.canceledAt ? this.timestampToDate(cart.canceledAt) : null,
          paymentMethod: cart.paymentMethod,
          paymentChange: cart.paymentChange ? cart.paymentChange / 100 : null
        };
      })
    );
    return result.filter((c) => c !== null);
  }
  static instance() {
    return new CartsDatabaseRepository();
  }
}

class Setting {
  constructor(wabaId, phoneId, attendantName, businessName, locationAvailable, paymentMethods, vectorNamespace, knowledgeBase, aiEnabled, queueURL, openingHours) {
    this.wabaId = wabaId;
    this.phoneId = phoneId;
    this.attendantName = attendantName;
    this.businessName = businessName;
    this.locationAvailable = locationAvailable;
    this.paymentMethods = paymentMethods;
    this.vectorNamespace = vectorNamespace;
    this.knowledgeBase = knowledgeBase;
    this.aiEnabled = aiEnabled;
    this.queueURL = queueURL;
    this.openingHours = openingHours;
  }
  raw() {
    return {
      wabaId: this.wabaId,
      phoneId: this.phoneId,
      attendantName: this.attendantName,
      businessName: this.businessName,
      locationAvailable: this.locationAvailable,
      paymentMethods: this.paymentMethods,
      vectorNamespace: this.vectorNamespace,
      knowledgeBase: this.knowledgeBase,
      aiEnabled: this.aiEnabled,
      queueURL: this.queueURL,
      openingHours: this.openingHours
    };
  }
  static create(props) {
    return new Setting(
      props?.wabaId ?? "",
      props?.phoneId ?? "",
      props?.attendantName ?? "Looma AI",
      props?.businessName ?? "",
      props?.locationAvailable ?? "",
      props?.paymentMethods ?? "",
      props?.vectorNamespace ?? "",
      props?.knowledgeBase ?? "",
      props?.aiEnabled ?? true,
      props?.queueURL ?? "",
      props?.openingHours ?? ""
    );
  }
}

class SettingsDatabaseRepository {
  async retrieveSettingsByWorkspaceId(workspaceId) {
    if (!workspaceId) return null;
    const db = createDatabaseConnection();
    const [setting] = await db.select({
      phoneId: settings.phoneId,
      attendantName: settings.attendantName,
      businessName: settings.businessName,
      wabaId: settings.wabaId,
      locationAvailable: settings.locationAvailable,
      paymentMethods: settings.paymentMethods,
      vectorNamespace: settings.vectorNamespace,
      knowledgeBase: settings.knowledgeBase,
      aiEnabled: settings.aiEnabled,
      queueURL: settings.queueURL,
      openingHours: settings.openingHours
    }).from(settings).where(eq(settings.workspaceId, workspaceId));
    if (!setting) return null;
    return Setting.create(setting);
  }
  async upsert(workspaceId, input) {
    const db = createDatabaseConnection();
    const response = await db.select({
      id: settings.id,
      workspaceId: settings.workspaceId
    }).from(settings).where(eq(settings.workspaceId, workspaceId));
    const setting = response?.[0];
    await db.insert(settings).values({
      id: setting?.id || crypto.randomUUID().toString(),
      phoneId: input.phoneId,
      wabaId: input.wabaId,
      attendantName: input.attendantName,
      businessName: input.businessName,
      locationAvailable: input.locationAvailable,
      paymentMethods: input.paymentMethods,
      vectorNamespace: input.vectorNamespace,
      knowledgeBase: input.knowledgeBase,
      aiEnabled: input.aiEnabled,
      workspaceId: setting?.workspaceId || workspaceId,
      queueURL: input.queueURL,
      openingHours: input.openingHours
    }).onConflictDoUpdate({
      set: {
        wabaId: input.wabaId,
        phoneId: input.phoneId,
        attendantName: input.attendantName,
        businessName: input.businessName,
        locationAvailable: input.locationAvailable,
        paymentMethods: input.paymentMethods,
        knowledgeBase: input.knowledgeBase,
        aiEnabled: input.aiEnabled,
        vectorNamespace: input.vectorNamespace,
        queueURL: input.queueURL,
        openingHours: input.openingHours
      },
      target: settings.id
    });
  }
  async retrieveSettingByWabaIdAndPhoneId(wabaId, phoneId) {
    const db = createDatabaseConnection();
    const [setting] = await db.select({
      attendantName: settings.attendantName,
      phoneId: settings.phoneId,
      businessName: settings.businessName,
      wabaId: settings.wabaId,
      locationAvailable: settings.locationAvailable,
      paymentMethods: settings.paymentMethods,
      vectorNamespace: settings.vectorNamespace,
      knowledgeBase: settings.knowledgeBase,
      aiEnabled: settings.aiEnabled,
      workspaceId: settings.workspaceId,
      queueURL: settings.queueURL,
      openingHours: settings.openingHours
    }).from(settings).where(and(eq(settings.wabaId, wabaId), eq(settings.phoneId, phoneId)));
    if (!setting) return null;
    return {
      setting: Setting.create(setting),
      workspaceId: setting.workspaceId
    };
  }
  static instance() {
    return new SettingsDatabaseRepository();
  }
}

class CancelCart {
  constructor(conversationsRepository, cartsRepository, messagingDriver, settingsRepository) {
    this.conversationsRepository = conversationsRepository;
    this.cartsRepository = cartsRepository;
    this.messagingDriver = messagingDriver;
    this.settingsRepository = settingsRepository;
  }
  async execute(input) {
    const conversation = await this.conversationsRepository.retrieve(
      input.conversationId
    );
    if (!conversation) throw NotFound.throw("Conversation");
    const cart = await this.cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      input.workspaceId
    );
    if (!cart) throw NotFound.throw("Cart");
    cart.cancel(input.reason);
    const settings = await this.settingsRepository.retrieveSettingsByWorkspaceId(
      input.workspaceId
    );
    if (settings?.queueURL) {
      await this.messagingDriver.sendDataToQueue({
        queueURL: settings.queueURL,
        data: cart.id,
        workspaceId: input.workspaceId,
        operation: "cancelCart"
      });
    }
    conversation.close();
    await this.cartsRepository.upsert(cart, conversation.id);
    await this.conversationsRepository.upsert(conversation, input.workspaceId);
    return cart;
  }
  static instance() {
    return new CancelCart(
      ConversationsDatabaseRepository.instance(),
      CartsDatabaseRepository.instance(),
      SQSMessagingDriver.instance(),
      SettingsDatabaseRepository.instance()
    );
  }
}

class CloseCart {
  constructor(conversationsRepository, cartsRepository, messagingDriver, settingsRepository) {
    this.conversationsRepository = conversationsRepository;
    this.cartsRepository = cartsRepository;
    this.messagingDriver = messagingDriver;
    this.settingsRepository = settingsRepository;
  }
  async execute(input) {
    const cart = await this.cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      input.workspaceId
    );
    if (!cart) throw NotFound.throw("Cart");
    const conversation = await this.conversationsRepository.retrieve(
      input.conversationId
    );
    if (!conversation) throw NotFound.throw("Conversation");
    cart.order();
    const settings = await this.settingsRepository.retrieveSettingsByWorkspaceId(
      input.workspaceId
    );
    if (settings?.queueURL) {
      await this.messagingDriver.sendDataToQueue({
        queueURL: settings.queueURL,
        data: {
          cart: cart.raw(),
          total: cart.total
        },
        workspaceId: input.workspaceId,
        operation: "orderCart"
      });
    }
    await this.cartsRepository.upsert(cart, conversation.id);
    return cart;
  }
  static instance() {
    return new CloseCart(
      ConversationsDatabaseRepository.instance(),
      CartsDatabaseRepository.instance(),
      SQSMessagingDriver.instance(),
      SettingsDatabaseRepository.instance()
    );
  }
}

class RemoveProductFromCart {
  constructor(conversationsRepository, cartsRepository, messagingDriver, settingsRepository) {
    this.conversationsRepository = conversationsRepository;
    this.cartsRepository = cartsRepository;
    this.messagingDriver = messagingDriver;
    this.settingsRepository = settingsRepository;
  }
  async execute(input) {
    const conversation = await this.conversationsRepository.retrieve(
      input.conversationId
    );
    if (!conversation) throw NotFound.throw("Conversation");
    const cart = await this.cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      input.workspaceId
    );
    if (!cart) throw NotFound.throw("Cart");
    cart.removeProduct(input.productId);
    await this.cartsRepository.upsert(cart, conversation.id);
    if (cart.status.is("order")) {
      const settings = await this.settingsRepository.retrieveSettingsByWorkspaceId(
        input.workspaceId
      );
      if (settings?.queueURL) {
        await this.messagingDriver.sendDataToQueue({
          queueURL: settings.queueURL,
          data: {
            cart: cart.raw(),
            productId: input.productId,
            total: cart.total
          },
          workspaceId: input.workspaceId,
          operation: "removeProduct"
        });
      }
    }
    return cart;
  }
  static instance() {
    return new RemoveProductFromCart(
      ConversationsDatabaseRepository.instance(),
      CartsDatabaseRepository.instance(),
      SQSMessagingDriver.instance(),
      SettingsDatabaseRepository.instance()
    );
  }
}

class SetCartAddress {
  constructor(conversationsRepository, cartsRepository, clientsRepository) {
    this.conversationsRepository = conversationsRepository;
    this.cartsRepository = cartsRepository;
    this.clientsRepository = clientsRepository;
  }
  async execute(input) {
    const conversation = await this.conversationsRepository.retrieve(
      input.conversationId
    );
    if (!conversation) throw NotFound.throw("Conversation");
    let client = await this.clientsRepository.retrieveByPhone(
      conversation.contact.phone,
      input.workspaceId
    );
    if (!client) {
      client = Client.create(conversation.contact);
      await this.clientsRepository.upsert(client, input.workspaceId);
    }
    let cart = await this.cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      input.workspaceId
    );
    if (!cart) {
      cart = Cart.create({
        attendant: conversation.attendant,
        client
      });
    }
    const newAddress = Address.create(input.address);
    if (!client.address) {
      client.setAddress(newAddress);
      await this.clientsRepository.upsert(client, input.workspaceId);
    }
    cart.address = newAddress;
    await this.cartsRepository.upsert(cart, conversation.id);
    return cart;
  }
  static instance() {
    return new SetCartAddress(
      ConversationsDatabaseRepository.instance(),
      CartsDatabaseRepository.instance(),
      ClientsDatabaseRepository.instance()
    );
  }
}

class SetCartPayment {
  constructor(conversationsRepository, cartsRepository) {
    this.conversationsRepository = conversationsRepository;
    this.cartsRepository = cartsRepository;
  }
  async execute(input) {
    const conversation = await this.conversationsRepository.retrieve(
      input.conversationId
    );
    if (!conversation) throw NotFound.throw("Conversation");
    const cart = await this.cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      input.workspaceId
    );
    if (!cart) throw NotFound.throw("Cart");
    const paymentMethod = PaymentMethod.create(input.paymentMethod);
    cart.setPaymentMethod(paymentMethod);
    cart.setPaymentChange(input.paymentChange);
    await this.cartsRepository.upsert(cart, conversation.id);
    return cart;
  }
  static instance() {
    return new SetCartPayment(
      ConversationsDatabaseRepository.instance(),
      CartsDatabaseRepository.instance()
    );
  }
}

class UpsertProductOnCart {
  constructor(conversationsRepository, clientsRepository, cartsRepository, productsRepository, messagingDriver, settingsRepository) {
    this.conversationsRepository = conversationsRepository;
    this.clientsRepository = clientsRepository;
    this.cartsRepository = cartsRepository;
    this.productsRepository = productsRepository;
    this.messagingDriver = messagingDriver;
    this.settingsRepository = settingsRepository;
  }
  async execute(input) {
    const conversation = await this.conversationsRepository.retrieve(
      input.conversationId
    );
    if (!conversation) throw NotFound.throw("Conversation");
    let client = await this.clientsRepository.retrieveByPhone(
      conversation.contact.phone,
      input.workspaceId
    );
    if (!client) {
      client = Client.create(conversation.contact);
      await this.clientsRepository.upsert(client, input.workspaceId);
    }
    let cart = await this.cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      input.workspaceId
    );
    if (!cart) {
      cart = Cart.create({
        attendant: conversation.attendant,
        client
      });
    }
    const product = await this.productsRepository.retrieve(input.productId);
    if (!product) throw NotFound.throw("Product");
    const cartProduct = CartProduct.create({
      product,
      quantity: input.quantity
    });
    cart.upsertProduct(cartProduct);
    await this.cartsRepository.upsert(cart, conversation.id);
    if (cart.status.is("order")) {
      const settings = await this.settingsRepository.retrieveSettingsByWorkspaceId(
        input.workspaceId
      );
      if (settings?.queueURL) {
        await this.messagingDriver.sendDataToQueue({
          queueURL: settings?.queueURL,
          data: {
            cart: cart.raw(),
            total: cart.total
          },
          workspaceId: input.workspaceId,
          operation: "upsertProduct"
        });
      }
    }
    return cart;
  }
  static instance() {
    return new UpsertProductOnCart(
      ConversationsDatabaseRepository.instance(),
      ClientsDatabaseRepository.instance(),
      CartsDatabaseRepository.instance(),
      ProductsDatabaseRepository.instance(),
      SQSMessagingDriver.instance(),
      SettingsDatabaseRepository.instance()
    );
  }
}

class MetaMessageDriver {
  client = axios.create({
    baseURL: "https://graph.facebook.com/v23.0",
    headers: {
      Authorization: `Bearer ${process.env.META_TOKEN}`
    }
  });
  async listPhonesId(wabaId) {
    try {
      const response = await this.client.get(`/${wabaId}/phone_numbers`);
      return response.data.data.map((p) => ({
        id: p.id,
        phone: `${p.display_phone_number} - ${p.verified_name}`
      }));
    } catch {
      return [];
    }
  }
  async downloadMedia(channel, mediaId) {
    try {
      const mediaRetrieved = await this.client.get(
        `/${mediaId}?phone_number_id=${channel}`
      );
      const result = await axios.get(mediaRetrieved.data.url, {
        responseType: "arraybuffer",
        headers: { Authorization: `Bearer ${process.env.META_TOKEN}` }
      });
      return { success: true, content: result.data };
    } catch (err) {
      return { success: false, content: err };
    }
  }
  async sendTyping(data) {
    await this.client.post(`/${data.channel}/messages`, {
      messaging_product: "whatsapp",
      status: "read",
      message_id: data.lastMessageId,
      typing_indicator: {
        type: "text"
      }
    }).catch((err) => console.log(JSON.stringify(err, null, 2)));
  }
  async viewMessage(data) {
    await this.client.post(`/${data.channel}/messages`, {
      messaging_product: "whatsapp",
      status: "read",
      message_id: data.lastMessageId
    }).catch((err) => console.log(JSON.stringify(err, null, 2)));
  }
  async sendMessageText(data) {
    if (!data.content) return null;
    const response = await this.client.post(`/${data.channel}/messages`, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: data.to,
      type: "text",
      text: {
        preview_url: false,
        body: data.content
      }
    });
    return response?.data?.messages?.[0]?.id ?? "";
  }
  async sendMessageAudio(data) {
    const arrayBuffer = await data.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const form = new FormData();
    form.append("file", buffer, {
      filename: data.file.name,
      contentType: data.file?.type || "audio/ogg"
    });
    form.append("messaging_product", "whatsapp");
    const uploadResponse = await this.client.post(
      `/${data.channel}/media`,
      form,
      {
        headers: form.getHeaders()
      }
    );
    const mediaId = uploadResponse.data.id;
    const sendResponse = await this.client.post(`/${data.channel}/messages`, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: data.to,
      type: "audio",
      audio: { id: mediaId }
    });
    return {
      id: sendResponse?.data?.messages?.[0]?.id ?? "",
      mediaId
    };
  }
  static instance() {
    return new MetaMessageDriver();
  }
}

class ShowCart {
  constructor(conversationsRepository, cartsRepository, messageDriver) {
    this.conversationsRepository = conversationsRepository;
    this.cartsRepository = cartsRepository;
    this.messageDriver = messageDriver;
  }
  async execute(input) {
    const conversation = await this.conversationsRepository.retrieve(
      input.conversationId
    );
    if (!conversation) throw NotFound.throw("Conversation");
    let cart = await this.cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      input.workspaceId
    );
    if (!cart) throw NotFound.throw("Cart");
    const messageId = await this.messageDriver.sendMessageText({
      channel: conversation.channel,
      content: cart.formatted,
      to: conversation.contact.phone
    });
    if (!messageId) throw NotFound.throw("Message ID");
    const message = Message.create({
      content: cart.formatted,
      createdAt: /* @__PURE__ */ new Date(),
      id: messageId,
      sender: conversation.attendant,
      type: "text"
    });
    conversation.addMessage(message);
    await this.conversationsRepository.upsert(conversation, input.workspaceId);
    return {
      cart,
      conversation
    };
  }
  static instance() {
    return new ShowCart(
      ConversationsDatabaseRepository.instance(),
      CartsDatabaseRepository.instance(),
      MetaMessageDriver.instance()
    );
  }
}

const getLastCartTool = createTool({
  id: "get-last-cart-tool",
  description: "Use para buscar o ultimo pedido realizado",
  execute: async ({ runtimeContext, resourceId, threadId }) => {
    const lastCart = runtimeContext.get("lastCart");
    const response = lastCart ? lastCart.formatted : "N\xE3o h\xE1 pedido realizado";
    await saveMessageOnThread({
      content: response,
      resourceId,
      threadId
    });
    return response;
  }
});
const getCurrentCartTool = createTool({
  id: "get-current-cart-tool",
  description: "Use para buscar o pedido atual",
  execute: async ({ runtimeContext, resourceId, threadId }) => {
    const currentCart = runtimeContext.get("currentCart");
    const response = currentCart ? currentCart.formatted : "N\xE3o h\xE1 pedido aberto";
    await saveMessageOnThread({
      content: response,
      resourceId,
      threadId
    });
    return currentCart ? currentCart.formatted : "N\xE3o h\xE1 pedido aberto";
  }
});
const closeCartTool = createTool({
  id: "close-cart-tool",
  description: "Use para finalizar o pedido",
  execute: async ({ runtimeContext }) => {
    const closeCart = CloseCart.instance();
    const cart = await closeCart.execute({
      conversationId: runtimeContext.get("conversationId"),
      workspaceId: runtimeContext.get("workspaceId")
    });
    return cart.formatted;
  }
});
const cancelCartTool = createTool({
  id: "cancel-cart-tool",
  description: "Use para cancelar um pedido",
  inputSchema: z.object({
    reason: z.string().describe("Raz\xE3o do cliente pelo cancelamento").optional()
  }),
  execute: async ({ context, runtimeContext }) => {
    const cancelCart = CancelCart.instance();
    const cart = await cancelCart.execute({
      conversationId: runtimeContext.get("conversationId"),
      workspaceId: runtimeContext.get("workspaceId"),
      reason: context.reason
    });
    return cart.formatted;
  }
});
const showCartTool = createTool({
  id: "show-cart-tool",
  description: "Use para enviar o resumo do pedido para o cliente",
  execute: async ({ runtimeContext, resourceId, threadId }) => {
    const showCart = ShowCart.instance();
    const { cart } = await showCart.execute({
      conversationId: runtimeContext.get("conversationId"),
      workspaceId: runtimeContext.get("workspaceId")
    });
    await saveMessageOnThread({
      content: cart.formatted,
      resourceId,
      threadId
    });
    return "Resumo do pedido enviado ao cliente";
  }
});
const addProductOnCartTool = createTool({
  id: "add-product-on-cart-tool",
  description: "Use para alterar a quantidade de um determinado produto do pedido",
  inputSchema: z.object({
    productId: z.string(),
    quantity: z.number()
  }),
  execute: async ({ runtimeContext, context }) => {
    const upsertProductOnCart = UpsertProductOnCart.instance();
    const cart = await upsertProductOnCart.execute({
      conversationId: runtimeContext.get("conversationId"),
      productId: context.productId,
      quantity: context.quantity,
      workspaceId: runtimeContext.get("workspaceId")
    });
    return cart.formatted;
  }
});
const removeProductFromCartTool = createTool({
  id: "remove-product-from-cart-tool",
  description: "Use para remover um determinado produto do pedido",
  inputSchema: z.object({
    productId: z.string()
  }),
  execute: async ({ runtimeContext, context }) => {
    const removeProductFromCart = RemoveProductFromCart.instance();
    const cart = await removeProductFromCart.execute({
      conversationId: runtimeContext.get("conversationId"),
      productId: context.productId,
      workspaceId: runtimeContext.get("workspaceId")
    });
    return cart.formatted;
  }
});
const setAddressCartTool = createTool({
  id: "set-address-cart-tool",
  description: "Use para alterar o endere\xE7o de entrega do pedido",
  inputSchema: z.object({
    street: z.string().optional().default(""),
    number: z.string().optional().default(""),
    neighborhood: z.string().optional().default(""),
    city: z.string().optional().default(""),
    state: z.string().optional().default(""),
    zipCode: z.string().optional().default(""),
    country: z.string().optional().default(""),
    note: z.string().optional().default("").nullable().describe("Complemento do endere\xE7o")
  }),
  execute: async ({ runtimeContext, context }) => {
    const setCartAddress = SetCartAddress.instance();
    const cart = await setCartAddress.execute({
      address: context,
      conversationId: runtimeContext.get("conversationId"),
      workspaceId: runtimeContext.get("workspaceId")
    });
    const response = cart.address?.validate();
    if (!response?.isValid) {
      return `Endere\xE7o salvo por\xE9m tem campos faltantes: ${response?.missingFields.join(", ")}`;
    }
    return cart.formatted;
  }
});
const setPaymentMethodCartTool = createTool({
  id: "set-payment-method-cart-tool",
  description: "Use para alterar o m\xE9todo de pagamento do pedido",
  inputSchema: z.object({
    paymentMethod: z.enum(PaymentMethod.values),
    paymentChange: z.number().optional().describe("valor de troco")
  }),
  execute: async ({ runtimeContext, context }) => {
    const setCartPayment = SetCartPayment.instance();
    const cart = await setCartPayment.execute({
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId"),
      paymentMethod: context.paymentMethod,
      paymentChange: context.paymentChange
    });
    return cart.formatted;
  }
});

export { addProductOnCartTool, cancelCartTool, closeCartTool, getCurrentCartTool, getLastCartTool, removeProductFromCartTool, setAddressCartTool, setPaymentMethodCartTool, showCartTool };
