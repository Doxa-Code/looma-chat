import { c as createDatabaseConnection, a as addresses, d as contacts, e as clients, f as conversations, g as sectors, u as users, m as messages } from './schemas.mjs';
import { eq, and, sql, ne, or } from 'drizzle-orm';

class Address {
  constructor(id, street, number, neighborhood, city, state, zipCode, _country, note) {
    this.id = id;
    this.street = street;
    this.number = number;
    this.neighborhood = neighborhood;
    this.city = city;
    this.state = state;
    this.zipCode = zipCode;
    this._country = _country;
    this.note = note;
  }
  get country() {
    return this._country ?? "BR";
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
      "zipCode"
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
    return `${this.street}, ${this.number ? `${this.number},` : ""} ${this.neighborhood}, ${this.city} - ${this.state}, ${this.zipCode}`;
  }
}

class InvalidCreation extends Error {
  constructor() {
    super("Cria\xE7\xE3o inv\xE1lida");
    this.name = "InvalidCreation";
  }
  static throw() {
    return new InvalidCreation();
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

class Client {
  id;
  contact;
  address;
  constructor(props) {
    this.id = props.id;
    this.contact = props.contact;
    this.address = props.address;
  }
  raw() {
    return {
      id: this.id,
      contact: this.contact.raw(),
      address: this.address?.raw?.() ?? null
    };
  }
  setAddress(address) {
    this.address = address;
  }
  static instance(props) {
    return new Client({
      address: props.address ? Address.create(props.address) : null,
      contact: Contact.create(props.contact.phone, props.contact.name),
      id: props.id
    });
  }
  static create(contact) {
    return new Client({
      address: null,
      contact,
      id: crypto.randomUUID().toString()
    });
  }
}

class ClientsDatabaseRepository {
  async retrieveByPhone(phone, workspaceId) {
    const db = createDatabaseConnection();
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
    }).from(clients).innerJoin(contacts, eq(contacts.phone, clients.contactPhone)).leftJoin(addresses, eq(addresses.id, clients.addressId)).where(
      and(
        eq(clients.contactPhone, phone),
        eq(clients.workspaceId, workspaceId)
      )
    );
    if (!client) return null;
    return Client.instance({
      id: client.id,
      address: client.address ? Address.create(client.address) : null,
      contact: Contact.create(client.contact.phone, client.contact.name)
    });
  }
  async upsert(input, workspaceId, partnerId) {
    const db = createDatabaseConnection();
    const client = partnerId ? (await db.select({ id: clients.id, address: addresses, contact: contacts }).from(clients).innerJoin(contacts, eq(contacts.phone, clients.contactPhone)).leftJoin(addresses, eq(addresses.id, clients.addressId)).where(eq(clients.partnerId, partnerId)))?.[0] ?? input : input;
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
        addressId: addressCreated?.id,
        contactPhone: contactCreated?.[0]?.phone,
        partnerId,
        workspaceId
      }).onConflictDoUpdate({
        set: {
          addressId: addressCreated?.id,
          contactPhone: contactCreated?.[0]?.phone,
          workspaceId
        },
        target: clients.id
      }).returning();
    });
    return;
  }
  static instance() {
    return new ClientsDatabaseRepository();
  }
}

class NotFound extends Error {
  constructor(resource) {
    super(resource ? `Not found: ${resource}` : "Not found");
    this.name = "NotFound";
  }
  static throw(resource) {
    return new NotFound(resource);
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

class Conversation {
  id;
  contact;
  _messages;
  attendant;
  status;
  openedAt;
  closedAt;
  sector;
  channel;
  constructor(props) {
    this.id = props.id;
    this.contact = props.contact;
    this.messages = props.messages;
    this.attendant = props.attendant;
    this.status = props.status;
    this.openedAt = props.openedAt;
    this.sector = props.sector;
    this.channel = props.channel;
    this.closedAt = props.closedAt;
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
      teaser: this.teaser,
      closedAt: this.closedAt
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
      if (message.sender?.type === "attendant") return messages.reverse();
      messages.push(message);
    }
    return messages.reverse();
  }
  get teaser() {
    return this.messages.at(-1)?.type === "audio" ? "Audio" : this.messages.at(-1)?.type === "image" ? "Imagem" : this.messages.at(-1)?.content;
  }
  setChannel(channel) {
    this.channel = channel;
  }
  addMessage(message) {
    this._messages.set(message.id, message);
    if (this.status === "waiting" && message.sender?.type === "attendant") {
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
      (m) => m.status !== "viewed" && m.sender?.type === "contact"
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
  close() {
    this.status = "closed";
    this.closedAt = /* @__PURE__ */ new Date();
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
      channel,
      closedAt: null
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
  id;
  type;
  content;
  sender;
  createdAt;
  viewedAt;
  internal;
  status;
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
      content: props.content ?? "",
      createdAt: props.createdAt,
      id: props.id,
      sender: Sender.create(
        props.sender instanceof Attendant ? "attendant" : "contact",
        props.sender instanceof Attendant ? props.sender.id : props.sender.phone,
        props.sender.name
      ),
      type: props?.type,
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

class ConversationsDatabaseRepository {
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
                'type', ${messages?.type},
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
        closedAt: conversations.closedAt,
        sector: {
          id: sectors.id,
          name: sectors.name
        },
        workspaceId: conversations.workspaceId
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
          sender: Sender.create(m.sender?.type, m.sender.id, m.sender.name),
          type: m?.type,
          status: m.status,
          viewedAt: m.viewedAt ? this.timestampToDate(m.viewedAt) : null
        })
      ),
      openedAt: conversation.openedAt ? this.timestampToDate(conversation.openedAt) : null,
      closedAt: conversation.closedAt ? this.timestampToDate(conversation.closedAt) : null,
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
    const db = createDatabaseConnection();
    const [conversation] = await this.fullQuery(db).where(
      eq(conversations.id, id)
    );
    if (!conversation) return null;
    return this.toConversation(conversation);
  }
  async retrieveRaw(id) {
    if (!id) return null;
    const db = createDatabaseConnection();
    const [conversation] = await this.fullQuery(db).where(
      eq(conversations.id, id)
    );
    if (!conversation) return null;
    return conversation;
  }
  async retrieveByContactPhone(phone, channel) {
    if (!phone || !channel) return null;
    const db = createDatabaseConnection();
    const [conversation] = await this.fullQuery(db).where(
      and(
        eq(conversations.contactPhone, phone),
        eq(conversations.channel, channel),
        ne(conversations.status, "closed")
      )
    );
    if (!conversation) return null;
    return this.toConversation(conversation);
  }
  async listBySectorAndAttendantId(attendantId, workspaceId, sectorId) {
    if (!attendantId) return [];
    const db = createDatabaseConnection();
    const list = await this.fullQuery(db).where(
      and(
        eq(conversations.workspaceId, workspaceId),
        or(
          eq(conversations.status, "open"),
          eq(conversations.status, "waiting"),
          eq(conversations.status, "expired")
        ),
        sectorId ? or(
          eq(conversations.sectorId, sectorId),
          eq(conversations.attendantId, attendantId)
        ) : eq(conversations.attendantId, attendantId)
      )
    );
    return list.map((c) => this.toConversation(c));
  }
  async list(workspaceId) {
    if (!workspaceId) return [];
    const db = createDatabaseConnection();
    const list = await this.fullQuery(db).where(
      and(
        eq(conversations.workspaceId, workspaceId),
        or(
          eq(conversations.status, "open"),
          eq(conversations.status, "waiting"),
          eq(conversations.status, "expired")
        )
      )
    );
    return list.map((c) => this.toConversation(c)).sort(
      (ca, cb) => ca?.lastMessage?.createdAt > cb?.lastMessage?.createdAt ? -1 : 1
    );
  }
  async upsert(conversation, workspaceId) {
    const db = createDatabaseConnection();
    await db.transaction(async (tx) => {
      await tx.insert(conversations).values({
        id: conversation.id,
        channel: conversation.channel,
        openedAt: conversation.openedAt ? this.dateToTimestamp(conversation.openedAt) : null,
        closedAt: conversation.closedAt ? this.dateToTimestamp(conversation.closedAt) : null,
        status: conversation.status,
        workspaceId,
        attendantId: conversation.attendant?.id,
        contactPhone: conversation.contact.phone,
        sectorId: conversation.sector?.id
      }).onConflictDoUpdate({
        set: {
          channel: conversation.channel,
          openedAt: conversation.openedAt ? this.dateToTimestamp(conversation.openedAt) : null,
          closedAt: conversation.closedAt ? this.dateToTimestamp(conversation.closedAt) : null,
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
            senderType: m.sender?.type,
            type: m?.type,
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
              senderType: m.sender?.type,
              type: m?.type,
              viewedAt: m.viewedAt ? this.dateToTimestamp(m.viewedAt) : null,
              status: m.status
            },
            target: messages.id
          });
        })
      );
    });
  }
  static instance() {
    return new ConversationsDatabaseRepository();
  }
}

export { Attendant as A, Client as C, InvalidCreation as I, Message as M, NotFound as N, Address as a, ConversationsDatabaseRepository as b, ClientsDatabaseRepository as c };
