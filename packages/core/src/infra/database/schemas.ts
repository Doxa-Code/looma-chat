import {
  boolean,
  foreignKey,
  integer,
  PgSchema,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
  vector,
} from "drizzle-orm/pg-core";

const schemas =
  process.env.NODE_ENV === "production"
    ? ({ table: pgTable } as unknown as PgSchema)
    : pgSchema("development");

export const users = schemas.table("users", {
  id: uuid("id").primaryKey().notNull(),
  name: text("name").default("").notNull(),
  email: text("email").unique().notNull(),
  thumbnail: text("thumbnail").default(""),
  password: text("password").default("").notNull(),
  sectorId: uuid("sector_id").references(() => sectors.id),
  type: varchar("type", { enum: ["system", "user", "superuser"] })
    .notNull()
    .default("user"),
});

export const workspaces = schemas.table("workspaces", {
  id: uuid("id").primaryKey().notNull(),
  name: text("name").notNull(),
});

export const settings = schemas.table("settings", {
  id: uuid("id").primaryKey().notNull(),
  wabaId: text("waba_id").notNull().default(""),
  phoneId: text("phone_id").notNull().default(""),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, {
      onDelete: "cascade",
    }),
  attendantName: text("attendant_name").notNull().default(""),
  businessName: text("business_name").notNull().default(""),
  locationAvailable: text("location_available").notNull().default(""),
  openingHours: text("opening_hours").notNull().default(""),
  paymentMethods: text("payment_methods").notNull().default(""),
  vectorNamespace: text("vector_namespace").notNull().default(""),
  knowledgeBase: text("knowledge_base").notNull().default(""),
  aiEnabled: boolean("ai_enabled").notNull().default(true),
  queueURL: text("queue_url").notNull().default(""),
});

export const memberships = schemas.table("memberships", {
  id: uuid("id").primaryKey().notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  permissions: text("permissions").array().notNull().default([]),
});

export const sectors = schemas.table("sectors", {
  id: uuid("id").primaryKey().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id),
});

export const contacts = schemas.table("contacts", {
  phone: varchar("phone", { length: 15 }).notNull().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  thumbnail: text("thumbnail"),
});

export const conversations = schemas.table(
  "conversations",
  {
    id: uuid("id").notNull().unique(),
    channel: text("channel").notNull(),
    sectorId: uuid("sector_id").references(() => sectors.id),
    contactPhone: varchar("contact_phone", { length: 15 }).references(
      () => contacts.phone
    ),
    attendantId: uuid("attendant_id").references(() => users.id),
    status: varchar("status", {
      length: 10,
      enum: ["open", "closed", "expired", "waiting"],
    }).notNull(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id)
      .notNull(),
    openedAt: integer("opened_at"),
    closedAt: integer("closed_at"),
  },
  (table) => [primaryKey({ columns: [table.contactPhone, table.channel] })]
);

export const messages = schemas.table(
  "messages",
  {
    id: text("id").primaryKey().notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at").notNull(),
    viewedAt: integer("viewed_at"),
    type: varchar("type", { enum: ["text", "audio", "image"], length: 10 }),
    status: text("status", { enum: ["sent", "senting", "viewed", "delivered"] })
      .default("senting")
      .notNull(),
    senderType: varchar("sender_type", {
      length: 10,
      enum: ["attendant", "contact"],
    }),
    senderName: text("sender_name").notNull().default(""),
    senderId: text("sender_id").notNull(),
    internal: boolean("internal").notNull().default(false),
    contactPhone: varchar("contact_phone", { length: 15 }).notNull(),
    channel: text("channel").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.contactPhone, table.channel],
      foreignColumns: [conversations.contactPhone, conversations.channel],
      name: "messages_conversation_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ]
);

export const clients = schemas.table("clients", {
  id: uuid("id").primaryKey().notNull(),
  partnerId: text("partner_id"),
  contactPhone: varchar("contact_phone", { length: 15 }).references(
    () => contacts.phone
  ),
  addressId: uuid("address_id").references(() => addresses.id),
  workspaceId: uuid("workspace_id").references(() => workspaces.id),
});

export const addresses = schemas.table("addresses", {
  id: uuid("id").primaryKey().notNull(),
  street: text("street").notNull(),
  number: varchar("number", { length: 10 }).notNull(),
  neighborhood: text("neighborhood").notNull(),
  city: text("city").notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  country: text("country").notNull().default(""),
  note: text("note"),
});

export const products = schemas.table(
  "products",
  {
    id: text("id").notNull(),
    description: text("description").notNull(),
    code: text("code"),
    manufactory: text("manufactory").notNull(),
    price: integer("price").notNull().default(0),
    stock: integer("stock").notNull().default(0),
    embedding: vector("embedding", {
      dimensions: 1536,
    }),
    promotionPrice: integer("promotion_price").default(0),
    promotionStart: timestamp("promotion_start"),
    promotionEnd: timestamp("promotion_end"),
    workspaceId: uuid("workspace_id").references(() => workspaces.id),
  },
  (table) => [primaryKey({ columns: [table.id, table.workspaceId] })]
);

export const productsOnCart = schemas.table("products_on_cart", {
  id: uuid("id").primaryKey().notNull(),
  cartId: uuid("cart_id")
    .references(() => carts.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  productId: text("product_id").notNull(),
  description: text("description").notNull().default(""),
  price: integer("price").notNull().default(0),
  realPrice: integer("real_price").notNull().default(0),
  quantity: integer("quantity").notNull().default(1),
});

export const carts = schemas.table(
  "carts",
  {
    id: uuid("id").primaryKey().notNull(),
    attendantId: uuid("attendant_id").references(() => users.id),
    clientId: uuid("client_id").references(() => clients.id),
    addressId: uuid("address_id").references(() => addresses.id),
    status: varchar("status", {
      length: 10,
      enum: [
        "expired",
        "processing",
        "budget",
        "shipped",
        "order",
        "cancelled",
        "finished",
      ],
    })
      .notNull()
      .default("budget"),
    createdAt: integer("created_at").notNull(),
    orderedAt: integer("ordered_at"),
    expiredAt: integer("expired_at"),
    finishedAt: integer("finished_at"),
    canceledAt: integer("canceled_at"),
    shippedAt: integer("shipped_at"),
    processingAt: integer("processing_at"),
    cancelReason: text("cancel_reason"),
    paymentMethod: text("payment_method"),
    paymentChange: integer("payment_change"),
    contactPhone: varchar("contact_phone", { length: 15 }).notNull(),
    channel: text("channel").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.contactPhone, table.channel],
      foreignColumns: [conversations.contactPhone, conversations.channel],
      name: "messages_conversation_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ]
);

export const messageBuffer = schemas.table("message_buffer", {
  id: text("message_id").primaryKey().notNull(),
  content: text("content").notNull(),
  sender: text("sender").notNull(),
  timestamp: integer("timestamp").notNull(),
});

export const toolsResultsBuffer = schemas.table("tools_results_buffer", {
  id: uuid("id").primaryKey().defaultRandom(),
  toolName: text("toolName").notNull(),
  contact: text("contact").notNull(),
  channel: text("channel").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});
