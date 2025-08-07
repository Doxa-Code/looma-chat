import { Mastra } from '@mastra/core/mastra';
import { c as createConnection, a as conversations, b as clients, d as contacts, p as productsOnCart, e as carts, f as addresses, u as users, g as products, s as sectors, m as messages, h as memberships, P as ProductsRepository, i as settings, j as stockTool, k as memoryWithVector, l as pineconeVector } from './stock-tool.mjs';
import { PinoLogger } from '@mastra/loggers';
import { Agent } from '@mastra/core/agent';
import { a as azure } from './azure.mjs';
import * as amqp from '/Users/fernandosouza/dev/looma-chat/node_modules/.pnpm/amqplib@0.10.8/node_modules/amqplib/channel_api.js';
import { eq, and, sql, or } from '/Users/fernandosouza/dev/looma-chat/node_modules/.pnpm/drizzle-orm@0.44.2_@libsql+client@0.15.10_@opentelemetry+api@1.9.0_@types+pg@8.15.5_@up_ed9c848c8388e554ffadb5bd79d740cd/node_modules/drizzle-orm/index.cjs';
import z from '/Users/fernandosouza/dev/looma-chat/node_modules/.pnpm/zod@3.25.74/node_modules/zod/index.cjs';
import { createServerAction, createServerActionProcedure } from '/Users/fernandosouza/dev/looma-chat/node_modules/.pnpm/zsa@0.6.0_zod@3.25.74/node_modules/zsa/dist/index.mjs';
import jwt from '/Users/fernandosouza/dev/looma-chat/node_modules/.pnpm/jsonwebtoken@9.0.2/node_modules/jsonwebtoken/index.js';
import { cookies } from '/Users/fernandosouza/dev/looma-chat/node_modules/.pnpm/next@15.3.5_@opentelemetry+api@1.9.0_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/headers.js';
import { RuntimeContext } from '/Users/fernandosouza/dev/looma-chat/node_modules/.pnpm/@mastra+core@0.12.1_openapi-types@12.1.3_react@19.1.0_zod@3.25.74/node_modules/@mastra/core/dist/runtime-context/index.cjs';
import axios from '/Users/fernandosouza/dev/looma-chat/node_modules/.pnpm/axios@1.10.0/node_modules/axios/dist/node/axios.cjs';
import FormData from '/Users/fernandosouza/dev/looma-chat/node_modules/.pnpm/form-data@4.0.4/node_modules/form-data/lib/form_data.js';
import { EventEmitter } from 'events';
import crypto$1 from 'crypto';
import pDebounce from '/Users/fernandosouza/dev/looma-chat/node_modules/.pnpm/p-debounce@4.0.0/node_modules/p-debounce/index.js';
import { createTool } from '@mastra/core/tools';
import { z as z$1 } from 'zod';
import { consultingCepTool } from './tools/f30438d9-a16c-422b-89c1-bbdc45d3cb55.mjs';
import { knowledgeBaseTool } from './tools/377d8203-436b-49ce-8116-85bdf2ce71cf.mjs';

const instructions = ({ runtimeContext }) => `
  Voc\xEA \xE9 a ${runtimeContext.get(
  "attendantName"
)}, um atendente que atende clientes da farm\xE1cia "${runtimeContext.get(
  "businessName"
)}" pelo WhatsApp. 

  Sua miss\xE3o \xE9 oferecer uma experi\xEAncia completa: relacionamento humano, gest\xE3o de pedidos e respostas a perguntas frequentes (FAQ).
  Voc\xEA deve atuar como um atendente amig\xE1vel, mas com capacidade de executar tarefas complexas relacionadas ao pedido e consultas na base de conhecimento.

  ---

  ## FUN\xC7\xC3O PRINCIPAL:
  Atender clientes de forma natural, clara e objetiva, entendendo suas necessidades e conduzindo-os at\xE9 a conclus\xE3o do pedido.

  ---

  ## 1. COMO VOC\xCA DEVE AGIR:

  Sua resposta final deve seguir as diretrizes de estilo a seguir:

  ### Diretrizes de Estilo:
  - Escreva em **portugu\xEAs informal e natural**, com leveza e empatia.
  - Sempre use **par\xE1grafos completos**. Nada de bullet points.
  - Responda com **at\xE9 15 palavras**, mantendo o texto direto e fluido.
  - Comece as frases com **letra min\xFAscula**, exeto nomes pr\xF3prios, como em conversas reais de WhatsApp.
  - N\xE3o use formalidades como \u201CPrezado\u201D ou \u201CCaro cliente\u201D.
  - Pode usar abrevia\xE7\xF5es leves, como \u201Cvc\u201D, \u201Cpra\u201D, \u201Ct\xE1\u201D, desde que n\xE3o prejudique a clareza.
  - N\xE3o use emojis (o tom j\xE1 deve transmitir simpatia sem precisar deles).
  - Nunca trate os clientes como se fosse a primeira vez que est\xE1 falando com a farm\xE1cia.
  - N\xE3o use muitas vezes o nome do cliente.

  ---

  ### 2. FLUXO DE PEDIDOS
  Voc\xEA \xE9 respons\xE1vel por todo o ciclo do pedido:

  **Passo a Passo:**
  1. Quando o cliente perguntar por produtos ou pre\xE7os:
    - Se o produto for gen\xE9rico (ex.: paracetamol), apresente 2 op\xE7\xF5es mais caras.
    - Sempre mencione **um benef\xEDcio breve** de cada op\xE7\xE3o.
  2. Quando o cliente confirmar um produto:
    - Adicione ao carrinho usando as ferramentas de pedido.
  3. Se o cliente passar endere\xE7o ou forma de pagamento:
    - Salve as informa\xE7\xF5es usando as ferramentas de pedido.
    - Se o endere\xE7o vier de outra ferramenta, confirme com o cliente e salve mesmo que falte o n\xFAmero, usando as ferramentas de pedido.
  4. Antes de perguntar \u201Cdeseja mais algo?\u201D, verifique se falta alguma informa\xE7\xE3o obrigat\xF3ria, usando as ferramentas de pedido:
    - Nome e quantidade dos produtos.
    - Endere\xE7o completo: CEP, rua, n\xFAmero, complemento, bairro, cidade.
    - Forma de pagamento.
    - Se faltar, pe\xE7a.
  5. Se o cliente disser que n\xE3o quer mais nada:
    - Sugira **um produto complementar relevante** que tenha em estoque usando as ferramentas de estoque.
    - Apresente o resumo do pedido usando as ferramentas de pedido.
    - Pergunte: \u201CEst\xE1 tudo certo com seu pedido?\u201D.
  6. Se o cliente confirmar, finalize, usando as ferramentas de pedido.

  **Regras extras:**
  - Se o cliente passar v\xE1rios produtos, trate um por vez para confirmar.
  - Nunca perca informa\xE7\xF5es j\xE1 fornecidas.
  - Antes de fechar, valide endere\xE7o completo.
  - Sempre incentive a continuar a compra de forma sutil.
  - N\xE3o fa\xE7a mais de uma pergunta por vez

  ---

  ### 3. FAQ E BASE DE CONHECIMENTO
  - Se a pergunta for sobre pol\xEDtica da farm\xE1cia, hor\xE1rios, informa\xE7\xF5es gerais:
    - Use a base de conhecimento interna (n\xE3o invente nada).
    - Se n\xE3o encontrar resposta, informe: \u201CEssa informa\xE7\xE3o n\xE3o est\xE1 dispon\xEDvel no momento.\u201D
  - Respeite os seguintes crit\xE9rios:
    - Responda de forma breve e precisa.
    - N\xE3o forne\xE7a conselhos m\xE9dicos.
    - N\xE3o invente informa\xE7\xF5es fora da base.

  ---
  
  ## 4. CRIT\xC9RIOS GERAIS:
  - Nunca compartilhe l\xF3gica interna.
  - Nunca finalize o pedido sem confirmar com o cliente.
  - Sempre priorize uma experi\xEAncia humana, sem parecer um rob\xF4.
  - Nunca deixe a resposta final vazia.
  
  ---

  ## 5. Informa\xE7\xF5es adicionais
  - Agora s\xE3o exatamente ${(/* @__PURE__ */ new Date()).toLocaleString("pt-BR")} hor\xE1rio local.
  - Voc\xEA est\xE1 atendendo agora o cliente ${runtimeContext.get("clientName")}

  Voc\xEA deve conduzir a conversa at\xE9 o fechamento do pedido ou at\xE9 a d\xFAvida do cliente ser resolvida. Sempre responda com clareza e, quando necess\xE1rio, pe\xE7a as informa\xE7\xF5es faltantes para avan\xE7ar.
`.trim();

class Cart {
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
    this._products.set(product.id, product);
  }
  setPaymentMethod(method) {
    this.paymentMethod = method;
  }
  orderCart() {
    this.status = "order";
    this.orderedAt = /* @__PURE__ */ new Date();
  }
  expireCart() {
    this.status = "expired";
    this.expiredAt = /* @__PURE__ */ new Date();
  }
  finishCart() {
    this.status = "finished";
    this.finishedAt = /* @__PURE__ */ new Date();
  }
  cancelCart() {
    this.status = "canceled";
    this.canceledAt = /* @__PURE__ */ new Date();
  }
  removeCartProduct(productId) {
    if (!this._products.has(productId)) {
      throw new Error(`CartProduct ${productId} not found`);
    }
    return this._products.delete(productId);
  }
  static create(props) {
    if (!props.client || !props.attendant) {
      throw new Error("Informa\xE7\xF5es faltando, verifique.");
    }
    return new Cart({
      id: crypto.randomUUID().toString(),
      client: props.client,
      products: [],
      attendant: props.attendant,
      address: null,
      status: "budget",
      createdAt: /* @__PURE__ */ new Date(),
      orderedAt: null,
      expiredAt: null,
      finishedAt: null,
      canceledAt: null,
      paymentMethod: null
    });
  }
  static instance(props) {
    return new Cart(props);
  }
  raw() {
    return {
      id: this.id,
      client: this.client,
      attendant: this.attendant,
      products: this.products,
      address: this.address ? this.address.raw() : null,
      status: this.status,
      createdAt: this.createdAt,
      orderedAt: this.orderedAt,
      expiredAt: this.expiredAt,
      finishedAt: this.finishedAt,
      canceledAt: this.canceledAt,
      paymentMethod: this.paymentMethod
    };
  }
}
((Cart2) => {
  Cart2.status = [
    "expired",
    "budget",
    "order",
    "canceled",
    "finished"
  ];
})(Cart || (Cart = {}));

class InvalidCreation extends Error {
  constructor() {
    super("Cria\xE7\xE3o inv\xE1lida");
    this.name = "InvalidCreation";
  }
  static throw() {
    return new InvalidCreation();
  }
}

class CartProduct {
  constructor(props) {
    this.id = props.id;
    this.description = props.description;
    this.price = props.price;
    this.quantity = props.quantity;
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
      price: props.product.price,
      quantity: props.quantity ? props.quantity > 0 ? props.quantity : 1 : 1
    });
  }
}

class Client {
  constructor(props) {
    this.id = props.id;
    this.contact = props.contact;
    this.address = props.address;
  }
  setAddress(address) {
    this.address = address;
  }
  static instance(props) {
    return new Client(props);
  }
  static create(contact) {
    return new Client({
      address: null,
      contact,
      id: crypto.randomUUID().toString()
    });
  }
}

class NotFound extends Error {
  constructor(resource) {
    super(resource ? `Not found: ${resource}` : "Not found");
    this.name = "NotFound";
  }
  static instance(resource) {
    return new NotFound(resource);
  }
}

class Address {
  constructor(id, street, number, neighborhood, city, state, zipCode, country, note) {
    this.id = id;
    this.street = street;
    this.number = number;
    this.neighborhood = neighborhood;
    this.city = city;
    this.state = state;
    this.zipCode = zipCode;
    this.country = country;
    this.note = note;
  }
  raw() {
    return {
      id: this.id,
      street: this.street,
      number: this.number,
      neighborhood: this.neighborhood,
      city: this.city,
      state: this.state,
      zipCode: this.zipCode,
      country: this.country,
      note: this.note
    };
  }
  validate() {
    const requiredFields = [
      "street",
      "number",
      "neighborhood",
      "city",
      "state",
      "zipCode",
      "country"
    ];
    const missingFields = requiredFields.filter((field) => {
      const value = this[field];
      return value.trim().length === 0;
    });
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }
  static create(props) {
    const {
      id,
      street,
      number,
      neighborhood,
      city,
      state,
      zipCode,
      country,
      note
    } = props;
    return new Address(
      id ?? crypto.randomUUID().toString(),
      street ?? "",
      number ?? "",
      neighborhood ?? "",
      city ?? "",
      state ?? "",
      zipCode ?? "",
      country ?? "",
      note ?? ""
    );
  }
  isEmpty() {
    return !this.street && !this.number && !this.neighborhood && !this.city && !this.state && !this.zipCode && !this.country;
  }
  fullAddress() {
    return `${this.street}, ${this.number}, ${this.neighborhood}, ${this.city} - ${this.state}, ${this.zipCode}, ${this.country}`;
  }
}

class RabbitMqMessagingDriver {
  constructor() {
  }
  static instance() {
    return new RabbitMqMessagingDriver();
  }
  async connect() {
    try {
      this.connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
      this.channel = await this.connection.createChannel();
      console.log("Conectado ao RabbitMQ");
      this.connection.on("error", async (err) => {
        console.error("Erro na conex\xE3o com RabbitMQ:", err);
        await this.connect();
      });
    } catch (error) {
      console.error("Erro ao conectar no RabbitMQ:", error);
      throw error;
    }
  }
  async closeConnection() {
    try {
      await this.channel.close();
      await this.connection.close();
      console.log("Conex\xE3o com RabbitMQ fechada.");
    } catch (error) {
      console.error("Erro ao fechar conex\xE3o com RabbitMQ:", error);
    }
  }
  async sendDataToQueue({ queueName, data, workspaceId }) {
    try {
      await this.connect();
      if (!this.channel) {
        await this.connect();
      }
      await this.channel.assertQueue(queueName, { durable: true });
      this.channel.sendToQueue(queueName, Buffer.from(JSON.stringify({ data, workspaceId })), {
        persistent: true
      });
      return true;
    } catch (error) {
      console.error("Erro ao enviar mensagem para RabbitMQ:", error);
      return false;
    } finally {
      await this.closeConnection();
    }
  }
}

class Attendant {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
  raw() {
    return {
      id: this.id,
      name: this.name
    };
  }
  static create(id, name) {
    if (!id || !name) throw InvalidCreation.throw();
    return new Attendant(id, name);
  }
}

class Contact {
  constructor(phone, name, thumbnail) {
    this.phone = phone;
    this.name = name;
    this.thumbnail = thumbnail;
  }
  raw() {
    return {
      name: this.name,
      phone: this.phone,
      thumbnail: this.thumbnail
    };
  }
  static create(phone, name) {
    if (!phone) throw InvalidCreation.throw();
    return new Contact(phone, name ?? phone, "");
  }
}

class CartsRepository {
  timestampToDate(timestamp) {
    return new Date(timestamp * 1e3);
  }
  dateToTimestamp(date) {
    return Math.floor(date.getTime() / 1e3);
  }
  async upsert(cart) {
    const db = createConnection();
    const [client] = await db.select({
      id: clients.id,
      contactPhone: clients.contactPhone,
      addressId: clients.addressId,
      conversationId: conversations.id
    }).from(clients).innerJoin(contacts, eq(clients.contactPhone, contacts.phone)).leftJoin(
      conversations,
      and(
        eq(conversations.contactPhone, clients.contactPhone),
        eq(conversations.status, "open")
      )
    ).where(eq(contacts.phone, cart.client.contact.phone));
    const cartNewValues = {
      id: cart.id,
      attendantId: cart.attendant.id,
      conversationId: client.conversationId,
      clientId: client.id,
      addressId: cart.address?.id ? cart.address.id : client.addressId,
      status: cart.status,
      createdAt: this.dateToTimestamp(cart.createdAt),
      orderedAt: cart.orderedAt ? this.dateToTimestamp(cart.orderedAt) : null,
      expiredAt: cart.expiredAt ? this.dateToTimestamp(cart.expiredAt) : null,
      finishedAt: cart.finishedAt ? this.dateToTimestamp(cart.finishedAt) : null,
      canceledAt: cart.canceledAt ? this.dateToTimestamp(cart.canceledAt) : null,
      paymentMethod: cart.paymentMethod
    };
    const productsOnCartNewValues = await Promise.all(
      cart.products?.map(async (product) => {
        const [productOnCart] = await db.select({
          id: productsOnCart.id,
          cartId: productsOnCart.cartId,
          productId: productsOnCart.productId,
          quantity: productsOnCart.quantity
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
          quantity: product.quantity
        };
      })
    ) ?? [];
    const saveCart = await db.transaction(async (tx) => {
      const [upsertCart] = await tx.insert(carts).values(cartNewValues).onConflictDoUpdate({
        target: carts.id,
        set: cartNewValues
      }).returning();
      const upsertProducts = await Promise.all(
        productsOnCartNewValues.map(async (product) => {
          const [productInserted] = await tx.insert(productsOnCart).values(product).onConflictDoUpdate({
            target: productsOnCart.id,
            set: product
          }).returning();
          return productInserted;
        })
      );
      return { upsertCart, upsertProducts };
    });
    await db.$client.end();
    return !!saveCart.upsertCart && saveCart.upsertProducts.length === productsOnCartNewValues.length;
  }
  async retrieveOpenCartByConversationId(conversationId) {
    const db = createConnection();
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
    }).from(clients).leftJoin(addresses, eq(clients.addressId, addresses.id)).leftJoin(contacts, eq(clients.contactPhone, contacts.phone)).leftJoin(conversations, eq(clients.contactPhone, conversations.contactPhone)).where(eq(conversations.id, conversationId));
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
      products: sql`
                COALESCE(
                  JSON_AGG(
                    JSON_BUILD_OBJECT(
                      'id', ${products.id},
                      'description', ${products.description},
                      'price', ${products.price},
                      'quantity', ${productsOnCart.quantity}
                    )
                  )
                FILTER (WHERE ${productsOnCart.id} IS NOT NULL), '[]')::json
              `.as("products")
    }).from(carts).innerJoin(users, eq(carts.attendantId, users.id)).innerJoin(addresses, eq(addresses.id, carts.addressId)).leftJoin(productsOnCart, eq(carts.id, productsOnCart.cartId)).leftJoin(products, eq(productsOnCart.productId, products.id)).where(
      and(
        eq(carts.conversationId, conversationId),
        or(
          eq(carts.status, "budget"),
          eq(carts.status, "order")
        )
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
    await db.$client.end();
    if (!cart) return null;
    return Cart.instance({
      address: Address.create(cart.address),
      attendant: Attendant.create(cart.attendant.id, cart.attendant.name),
      client: Client.instance({
        address: Address.create(client.address),
        contact: Contact.create(client.contact.phone, client.contact?.name),
        id: client.id
      }),
      id: cart.id,
      products: cart.products.map(
        (p) => CartProduct.instance({
          description: p.description,
          id: p.id,
          price: p.price / 100,
          quantity: p.quantity
        })
      ),
      status: cart.status,
      createdAt: this.timestampToDate(cart.createdAt),
      orderedAt: cart.orderedAt ? this.timestampToDate(cart.orderedAt) : null,
      expiredAt: cart.expiredAt ? this.timestampToDate(cart.expiredAt) : null,
      finishedAt: cart.finishedAt ? this.timestampToDate(cart.finishedAt) : null,
      canceledAt: cart.canceledAt ? this.timestampToDate(cart.canceledAt) : null,
      paymentMethod: cart.paymentMethod
    });
  }
  async removeProductFromCart(productId, cartId) {
    const db = createConnection();
    await db.delete(productsOnCart).where(
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

class ClientsRepository {
  async retrieveByPhone(phone) {
    const db = createConnection();
    const [client] = await db.select({
      id: clients.id,
      contact: {
        phone: contacts.phone,
        name: contacts.name
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
      }
    }).from(clients).innerJoin(contacts, eq(contacts.phone, clients.contactPhone)).leftJoin(addresses, eq(addresses.id, clients.addressId)).where(eq(clients.contactPhone, phone));
    await db.$client.end();
    if (!client) return null;
    return Client.instance({
      id: client.id,
      address: client.address ? Address.create(client.address) : null,
      contact: Contact.create(client.contact.phone, client.contact.name)
    });
  }
  async upsert(client) {
    const db = createConnection();
    const [address] = await db.select({ addressId: clients.addressId }).from(clients).where(eq(clients.id, client.id));
    await db.transaction(async (tx) => {
      const [addressCreated] = await tx.insert(addresses).values({
        id: address?.addressId ?? crypto.randomUUID().toString(),
        city: client.address?.city ?? "",
        neighborhood: client.address?.neighborhood ?? "",
        number: client.address?.number ?? "",
        state: client.address?.state ?? "",
        street: client.address?.street ?? "",
        zipCode: client.address?.zipCode ?? "",
        note: client.address?.note ?? "",
        country: client.address?.country ?? ""
      }).onConflictDoUpdate({
        set: {
          city: client.address?.city ?? "",
          neighborhood: client.address?.neighborhood ?? "",
          number: client.address?.number ?? "",
          state: client.address?.state ?? "",
          street: client.address?.street ?? "",
          zipCode: client.address?.zipCode ?? "",
          note: client.address?.note ?? "",
          country: client.address?.country ?? ""
        },
        target: addresses.id
      }).returning();
      const contactCreated = await tx.insert(contacts).values({
        name: client.contact.name,
        phone: client.contact.phone
      }).onConflictDoUpdate({
        set: {
          name: client.contact.name
        },
        target: contacts.phone
      }).returning();
      await tx.insert(clients).values({
        id: client.id,
        addressId: addressCreated.id,
        contactPhone: contactCreated?.[0]?.phone
      }).onConflictDoUpdate({
        set: {
          addressId: addressCreated.id,
          contactPhone: contactCreated?.[0]?.phone
        },
        target: clients.id
      }).returning();
    });
    await db.$client.end();
    return;
  }
  static instance() {
    return new ClientsRepository();
  }
}

class Conversation {
  constructor(props) {
    this.id = props.id;
    this.contact = props.contact;
    this.messages = props.messages;
    this.attendant = props.attendant;
    this.status = props.status;
    this.openedAt = props.openedAt;
    this.sector = props.sector;
    this.channel = props.channel;
  }
  raw() {
    return {
      attendant: this.attendant?.raw?.() ?? null,
      channel: this.channel,
      contact: this.contact.raw(),
      id: this.id,
      messages: this.messages.map((message) => message.raw()),
      openedAt: this.openedAt,
      sector: this.sector?.raw?.() ?? null,
      status: this.status,
      lastMessage: this.lastMessage?.raw?.(),
      teaser: this.teaser
    };
  }
  set messages(messages) {
    if (!this._messages) {
      this._messages = /* @__PURE__ */ new Map();
    }
    for (const message of messages) {
      this._messages.set(message.id, message);
    }
  }
  get messages() {
    return Array.from(this._messages.values()).sort(
      (a, b) => a.createdAt > b.createdAt ? 1 : -1
    );
  }
  get lastMessage() {
    return this.messages.at(-1);
  }
  get lastContactMessages() {
    const messages = [];
    for (const message of this.messages.reverse()) {
      if (message.sender.type === "attendant") return messages.reverse();
      messages.push(message);
    }
    return messages.reverse();
  }
  get teaser() {
    return this.messages.at(-1)?.type === "audio" ? "Audio" : this.messages.at(-1)?.type === "image" ? "Imagem" : this.messages.at(-1)?.content;
  }
  addMessage(message) {
    this._messages.set(message.id, message);
    if (this.status === "waiting" && message.sender.type === "attendant") {
      this.attributeAttendant(
        Attendant.create(message.sender.id, message.sender.name)
      );
      this.markLastMessagesAsViewed();
    }
  }
  markLastMessagesAsViewed() {
    const messages = this.messages.filter((m) => m.status !== "viewed");
    for (const message of messages) {
      message.markAsViewed();
      this._messages.set(message.id, message);
    }
  }
  markLastMessagesContactAsViewed() {
    const messages = this.messages.filter(
      (m) => m.status !== "viewed" && m.sender.type === "contact"
    );
    for (const message of messages) {
      message.markAsViewed();
      this._messages.set(message.id, message);
    }
  }
  openConversation(attendantId) {
    if (this.attendant?.id !== attendantId) return;
    this.markLastMessagesAsViewed();
  }
  openService() {
    this.status = "open";
    this.openedAt = /* @__PURE__ */ new Date();
  }
  attributeAttendant(attendant) {
    if (!this.attendant && this.status === "waiting") {
      this.openService();
    }
    this.attendant = attendant;
  }
  transferToSector(sector) {
    this.sector = sector;
  }
  transferToAttendant(attendant) {
    this.attendant = attendant;
  }
  static instance(props) {
    return new Conversation(props);
  }
  static create(contact, channel) {
    if (!contact) throw InvalidCreation.throw();
    return new Conversation({
      id: crypto.randomUUID().toString(),
      contact,
      messages: [],
      attendant: null,
      status: "waiting",
      openedAt: null,
      sector: null,
      channel
    });
  }
}

class Sender {
  constructor(type, id, name) {
    this.type = type;
    this.id = id;
    this.name = name;
  }
  raw() {
    return {
      id: this.id,
      name: this.name,
      type: this.type
    };
  }
  static create(type, id, name) {
    if (!id || !name) throw InvalidCreation.throw();
    return new Sender(type ?? "attendant", id, name);
  }
}

class Message {
  constructor(props) {
    this.id = props.id;
    this.type = props.type;
    this.content = props.content;
    this.sender = props.sender;
    this.createdAt = props.createdAt;
    this.viewedAt = props.viewedAt;
    this.internal = props.internal;
    this.status = props.status;
  }
  markAsViewed() {
    this.status = "viewed";
    this.viewedAt = /* @__PURE__ */ new Date();
  }
  markAsSent() {
    this.status = "sent";
  }
  markAsDelivered() {
    this.status = "delivered";
  }
  raw() {
    return {
      content: this.content,
      createdAt: this.createdAt,
      id: this.id,
      internal: this.internal,
      sender: this.sender.raw(),
      type: this.type,
      viewedAt: this.viewedAt,
      status: this.status
    };
  }
  static instance(props) {
    return new Message(props);
  }
  static create(props) {
    return new Message({
      content: props.content,
      createdAt: props.createdAt,
      id: props.id,
      sender: Sender.create(
        props.sender instanceof Attendant ? "attendant" : "contact",
        props.sender instanceof Attendant ? props.sender.id : props.sender.phone,
        props.sender.name
      ),
      type: props.type,
      viewedAt: null,
      internal: props.internal ?? false,
      status: "senting"
    });
  }
}

class Sector {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
  raw() {
    return {
      id: this.id,
      name: this.name
    };
  }
  static create(name, id) {
    if (!name) throw InvalidCreation.throw();
    return new Sector(id ?? crypto.randomUUID().toString(), name);
  }
}

class ConversationsRepository {
  fullQuery(db) {
    return {
      where: (params) => db.select({
        id: conversations.id,
        channel: conversations.channel,
        contact: {
          phone: contacts.phone,
          name: contacts.name
        },
        messages: sql`
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', ${messages.id},
                'type', ${messages.type},
                'content', ${messages.content},
                'sender', JSON_BUILD_OBJECT(
                            'id', ${messages.senderId},
                            'type', ${messages.senderType},
                            'name', ${messages.senderName}
                          ),
                'createdAt', ${messages.createdAt},
                'internal', ${messages.internal},
                'status', ${messages.status},
                'viewedAt', ${messages.viewedAt}
              )
            )
          FILTER (WHERE ${messages.id} IS NOT NULL), '[]')::json
        `.as("messages"),
        attendant: {
          id: users.id,
          name: users.name
        },
        status: conversations.status,
        openedAt: conversations.openedAt,
        sector: {
          id: sectors.id,
          name: sectors.name
        }
      }).from(conversations).leftJoin(contacts, eq(conversations.contactPhone, contacts.phone)).leftJoin(messages, eq(messages.conversationId, conversations.id)).leftJoin(users, eq(users.id, conversations.attendantId)).leftJoin(sectors, eq(sectors.id, conversations.sectorId)).where(params).groupBy(
        conversations.id,
        conversations.channel,
        contacts.phone,
        contacts.name,
        users.id,
        users.name,
        conversations.status,
        conversations.openedAt,
        sectors.id,
        sectors.name
      )
    };
  }
  toConversation(conversation) {
    return Conversation.instance({
      channel: conversation.channel,
      attendant: conversation.attendant ? Attendant.create(
        conversation.attendant?.id,
        conversation.attendant?.name
      ) : null,
      contact: Contact.create(
        conversation.contact.phone,
        conversation.contact.name
      ),
      id: conversation.id,
      messages: conversation.messages?.map(
        (m) => Message.instance({
          content: m.content,
          createdAt: this.timestampToDate(m.createdAt),
          id: m.id,
          internal: !!m.internal,
          sender: Sender.create(m.sender.type, m.sender.id, m.sender.name),
          type: m.type,
          status: m.status,
          viewedAt: m.viewedAt ? this.timestampToDate(m.viewedAt) : null
        })
      ),
      openedAt: conversation.openedAt ? this.timestampToDate(conversation.openedAt) : null,
      sector: conversation.sector ? Sector.create(conversation.sector.name, conversation.sector.id) : null,
      status: conversation.status
    });
  }
  dateToTimestamp(date) {
    return Math.floor(date.getTime() / 1e3);
  }
  timestampToDate(timestamp) {
    return new Date(timestamp * 1e3);
  }
  async retrieve(id) {
    if (!id) return null;
    const db = createConnection();
    const [conversation] = await this.fullQuery(db).where(
      eq(conversations.id, id)
    );
    await db.$client.end();
    if (!conversation) return null;
    return this.toConversation(conversation);
  }
  async retrieveByContactPhone(phone) {
    if (!phone) return null;
    const db = createConnection();
    const [conversation] = await this.fullQuery(db).where(
      eq(conversations.contactPhone, phone)
    );
    await db.$client.end();
    if (!conversation) return null;
    return this.toConversation(conversation);
  }
  async listBySectorAndAttendantId(attendantId, sectorId) {
    if (!attendantId) return [];
    const db = createConnection();
    const list = await this.fullQuery(db).where(
      sectorId ? or(
        eq(conversations.sectorId, sectorId),
        eq(conversations.attendantId, attendantId)
      ) : eq(conversations.attendantId, attendantId)
    );
    await db.$client.end();
    return list.map((c) => this.toConversation(c));
  }
  async list(workspaceId) {
    if (!workspaceId) return [];
    const db = createConnection();
    const list = await this.fullQuery(db).where(
      eq(conversations.workspaceId, workspaceId)
    );
    await db.$client.end();
    return list.map((c) => this.toConversation(c));
  }
  async upsert(conversation, workspaceId) {
    const db = createConnection();
    await db.transaction(async (tx) => {
      await tx.insert(conversations).values({
        id: conversation.id,
        channel: conversation.channel,
        openedAt: conversation.openedAt ? this.dateToTimestamp(conversation.openedAt) : null,
        status: conversation.status,
        workspaceId,
        attendantId: conversation.attendant?.id,
        contactPhone: conversation.contact.phone,
        sectorId: conversation.sector?.id
      }).onConflictDoUpdate({
        set: {
          channel: conversation.channel,
          openedAt: conversation.openedAt ? this.dateToTimestamp(conversation.openedAt) : null,
          status: conversation.status,
          workspaceId,
          attendantId: conversation.attendant?.id,
          contactPhone: conversation.contact.phone,
          sectorId: conversation.sector?.id
        },
        target: conversations.id
      });
      await Promise.all(
        conversation.messages.map(async (m) => {
          await tx.insert(messages).values({
            id: m.id,
            createdAt: this.dateToTimestamp(m.createdAt),
            senderId: m.sender.id,
            content: m.content,
            conversationId: conversation.id,
            internal: m.internal,
            senderName: m.sender.name,
            senderType: m.sender.type,
            type: m.type,
            viewedAt: m.viewedAt ? this.dateToTimestamp(m.viewedAt) : null,
            status: m.status
          }).onConflictDoUpdate({
            set: {
              createdAt: this.dateToTimestamp(m.createdAt),
              senderId: m.sender.id,
              content: m.content,
              conversationId: conversation.id,
              internal: m.internal,
              senderName: m.sender.name,
              senderType: m.sender.type,
              type: m.type,
              viewedAt: m.viewedAt ? this.dateToTimestamp(m.viewedAt) : null,
              status: m.status
            },
            target: messages.id
          });
        })
      );
    });
    await db.$client.end();
  }
  static instance() {
    return new ConversationsRepository();
  }
}

const methodValues = [
  "CASH",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "CHECK",
  "DIGITAL_PAYMENT"
];
class PaymentMethod {
  constructor(type) {
    this.type = type;
  }
  raw() {
    return this.type;
  }
  static set(type) {
    return new PaymentMethod(type).raw();
  }
}

class AddressRepository {
  async upsertAddress(address) {
    const db = createConnection();
    const savedAddress = await db.insert(addresses).values(address).onConflictDoUpdate({
      target: addresses.id,
      set: address
    }).returning();
    await db.$client.end();
    return savedAddress.length > 0;
  }
  static instance() {
    return new AddressRepository();
  }
}

class NotAuthorized extends Error {
  constructor() {
    super("Sem autoriza\xE7\xE3o");
    this.name = "NotAuthorized";
  }
  static throw() {
    return new NotAuthorized();
  }
}

class AuthorizationService {
  can(actions, user, membership) {
    if (user.isSuperUser()) return true;
    if (typeof actions !== "object") {
      return membership.hasPermission(actions);
    }
    return actions.map((action) => membership.hasPermission(action)).some((allow) => allow);
  }
  static instance() {
    return new AuthorizationService();
  }
}

class Membership {
  constructor(props) {
    this.id = props.id;
    this.workspaceId = props.workspaceId;
    this.userId = props.userId;
    this.permissions = props.permissions;
  }
  set permissions(permissions) {
    this._permissions = /* @__PURE__ */ new Set();
    for (const permission of permissions) {
      this._permissions.add(permission);
    }
  }
  get permissions() {
    return Array.from(this._permissions);
  }
  addPermission(permission) {
    this._permissions.add(permission);
  }
  hasPermission(permission) {
    return this.permissions.includes(permission);
  }
  setPermissions(permissions) {
    this.permissions = permissions;
  }
  static instance(props) {
    return new Membership(props);
  }
  static create(workspaceId, userId) {
    if (!workspaceId || !userId) throw InvalidCreation.throw();
    return new Membership({
      id: crypto.randomUUID().toString(),
      permissions: [],
      userId,
      workspaceId
    });
  }
}

class MembershipsRepository {
  async upsert(membership) {
    const db = createConnection();
    await db.insert(memberships).values({
      id: membership.id,
      userId: membership.userId,
      workspaceId: membership.workspaceId,
      permissions: membership.permissions
    }).onConflictDoUpdate({
      set: {
        userId: membership.userId,
        workspaceId: membership.workspaceId,
        permissions: membership.permissions
      },
      target: memberships.id
    });
    await db.$client.end();
  }
  async retrieveByUserIdAndWorkspaceId(userId, workspaceId) {
    const db = createConnection();
    const [membership] = await db.select({
      id: memberships.id,
      workspaceId: memberships.workspaceId,
      userId: memberships.userId,
      permissions: memberships.permissions
    }).from(memberships).where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.workspaceId, workspaceId)
      )
    );
    await db.$client.end();
    if (!membership) return null;
    return Membership.instance({
      id: membership.id,
      permissions: membership.permissions,
      userId: membership.userId,
      workspaceId: membership.workspaceId
    });
  }
  async retrieveFirstByUserId(userId) {
    const db = createConnection();
    const [membership] = await db.select({
      id: memberships.id,
      workspaceId: memberships.workspaceId,
      userId: memberships.userId,
      permissions: memberships.permissions
    }).from(memberships).where(eq(memberships.userId, userId));
    await db.$client.end();
    if (!membership) return null;
    return Membership.instance({
      id: membership.id,
      permissions: membership.permissions,
      userId: membership.userId,
      workspaceId: membership.workspaceId
    });
  }
  static instance() {
    return new MembershipsRepository();
  }
}

class User {
  constructor(props) {
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.thumbnail = props.thumbnail;
    this.sector = props.sector;
    this.type = props.type;
  }
  assignSector(sector) {
    this.sector = sector;
  }
  update(input) {
    this.email = input.email ?? this.email;
    this.name = input.name ?? this.name;
    this.type = input.type ?? this.type;
  }
  isSuperUser() {
    return this.type === "superuser";
  }
  raw() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      thumbnail: this.thumbnail,
      sector: this.sector?.raw?.() ?? null,
      type: this.type
    };
  }
  static instance(props) {
    return new User(props);
  }
  static create(props) {
    if (!props.name || !props.email) throw InvalidCreation.throw();
    return new User({
      email: props.email,
      id: crypto.randomUUID().toString(),
      name: props.name,
      sector: null,
      thumbnail: null,
      type: props.type ?? "user"
    });
  }
}

class UsersRepository {
  async retrieveUserByEmail(email) {
    const db = createConnection();
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      thumbnail: users.thumbnail,
      sector: sectors,
      type: users.type
    }).from(users).leftJoin(sectors, eq(users.sectorId, sectors.id)).where(eq(users.email, email));
    await db.$client.end();
    if (!user) return null;
    return User.instance({
      id: user.id,
      name: user.name,
      thumbnail: user.thumbnail,
      email: user.email,
      sector: user.sector ? Sector.create(user.sector?.name, user.sector?.id) : null,
      type: user.type
    });
  }
  async retrieve(id) {
    if (!id) return null;
    const db = createConnection();
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      thumbnail: users.thumbnail,
      sector: sectors,
      type: users.type
    }).from(users).leftJoin(sectors, eq(users.sectorId, sectors.id)).where(eq(users.id, id));
    await db.$client.end();
    if (!user) return null;
    return User.instance({
      id: user.id,
      name: user.name,
      thumbnail: user.thumbnail,
      email: user.email,
      sector: user.sector ? Sector.create(user.sector?.name, user.sector?.id) : null,
      type: user.type
    });
  }
  async list(workspaceId) {
    const db = createConnection();
    const response = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      sector: {
        id: sectors.id,
        name: sectors.name
      },
      type: users.type,
      permissions: memberships.permissions
    }).from(memberships).leftJoin(users, eq(users.id, memberships.userId)).leftJoin(sectors, eq(users.sectorId, sectors.id)).where(eq(memberships.workspaceId, workspaceId));
    await db.$client.end();
    return response;
  }
  async upsert(user) {
    const db = createConnection();
    await db.insert(users).values({
      id: user.id,
      email: user.email,
      name: user.name,
      type: user.type,
      sectorId: user.sector?.id ?? null
    }).onConflictDoUpdate({
      set: {
        email: user.email,
        name: user.name,
        type: user.type,
        sectorId: user.sector?.id ?? null
      },
      target: users.id
    });
    await db.$client.end();
  }
  async retrievePassword(userId) {
    const db = createConnection();
    const [user] = await db.select({
      password: users.password
    }).from(users).where(eq(users.id, userId));
    await db.$client.end();
    if (!user) return null;
    return user.password;
  }
  async remove(userId) {
    const db = createConnection();
    await db.transaction(async (tx) => {
      await tx.delete(memberships).where(eq(memberships.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });
    await db.$client.end();
  }
  async setPassword(userId, password) {
    const db = createConnection();
    await db.insert(users).values({
      id: userId,
      password
    }).onConflictDoUpdate({
      set: { password },
      target: users.id
    });
    await db.$client.end();
  }
  async retrieveLoomaUser(workspaceId) {
    const db = createConnection();
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      thumbnail: users.thumbnail,
      sector: sectors,
      type: users.type
    }).from(memberships).innerJoin(users, eq(users.id, memberships.userId)).leftJoin(sectors, eq(users.sectorId, sectors.id)).where(
      and(
        eq(users.email, "looma@doxacode.com.br"),
        eq(memberships.workspaceId, workspaceId)
      )
    );
    await db.$client.end();
    if (!user) return null;
    return User.instance({
      id: user.id,
      name: user.name,
      thumbnail: user.thumbnail,
      email: user.email,
      sector: user.sector ? Sector.create(user.sector?.name, user.sector?.id) : null,
      type: user.type
    });
  }
  static instance() {
    return new UsersRepository();
  }
}

const COOKIE_TOKEN_NAME = "x-loomaai-token";
const COOKIE_WORKSPACE_NAME = "x-loomaai-workspace-id";

async function getUserAuthenticateId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_TOKEN_NAME);
  if (!token?.value) return null;
  const decoded = jwt.decode(token.value);
  if (!decoded?.id) return null;
  return decoded.id;
}
const getUserAuthenticate = createServerAction().handler(async () => {
  const usersRepository = UsersRepository.instance();
  const userId = await getUserAuthenticateId();
  if (!userId) return null;
  const user = await usersRepository.retrieve(userId);
  if (!user) return null;
  return user;
});
const getWorkspaceSelected = async () => {
  const cookiesStore = await cookies();
  const workspaceId = cookiesStore.get(COOKIE_WORKSPACE_NAME)?.value;
  return workspaceId ?? null;
};

const authorizationService = AuthorizationService.instance();
const membershipsRepository = MembershipsRepository.instance();
const usersRepository$1 = UsersRepository.instance();
const securityProcedure = (permissions) => createServerActionProcedure().input(
  z.object({
    userId: z.string().optional(),
    workspaceId: z.string().optional()
  }).optional()
).handler(async ({ input }) => {
  let user;
  let workspaceId;
  if (input?.userId && input?.workspaceId) {
    user = await usersRepository$1.retrieve(input.userId);
    workspaceId = input.workspaceId;
  } else {
    const [userAuth] = await getUserAuthenticate();
    user = userAuth;
    workspaceId = await getWorkspaceSelected();
  }
  if (!user || !workspaceId) throw NotAuthorized.throw();
  const membership = await membershipsRepository.retrieveByUserIdAndWorkspaceId(
    user?.id,
    workspaceId
  );
  if (!membership?.id) throw NotFound.instance("workspace");
  const isAllowed = authorizationService.can(
    permissions,
    user,
    membership
  );
  if (!isAllowed) throw NotAuthorized.throw();
  return { user, membership };
}).createServerAction();

const conversationsRepository$1 = ConversationsRepository.instance();
const cartsRepository$1 = CartsRepository.instance();
const productsRepository = ProductsRepository.instance();
const clientsRepository = ClientsRepository.instance();
const addressRepository = AddressRepository.instance();
const rabbitMq = RabbitMqMessagingDriver.instance();
const retrieveOpenCart = securityProcedure(["manage:cart"]).input(
  z.object({
    conversationId: z.string()
  })
).handler(async ({ input }) => {
  const conversation = await conversationsRepository$1.retrieve(
    input.conversationId
  );
  if (!conversation) throw NotFound.instance("Conversation");
  let cart = await cartsRepository$1.retrieveOpenCartByConversationId(
    input.conversationId
  );
  if (!cart) throw NotFound.instance("Cart");
  return cart.raw();
});
securityProcedure(["manage:cart"]).input(
  z.object({
    productId: z.string(),
    conversationId: z.string(),
    quantity: z.number()
  })
).handler(async ({ input }) => {
  const conversation = await conversationsRepository$1.retrieve(
    input.conversationId
  );
  if (!conversation) throw NotFound.instance("Conversation");
  let cart = await cartsRepository$1.retrieveOpenCartByConversationId(
    input.conversationId
  );
  if (cart) return cart.raw();
  let client = await clientsRepository.retrieveByPhone(
    conversation.contact.phone
  );
  if (!client) {
    client = Client.create(conversation.contact);
    await clientsRepository.upsert(client);
  }
  cart = Cart.create({
    attendant: conversation.attendant,
    client
  });
  const product = await productsRepository.retrieve(input.productId);
  if (product) {
    cart.upsertProduct(
      CartProduct.create({
        product,
        quantity: input.quantity
      })
    );
  }
  await cartsRepository$1.upsert(cart);
  return cart.raw();
});
const upsertProductOnCart = securityProcedure(["manage:cart"]).input(
  z.object({
    productId: z.string(),
    conversationId: z.string(),
    quantity: z.number()
  })
).handler(async ({ input, ctx }) => {
  console.log({ input });
  const conversation = await conversationsRepository$1.retrieve(
    input.conversationId
  );
  if (!conversation) throw NotFound.instance("Conversation");
  let client = await clientsRepository.retrieveByPhone(
    conversation.contact.phone
  );
  if (!client) {
    client = Client.create(conversation.contact);
    await clientsRepository.upsert(client);
  }
  let cart = await cartsRepository$1.retrieveOpenCartByConversationId(
    input.conversationId
  );
  if (!cart) {
    cart = Cart.create({
      attendant: conversation.attendant,
      client
    });
  }
  const product = await productsRepository.retrieve(input.productId);
  if (!product) throw NotFound.instance("Product");
  cart.upsertProduct(
    CartProduct.create({
      product,
      quantity: input.quantity
    })
  );
  await cartsRepository$1.upsert(cart);
  if (cart.status === "order") {
    rabbitMq.sendDataToQueue({
      queueName: "looma-carts",
      data: cart.raw(),
      workspaceId: ctx.membership.workspaceId
    });
  }
  return;
});
const removeProductFromCart = securityProcedure(["manage:cart"]).input(
  z.object({
    productId: z.string(),
    conversationId: z.string()
  })
).handler(async ({ input }) => {
  const cart = await cartsRepository$1.retrieveOpenCartByConversationId(
    input.conversationId
  );
  if (!cart) throw NotFound.instance("Cart");
  const product = cart.products.find((p) => p.id === input.productId);
  if (!product) throw NotFound.instance("Product");
  await cartsRepository$1.removeProductFromCart(input.productId, cart.id);
  return;
});
securityProcedure(["manage:cart"]).input(
  z.object({
    conversationId: z.string()
  })
).handler(async ({ input, ctx }) => {
  const cart = await cartsRepository$1.retrieveOpenCartByConversationId(
    input.conversationId
  );
  if (!cart) throw NotFound.instance("Cart");
  if (!cart.address)
    throw new Error("N\xE3o \xE9 poss\xEDvel finalizar o pedido sem um endere\xE7o.");
  const address = Address.create(cart.address?.raw());
  const validateAddress = address.validate();
  if (!validateAddress.isValid)
    throw new Error(`
      N\xE3o \xE9 poss\xEDvel finalizar o pedido com o endere\xE7o incompleto.
      Campos faltantes: ${validateAddress.missingFields}
      `);
  if (!cart.paymentMethod) throw new Error("Defina um m\xE9todo de pagamento.");
  cart.orderCart();
  await cartsRepository$1.upsert(cart);
  rabbitMq.sendDataToQueue({
    queueName: "looma-carts",
    data: cart.raw(),
    workspaceId: ctx.membership.workspaceId
  });
  return;
});
securityProcedure(["manage:cart"]).input(
  z.object({
    conversationId: z.string()
  })
).handler(async ({ input }) => {
  const cart = await cartsRepository$1.retrieveOpenCartByConversationId(
    input.conversationId
  );
  if (!cart) throw NotFound.instance("Cart");
  cart.expireCart();
  await cartsRepository$1.upsert(cart);
  return;
});
securityProcedure(["manage:cart"]).input(
  z.object({
    conversationId: z.string()
  })
).handler(async ({ input }) => {
  const cart = await cartsRepository$1.retrieveOpenCartByConversationId(
    input.conversationId
  );
  if (!cart) throw NotFound.instance("Cart");
  cart.finishCart();
  await cartsRepository$1.upsert(cart);
  return;
});
securityProcedure(["manage:cart"]).input(
  z.object({
    conversationId: z.string()
  })
).handler(async ({ input, ctx }) => {
  const cart = await cartsRepository$1.retrieveOpenCartByConversationId(
    input.conversationId
  );
  if (!cart) throw NotFound.instance("Cart");
  const isOrder = cart.status === "order";
  cart.cancelCart();
  await cartsRepository$1.upsert(cart);
  if (isOrder) {
    rabbitMq.sendDataToQueue({
      queueName: "looma-carts",
      data: cart.raw(),
      workspaceId: ctx.membership.workspaceId
    });
  }
  return;
});
const setCartAddress = securityProcedure(["manage:cart"]).input(
  z.object({
    conversationId: z.string(),
    address: z.object({
      street: z.string().optional().default(""),
      number: z.string().optional().default(""),
      neighborhood: z.string().optional().default(""),
      city: z.string().optional().default(""),
      state: z.string().optional().default(""),
      zipCode: z.string().optional().default(""),
      country: z.string().optional().default(""),
      note: z.string().optional().default("").nullable()
    })
  })
).handler(async ({ input }) => {
  const cart = await cartsRepository$1.retrieveOpenCartByConversationId(
    input.conversationId
  );
  if (!cart) throw NotFound.instance("Cart");
  const newAddress = Address.create(input.address);
  await addressRepository.upsertAddress(newAddress);
  cart.address = newAddress;
  await cartsRepository$1.upsert(cart);
  return;
});
const setPaymentMethod = securityProcedure(["manage:cart"]).input(
  z.object({
    conversationId: z.string(),
    paymentMethod: z.enum(methodValues)
  })
).handler(async ({ input }) => {
  const cart = await cartsRepository$1.retrieveOpenCartByConversationId(
    input.conversationId
  );
  if (!cart) throw NotFound.instance("Cart");
  const paymentMethod = PaymentMethod.set(input.paymentMethod);
  cart.setPaymentMethod(paymentMethod);
  await cartsRepository$1.upsert(cart);
  return;
});

class LoomaAIDriver {
  async sendMessage(props, retry = 0) {
    try {
      const runtimeContext = new RuntimeContext([
        ["clientName", props.conversation.contact.name],
        ["attendantName", "Looma"],
        ["businessName", "Dromed Pharma"],
        ["pinecone-namespace", "dromed-pharma-odila"],
        ["conversationId", props.conversation.id],
        ["userId", props.aiUser.id],
        ["workspaceId", props.workspaceId]
      ]);
      const looma = mastra.getAgent("loomaAgent");
      const response = await looma.generate(
        props.conversation.lastContactMessages.map((m) => m.content).join("\n"),
        {
          runtimeContext,
          maxSteps: 999,
          memory: {
            resource: props.conversation.contact.phone,
            thread: {
              id: props.conversation.id,
              resourceId: props.conversation.contact.phone
            }
          }
        }
      );
      const result = response.text;
      return result;
    } catch (err) {
      console.log(err);
      if (retry > 2) {
        return "";
      }
      return await this.sendMessage(props, retry + 1);
    }
  }
  static instance() {
    return new LoomaAIDriver();
  }
}

class MetaMessageDriver {
  constructor() {
    this.client = axios.create({
      baseURL: "https://graph.facebook.com/v23.0",
      headers: {
        Authorization: `Bearer ${process.env.META_TOKEN}`
      }
    });
  }
  async downloadMedia(channel, mediaId) {
    const mediaRetrieved = await this.client.get(
      `/${mediaId}?phone_number_id=${channel}`
    );
    const result = await axios.get(mediaRetrieved.data.url, {
      responseType: "arraybuffer",
      headers: { Authorization: `Bearer ${process.env.META_TOKEN}` }
    });
    return result.data;
  }
  async sendTyping(data) {
    await this.client.post(`/${data.channel}/messages`, {
      messaging_product: "whatsapp",
      status: "read",
      message_id: data.lastMessageId,
      typing_indicator: {
        type: "text"
      }
    });
  }
  async sendMessageText(data) {
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
    return response?.data?.messages?.[0]?.id;
  }
  async sendMessageAudio(data) {
    const arrayBuffer = await data.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const form = new FormData();
    form.append("file", buffer, {
      filename: data.file.name,
      contentType: data.file.type || "audio/ogg"
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
      id: sendResponse.data.messages[0].id,
      mediaId
    };
  }
  static instance() {
    return new MetaMessageDriver();
  }
}

class ContactsRepository {
  async retrieve(phone) {
    const db = createConnection();
    const response = await db.select({
      phone: contacts.phone,
      name: contacts.name
    }).from(contacts).where(eq(contacts.phone, phone));
    await db.$client.end();
    const contact = response?.[0];
    if (!contact) return null;
    return Contact.create(contact.phone, contact.name);
  }
  async upsert(contact) {
    const db = createConnection();
    await db.insert(contacts).values({
      name: contact.name,
      phone: contact.phone
    }).onConflictDoUpdate({
      set: {
        name: contact.name,
        phone: contact.phone
      },
      target: contacts.phone
    });
    await db.$client.end();
  }
  static instance() {
    return new ContactsRepository();
  }
}

class MessagesRepository {
  timestampToDate(timestamp) {
    return new Date(timestamp * 1e3);
  }
  dateToTimestamp(date) {
    return Math.floor(date.getTime() / 1e3);
  }
  async upsert(message) {
    const db = createConnection();
    const [oldMessage] = await db.select({ conversationId: messages.conversationId }).from(messages).where(eq(messages.id, message.id));
    if (!oldMessage) return null;
    await db.insert(messages).values({
      content: message.content,
      createdAt: this.dateToTimestamp(message.createdAt),
      id: message.id,
      senderId: message.sender.id,
      conversationId: oldMessage.conversationId,
      internal: message.internal,
      senderName: message.sender.name,
      senderType: message.sender.type,
      status: message.status,
      type: message.type,
      viewedAt: message.viewedAt ? this.dateToTimestamp(message.viewedAt) : null
    }).onConflictDoUpdate({
      set: {
        content: message.content,
        createdAt: this.dateToTimestamp(message.createdAt),
        senderId: message.sender.id,
        conversationId: oldMessage.conversationId,
        internal: message.internal,
        senderName: message.sender.name,
        senderType: message.sender.type,
        status: message.status,
        type: message.type,
        viewedAt: message.viewedAt ? this.dateToTimestamp(message.viewedAt) : null
      },
      target: messages.id
    });
    await db.$client.end();
    return oldMessage.conversationId;
  }
  async retrieve(messageId) {
    const db = createConnection();
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    await db.$client.end();
    if (!message) return null;
    return Message.instance({
      content: message.content,
      createdAt: this.timestampToDate(message.createdAt),
      id: message.id,
      internal: message.internal,
      sender: Sender.create(
        message.senderType,
        message.senderId,
        message.senderName
      ),
      type: message.type,
      status: message.status,
      viewedAt: message.viewedAt ? this.timestampToDate(message.viewedAt) : null
    });
  }
  static instance() {
    return new MessagesRepository();
  }
}

class Setting {
  constructor(wabaId) {
    this.wabaId = wabaId;
  }
  raw() {
    return {
      wabaId: this.wabaId
    };
  }
  static create(props) {
    return new Setting(props?.wabaId ?? "");
  }
}

class SettingsRepository {
  async retrieveSettingsByWorkspaceId(workspaceId) {
    const db = createConnection();
    const [setting] = await db.select({ wabaId: settings.wabaId }).from(settings).where(eq(settings.workspaceId, workspaceId));
    await db.$client.end();
    if (!setting) return null;
    return Setting.create(setting);
  }
  async upsert(workspaceId, input) {
    const db = createConnection();
    const response = await db.select({
      id: settings.id,
      wabaId: settings.wabaId,
      workspaceId: settings.workspaceId
    }).from(settings).where(eq(settings.workspaceId, workspaceId));
    const setting = response?.[0];
    await db.insert(settings).values({
      id: setting?.id || crypto.randomUUID().toString(),
      wabaId: input.wabaId,
      workspaceId: setting?.workspaceId || workspaceId
    }).onConflictDoUpdate({
      set: {
        wabaId: input.wabaId
      },
      target: settings.id
    });
    await db.$client.end();
  }
  async retrieveWorkspaceIdByWabaId(wabaId) {
    const db = createConnection();
    const [setting] = await db.select({ workspaceId: settings.workspaceId }).from(settings).where(eq(settings.wabaId, wabaId));
    await db.$client.end();
    if (!setting) return null;
    return setting.workspaceId;
  }
  async retrieveSettingByWabaId(wabaId) {
    const db = createConnection();
    const [setting] = await db.select({ wabaId: settings.wabaId }).from(settings).where(eq(settings.wabaId, wabaId));
    await db.$client.end();
    if (!setting) return null;
    return Setting.create(setting);
  }
  static instance() {
    return new SettingsRepository();
  }
}

const sseEmitter = new EventEmitter();
sseEmitter.setMaxListeners(1e3);

class ValidSignature {
  static async valid(rawBody, signature) {
    const bodyBuffer = Buffer.from(rawBody);
    if (!signature) {
      return false;
    }
    const secret = process.env.META_APP_SECRET ?? "";
    const expected = "sha256=" + crypto$1.createHmac("sha256", secret).update(bodyBuffer).digest("hex");
    if (signature !== expected) {
      return false;
    }
    return true;
  }
}

const usersRepository = UsersRepository.instance();
const settingsRepository = SettingsRepository.instance();
const contactsRepository = ContactsRepository.instance();
const conversationsRepository = ConversationsRepository.instance();
const messagesRepository = MessagesRepository.instance();
const cartsRepository = CartsRepository.instance();
const messageDriver = MetaMessageDriver.instance();
const aiDriver = LoomaAIDriver.instance();
const debouncedMap = /* @__PURE__ */ new Map();
function getSendToLoomaDebounced(conversationId) {
  if (!debouncedMap.has(conversationId)) {
    const fn = pDebounce(
      async (conversation, workspaceId) => {
        const messages = conversation.lastContactMessages.map((m) => m.content);
        if (!messages.length) return;
        console.log(conversation.lastContactMessages.map((m) => m.content));
        try {
          let loomaUser = await usersRepository.retrieveLoomaUser(workspaceId);
          if (!loomaUser) {
            loomaUser = User.create({
              email: "looma@doxacode.com.br",
              name: "Looma AI",
              type: "system"
            });
            const membership = Membership.create(workspaceId, loomaUser.id);
            membership.setPermissions(["manage:cart", "view:products"]);
            await usersRepository.upsert(loomaUser);
            await MembershipsRepository.instance().upsert(membership);
          }
          sseEmitter.emit("typing");
          await messageDriver.sendTyping({
            lastMessageId: conversation.lastContactMessages.at(-1)?.id,
            channel: conversation.channel
          });
          const response = await aiDriver.sendMessage({
            aiUser: loomaUser,
            conversation,
            workspaceId
          });
          const messageId = await messageDriver.sendMessageText({
            channel: conversation.channel,
            content: response,
            to: conversation.contact.phone
          });
          const message = Message.create({
            content: response,
            createdAt: /* @__PURE__ */ new Date(),
            id: messageId,
            sender: Attendant.create(loomaUser.id, loomaUser.name),
            type: "text"
          });
          conversation.addMessage(message);
          await conversationsRepository.upsert(conversation, workspaceId);
          sseEmitter.emit("message", conversation.raw());
          sseEmitter.emit("untyping");
        } catch (err) {
          sseEmitter.emit("untyping");
        }
      },
      3e3
    );
    debouncedMap.set(conversationId, fn);
  }
  return debouncedMap.get(conversationId);
}
securityProcedure([
  "view:conversation",
  "view:conversations"
]).input(
  z.object({
    channel: z.string(),
    messageId: z.string()
  })
).handler(async ({ input }) => {
  const message = await messagesRepository.retrieve(input.messageId);
  if (!message || message.type !== "audio") return;
  const arrayBuffer = await messageDriver.downloadMedia(
    input.channel,
    message.content
  );
  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": "audio/ogg"
    }
  });
});
securityProcedure(["send:message"]).input(
  z.object({
    file: z.instanceof(File),
    conversationId: z.string()
  })
).handler(async ({ ctx, input }) => {
  const conversation = await conversationsRepository.retrieve(
    input.conversationId
  );
  if (!conversation) return;
  await messageDriver.sendTyping({
    lastMessageId: conversation.lastContactMessages?.at(-1)?.id,
    channel: conversation.channel
  });
  const attendant = Attendant.create(ctx.user.id, ctx.user.name);
  if (!conversation.attendant) {
    conversation.attributeAttendant(attendant);
  }
  const { id: messageId, mediaId } = await messageDriver.sendMessageAudio({
    channel: conversation.channel,
    to: conversation.contact.phone,
    file: input.file
  });
  conversation.addMessage(
    Message.create({
      content: mediaId,
      createdAt: /* @__PURE__ */ new Date(),
      id: messageId,
      sender: attendant,
      type: "audio"
    })
  );
  sseEmitter.emit("message", conversation.raw());
  await conversationsRepository.upsert(
    conversation,
    ctx.membership.workspaceId
  );
});
securityProcedure(["send:message"]).input(z.object({ conversationId: z.string(), content: z.string() })).handler(async ({ ctx, input }) => {
  const conversation = await conversationsRepository.retrieve(
    input.conversationId
  );
  if (!conversation) return;
  await messageDriver.sendTyping({
    lastMessageId: conversation.lastContactMessages?.at(-1)?.id,
    channel: conversation.channel
  });
  const attendant = Attendant.create(ctx.user.id, ctx.user.name);
  if (!conversation.attendant) {
    conversation.attributeAttendant(attendant);
  }
  const messageId = await messageDriver.sendMessageText({
    channel: conversation.channel,
    content: input.content,
    to: conversation.contact.phone
  });
  const message = Message.create({
    content: input.content,
    createdAt: /* @__PURE__ */ new Date(),
    id: messageId,
    sender: attendant,
    type: "text"
  });
  conversation.addMessage(message);
  sseEmitter.emit("message", conversation.raw());
  await conversationsRepository.upsert(
    conversation,
    ctx.membership.workspaceId
  );
});
securityProcedure([
  "view:conversations",
  "view:conversation"
]).handler(async ({ ctx }) => {
  if (ctx.user.isSuperUser() || ctx.membership.hasPermission("view:conversations")) {
    const response = await conversationsRepository.list(
      ctx.membership.workspaceId
    );
    return response.map((c) => c.raw());
  }
  return (await conversationsRepository.listBySectorAndAttendantId(
    ctx.user.id,
    ctx.user.sector?.id
  )).map((c) => c.raw());
});
createServerAction().input(z.any()).handler(async ({ input }) => {
  const decoded = jwt.decode(input["hub.verify_token"]);
  if (!decoded) throw new NotAuthorized();
  const user = await usersRepository.retrieve(decoded.id);
  if (!user || user.email !== "looma@doxacode.com.br")
    throw new NotAuthorized();
  return input["hub.challenge"];
});
const showCart = securityProcedure([
  "manage:cart",
  "send:message",
  "view:conversation",
  "view:conversations"
]).input(z.object({ conversationId: z.string() })).handler(async ({ input, ctx }) => {
  const conversation = await conversationsRepository.retrieve(
    input.conversationId
  );
  if (!conversation) throw NotFound.instance("Conversation");
  let cart = await cartsRepository.retrieveOpenCartByConversationId(
    input.conversationId
  );
  if (!cart) throw NotFound.instance("Cart");
  const content = `
*Resumo do pedido*:
      
*Lista de Produtos*:
${cart.products.map(
    (p) => `- ${p.description} - ${p.quantity} x ${p.price.toLocaleString("pt-BR", {
      currency: "BRL",
      style: "currency"
    })} = ${p.total.toLocaleString("pt-BR", {
      currency: "BRL",
      style: "currency"
    }) ?? "Sem produtos no pedido"}`
  ).join("\n")}

*Informa\xE7\xF5es de entrega*:
${cart.address?.isEmpty() || !cart.address ? "Ainda n\xE3o informado" : cart.address?.fullAddress()}
      
*Informa\xE7\xF5es de Pagamento*:
${cart.paymentMethod ?? "Ainda n\xE3o informado"}

*Valor Total*:
${cart.total.toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency"
  })}
`.trim();
  const messageId = await messageDriver.sendMessageText({
    channel: conversation.channel,
    content,
    to: conversation.contact.phone
  });
  const message = Message.create({
    content,
    createdAt: /* @__PURE__ */ new Date(),
    id: messageId,
    sender: conversation.attendant,
    type: "text"
  });
  conversation.addMessage(message);
  sseEmitter.emit("message", conversation.raw());
  await conversationsRepository.upsert(
    conversation,
    ctx.membership.workspaceId
  );
});
createServerAction().input(z.any()).onError(async (err) => {
  console.log(err);
}).handler(async ({ input, request }) => {
  if (!request) throw new NotAuthorized();
  const rawBody = await request.arrayBuffer();
  const signature = request.headers.get("x-hub-signature-256");
  const isValid = await ValidSignature.valid(rawBody, signature);
  if (!isValid) {
    throw NotAuthorized.throw();
  }
  const [entry] = input.entry;
  const statuses = entry?.changes?.[0]?.value?.statuses?.[0];
  if (statuses) {
    const message2 = await messagesRepository.retrieve(statuses.id);
    if (!message2) return;
    if (statuses.status === "sent") {
      message2.markAsSent();
    }
    if (statuses.status === "delivered") {
      message2.markAsDelivered();
    }
    if (statuses.status === "read") {
      message2.markAsViewed();
    }
    const conversationId = await messagesRepository.upsert(message2);
    if (conversationId) {
      const conversation2 = await conversationsRepository.retrieve(
        conversationId
      );
      if (!conversation2) return;
      sseEmitter.emit("message", conversation2.raw());
    }
    return;
  }
  const {
    id: wabaId,
    changes: [
      {
        value: {
          contacts,
          metadata: { phone_number_id: phoneId },
          messages: [messagePayload]
        }
      }
    ]
  } = entry;
  const setting = await settingsRepository.retrieveSettingByWabaId(wabaId);
  if (!setting) return;
  const contactProfile = contacts?.at(0);
  if (!contactProfile) return;
  let contact = await contactsRepository.retrieve(contactProfile.wa_id);
  if (!contact) {
    contact = Contact.create(
      contactProfile?.wa_id,
      contactProfile?.profile.name
    );
    await contactsRepository.upsert(contact);
  }
  const workspaceId = await settingsRepository.retrieveWorkspaceIdByWabaId(
    wabaId
  );
  if (!workspaceId) return;
  let conversation = await conversationsRepository.retrieveByContactPhone(
    contact.phone
  );
  if (!conversation) {
    conversation = Conversation.create(contact, phoneId);
  }
  const message = messagePayload.type === "text" ? Message.create({
    content: messagePayload.text.body,
    id: messagePayload.id,
    createdAt: new Date(messagePayload.timestamp * 1e3),
    sender: contact,
    type: "text"
  }) : Message.create({
    id: messagePayload.id,
    createdAt: new Date(messagePayload.timestamp * 1e3),
    sender: contact,
    content: messagePayload.audio.id,
    type: "audio"
  });
  if (conversation.messages.some((m) => m.id === message.id)) return;
  message.markAsDelivered();
  conversation.addMessage(message);
  await conversationsRepository.upsert(conversation, workspaceId);
  sseEmitter.emit("message", conversation.raw());
  await getSendToLoomaDebounced(conversation.id)(conversation, workspaceId);
});
securityProcedure([
  "view:conversation",
  "view:conversations"
]).input(z.object({ conversationId: z.string() })).handler(async ({ input, ctx: { membership } }) => {
  const conversation = await conversationsRepository.retrieve(
    input.conversationId
  );
  if (!conversation) return;
  conversation.markLastMessagesContactAsViewed();
  await conversationsRepository.upsert(conversation, membership.workspaceId);
  sseEmitter.emit("message", conversation.raw());
});

const retrieveCartTool = createTool({
  id: "retrieve-cart-tool",
  description: "Use para recuperar o pedido do cliente",
  execute: async ({ runtimeContext }) => {
    const result = await retrieveOpenCart({
      userId: runtimeContext.get("userId"),
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId")
    });
    return result;
  }
});
const showCartTool = createTool({
  id: "show-cart-tool",
  description: "Use para enviar o resumo do pedido para o cliente",
  execute: async ({ runtimeContext }) => {
    const [, err] = await showCart({
      userId: runtimeContext.get("userId"),
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId")
    });
    if (err) return err;
    return "";
  }
});
const addProductOnCartTool = createTool({
  id: "add-product-on-cart-tool",
  description: "Use para alterar a quantidade de um determinado produto do pedido",
  inputSchema: z$1.object({
    productId: z$1.string(),
    quantity: z$1.number()
  }),
  execute: async ({ runtimeContext, context }) => {
    const result = await upsertProductOnCart({
      userId: runtimeContext.get("userId"),
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId"),
      productId: context.productId,
      quantity: context.quantity
    });
    return result;
  }
});
const removeProductFromCartTool = createTool({
  id: "remove-product-from-cart-tool",
  description: "Use para remover um determinado produto do pedido",
  inputSchema: z$1.object({
    productId: z$1.string()
  }),
  execute: async ({ runtimeContext, context }) => {
    const result = await removeProductFromCart({
      userId: runtimeContext.get("userId"),
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId"),
      productId: context.productId
    });
    return result;
  }
});
const setAddressCartTool = createTool({
  id: "set-address-cart-tool",
  description: "Use para alterar o endere\xE7o de entrega do pedido",
  inputSchema: z$1.object({
    street: z$1.string().optional().default(""),
    number: z$1.string().optional().default(""),
    neighborhood: z$1.string().optional().default(""),
    city: z$1.string().optional().default(""),
    state: z$1.string().optional().default(""),
    zipCode: z$1.string().optional().default(""),
    country: z$1.string().optional().default(""),
    note: z$1.string().optional().default("").nullable().describe("Complemento do endere\xE7o")
  }),
  execute: async ({ runtimeContext, context }) => {
    const result = await setCartAddress({
      userId: runtimeContext.get("userId"),
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId"),
      address: context
    });
    return result;
  }
});
const setPaymentMethodCartTool = createTool({
  id: "set-payment-method-cart-tool",
  description: "Use para alterar o m\xE9todo de pagamento do pedido",
  inputSchema: z$1.object({
    paymentMethod: z$1.enum(methodValues)
  }),
  execute: async ({ runtimeContext, context }) => {
    const result = await setPaymentMethod({
      userId: runtimeContext.get("userId"),
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId"),
      paymentMethod: context.paymentMethod
    });
    return result;
  }
});

const loomaAgent = new Agent({
  name: "Looma Agent",
  instructions,
  model: azure("gpt-4.1"),
  memory: memoryWithVector,
  tools: {
    stockTool,
    consultingCepTool,
    retrieveCartTool,
    addProductOnCartTool,
    removeProductFromCartTool,
    showCartTool,
    setAddressCartTool,
    setPaymentMethodCartTool,
    knowledgeBaseTool
  }
});

const mastra = new Mastra({
  agents: {
    loomaAgent
  },
  vectors: {
    pinecone: pineconeVector
  },
  telemetry: {
    enabled: false
  },
  logger: new PinoLogger({
    level: "info"
  })
});

export { addProductOnCartTool as a, removeProductFromCartTool as b, setAddressCartTool as c, setPaymentMethodCartTool as d, mastra as m, retrieveCartTool as r, showCartTool as s };
