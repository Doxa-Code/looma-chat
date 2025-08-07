import { MastraVector, createTool } from '@mastra/core';
import { embed } from 'ai';
import { z } from 'zod';
import { inArray, eq, and, ilike, asc } from 'drizzle-orm';
import { drizzle } from '/Users/fernandosouza/dev/looma-chat/node_modules/.pnpm/drizzle-orm@0.44.2_@libsql+client@0.15.10_@opentelemetry+api@1.9.0_@types+pg@8.15.5_@up_ed9c848c8388e554ffadb5bd79d740cd/node_modules/drizzle-orm/postgres-js/index.cjs';
import { pgTable, uuid, varchar, integer, text, boolean, timestamp } from '/Users/fernandosouza/dev/looma-chat/node_modules/.pnpm/drizzle-orm@0.44.2_@libsql+client@0.15.10_@opentelemetry+api@1.9.0_@types+pg@8.15.5_@up_ed9c848c8388e554ffadb5bd79d740cd/node_modules/drizzle-orm/pg-core/index.cjs';
import { b as azureEmbeddings } from './azure.mjs';
import { Pinecone } from '@pinecone-database/pinecone';
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY ?? ""
});
class PineconeMastraVector extends MastraVector {
  getIndex(name) {
    return pinecone.index(this.normalizeName(name));
  }
  normalizeName(name) {
    return name.replace("_", "-");
  }
  async query(params) {
    const index = this.getIndex(params.indexName);
    const response = await index.query({
      topK: params.topK ?? 10,
      includeMetadata: true,
      vector: params.queryVector,
      filter: params.filter ?? void 0
    });
    return (response.matches ?? []).map((match) => ({
      id: match.id,
      score: match.score ?? 0,
      metadata: match.metadata ?? {}
    }));
  }
  async upsert(params) {
    const index = this.getIndex(params.indexName);
    const vectors = params.metadata?.map((m, idx) => ({
      id: m.message_id,
      values: params.vectors.at(idx) ?? [],
      metadata: m
    })) || [];
    if (!vectors.length) return [];
    await index.upsert(vectors);
    return vectors.map((v) => v.id);
  }
  async createIndex(params) {
    const indexes = await this.listIndexes();
    if (indexes.includes(this.normalizeName(params.indexName))) return;
    await pinecone.createIndex({
      name: this.normalizeName(params.indexName),
      dimension: params.dimension,
      metric: params.metric ?? "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1"
        }
      }
    });
  }
  async listIndexes() {
    const response = await pinecone.listIndexes();
    return response.indexes?.map((i) => i.name) ?? [];
  }
  async describeIndex(params) {
    const index = this.getIndex(params.indexName);
    const stats = await index.describeIndexStats();
    return {
      count: stats.totalRecordCount ?? 0,
      dimension: stats.dimension ?? 1536
    };
  }
  async deleteIndex(params) {
    await pinecone.deleteIndex(this.normalizeName(params.indexName));
  }
  async updateVector(params) {
    const index = this.getIndex(params.indexName);
    await index.update({
      id: params.id,
      metadata: params.update.metadata,
      values: params.update.vector
    });
  }
  async deleteVector(params) {
    const index = this.getIndex(params.indexName);
    await index.deleteOne(params.id);
  }
}
const pineconeVector = new PineconeMastraVector();

const storage = new PostgresStore({
  connectionString: process.env.DATABASE_URL
});

const memoryWithVector = new Memory({
  embedder: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
    dimensions: 1536
  }),
  storage,
  vector: pineconeVector,
  options: {
    semanticRecall: {
      scope: "resource",
      messageRange: 10,
      topK: 3
    },
    lastMessages: 10
  }
});

const createConnection = () => drizzle(process.env.DATABASE_URL ?? "");

const users = pgTable("users", {
  id: uuid("id").primaryKey().notNull(),
  name: text("name").default("").notNull(),
  email: text("email").default("").notNull(),
  thumbnail: text("thumbnail").default(""),
  password: text("password").default("").notNull(),
  sectorId: uuid("sector_id").references(() => sectors.id),
  type: varchar("type", { enum: ["system", "user", "superuser"] }).notNull().default("user")
});
const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().notNull(),
  name: text("name").notNull()
});
const settings = pgTable("settings", {
  id: uuid("id").primaryKey().notNull(),
  wabaId: text("waba_id").notNull(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, {
    onDelete: "cascade"
  })
});
const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  permissions: text("permissions").array().notNull().default([])
});
const sectors = pgTable("sectors", {
  id: uuid("id").primaryKey().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id)
});
const contacts = pgTable("contacts", {
  phone: varchar("phone", { length: 15 }).notNull().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  thumbnail: text("thumbnail")
});
const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().notNull(),
  channel: text("channel").notNull(),
  sectorId: uuid("sector_id").references(() => sectors.id),
  contactPhone: varchar("contact_phone", { length: 15 }).references(
    () => contacts.phone
  ),
  attendantId: uuid("attendant_id").references(() => users.id),
  status: varchar("status", {
    length: 10,
    enum: ["open", "closed", "expired", "waiting"]
  }).notNull(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  openedAt: integer("opened_at")
});
const messages = pgTable("messages", {
  id: text("id").primaryKey().notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at").notNull(),
  viewedAt: integer("viewed_at"),
  type: varchar("type", { enum: ["text", "audio", "image"], length: 10 }),
  status: text("status", { enum: ["sent", "senting", "viewed", "delivered"] }).default("senting").notNull(),
  conversationId: uuid("conversation_id").references(() => conversations.id, {
    onDelete: "cascade",
    onUpdate: "cascade"
  }),
  senderType: varchar("sender_type", {
    length: 10,
    enum: ["attendant", "contact"]
  }),
  senderName: text("sender_name").notNull().default(""),
  senderId: text("sender_id").notNull(),
  internal: boolean("internal").notNull().default(false)
});
const clients = pgTable("clients", {
  id: uuid("id").primaryKey().notNull(),
  contactPhone: varchar("contact_phone", { length: 15 }).references(
    () => contacts.phone
  ),
  addressId: uuid("address_id").references(() => addresses.id)
});
const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().notNull(),
  street: text("street").notNull(),
  number: varchar("number", { length: 10 }).notNull(),
  neighborhood: text("neighborhood").notNull(),
  city: text("city").notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  country: text("country").notNull().default(""),
  note: text("note")
});
const products = pgTable("products", {
  id: text("id").primaryKey().notNull(),
  description: text("description").notNull(),
  code: text("code").notNull(),
  manufactory: text("manufactory").notNull(),
  price: integer("price").notNull().default(0),
  stock: integer("stock").notNull().default(0),
  promotionPrice: integer("promotion_price").default(0),
  promotionStart: timestamp("promotion_start"),
  promotionEnd: timestamp("promotion_end"),
  workspaceId: uuid("workspace_id").references(() => workspaces.id)
});
const productsOnCart = pgTable("products_on_cart", {
  id: uuid("id").primaryKey().notNull(),
  cartId: uuid("cart_id").references(() => carts.id, {
    onDelete: "cascade",
    onUpdate: "cascade"
  }).notNull(),
  productId: text("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull().default(1)
});
const carts = pgTable("carts", {
  id: uuid("id").primaryKey().notNull(),
  attendantId: uuid("attendant_id").references(() => users.id),
  clientId: uuid("client_id").references(() => clients.id),
  addressId: uuid("address_id").references(() => addresses.id),
  conversationId: uuid("conversation_id").references(() => conversations.id, {
    onDelete: "cascade",
    onUpdate: "cascade"
  }),
  status: varchar("status", {
    length: 10,
    enum: ["expired", "budget", "order", "canceled", "finished"]
  }).notNull().default("budget"),
  createdAt: integer("created_at").notNull(),
  orderedAt: integer("ordered_at"),
  expiredAt: integer("expired_at"),
  finishedAt: integer("finished_at"),
  canceledAt: integer("canceled_at"),
  paymentMethod: varchar("payment_method")
});

class Product {
  constructor(props) {
    this.id = props.id;
    this.description = props.description;
    this.code = props.code;
    this.manufactory = props.manufactory;
    this.price = props.price;
    this.stock = props.stock;
    this.promotionPrice = props.promotionPrice;
    this.promotionStart = props.promotionStart;
    this.promotionEnd = props.promotionEnd;
  }
  raw() {
    return {
      id: this.id,
      description: this.description,
      code: this.code,
      manufactory: this.manufactory,
      price: this.price,
      stock: this.stock,
      promotionPrice: this.promotionPrice,
      promotionStart: this.promotionStart,
      promotionEnd: this.promotionEnd
    };
  }
  static instance(props) {
    return new Product(props);
  }
}

class ProductsRepository {
  async listByIds(ids) {
    const db = createConnection();
    const list = await db.select().from(products).where(inArray(products.id, ids));
    await db.$client.end();
    return list.map((item) => ({
      ...item,
      price: item.price / 100,
      promotionPrice: item.promotionPrice ? item.promotionPrice / 100 : 0
    }));
  }
  async retrieve(id) {
    const db = createConnection();
    const [product] = await db.select().from(products).where(eq(products.id, id));
    await db.$client.end();
    if (!product) return null;
    return Product.instance({
      description: product.description,
      id: product.id,
      price: product.price,
      manufactory: product.manufactory,
      stock: product.stock,
      code: product.code,
      promotionEnd: product.promotionEnd,
      promotionPrice: product.promotionPrice,
      promotionStart: product.promotionStart
    });
  }
  async list(props) {
    const { page = 1, pageSize = 20, workspaceId, searchTerm} = props;
    const db = createConnection();
    const offset = page > 0 ? (page - 1) * pageSize : 0;
    const response = await db.select().from(products).where(
      searchTerm ? and(
        eq(products.workspaceId, workspaceId),
        ilike(products.description, `%${searchTerm}%`)
      ) : eq(products.workspaceId, workspaceId)
    ).orderBy(asc(products.description)).limit(pageSize).offset(offset);
    const totalRows = searchTerm ? (await db.select().from(products).where(
      and(
        eq(products.workspaceId, workspaceId),
        ilike(products.description, `%${searchTerm}%`)
      )
    )).length : await db.$count(products);
    const total = Math.ceil(totalRows / pageSize);
    await db.$client.end();
    return {
      products: response.map((item) => ({
        ...item,
        price: item.price / 100,
        promotionPrice: item.promotionPrice ? item.promotionPrice / 100 : 0
      })),
      total
    };
  }
  static instance() {
    return new ProductsRepository();
  }
}

const saveMessageOnThread = async (props) => {
  const thread = await memoryWithVector.getThreadById({
    threadId: props.threadId
  });
  if (!thread) {
    await memoryWithVector.createThread({
      resourceId: props.resourceId,
      saveThread: true,
      threadId: props.threadId
    });
  }
  await memoryWithVector.saveMessages({
    messages: [
      {
        id: crypto.randomUUID().toString(),
        content: JSON.stringify(props.content, null, 2),
        role: "tool",
        createdAt: /* @__PURE__ */ new Date(),
        type: "tool-result",
        threadId: props.threadId,
        resourceId: props.resourceId
      }
    ]
  });
};

const stockTool = createTool({
  id: "stock-tool",
  description: "use para verificar se o produto est\xE1 em estoque",
  inputSchema: z.object({
    query: z.string()
  }),
  async execute({ context, runtimeContext, threadId, resourceId }) {
    try {
      const { embedding } = await embed({
        model: azureEmbeddings.textEmbeddingModel("text-embedding-3-small", {
          dimensions: 1536
        }),
        value: context.query
      });
      const response = await pinecone.index(
        "products"
      ).namespace(runtimeContext.get("pinecone-namespace")).query({
        topK: 30,
        vector: embedding,
        includeMetadata: true
      });
      const vectorProducts = response.matches.map((m) => m.metadata);
      if (!vectorProducts.length) return [];
      const productsRepository = ProductsRepository.instance();
      const products = await productsRepository.listByIds(
        vectorProducts.map((i) => i?.id ?? "")
      );
      const result = products.filter((p) => p.stock > 0).sort((a, b) => a.price > b.price ? 1 : -1);
      await saveMessageOnThread({
        content: result,
        resourceId,
        threadId
      });
      return result;
    } catch (e) {
      console.log(e);
      return "";
    }
  }
});

export { ProductsRepository as P, conversations as a, clients as b, createConnection as c, contacts as d, carts as e, addresses as f, products as g, memberships as h, settings as i, stockTool as j, memoryWithVector as k, pineconeVector as l, messages as m, productsOnCart as p, sectors as s, users as u };
