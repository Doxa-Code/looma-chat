import { Conversation } from "@looma/core/domain/entities/conversation";
import { Message } from "@looma/core/domain/entities/message";
import { Attendant } from "@looma/core/domain/value-objects/attendant";
import { Contact } from "@looma/core/domain/value-objects/contact";
import { Sector } from "@looma/core/domain/value-objects/sector";
import { Sender } from "@looma/core/domain/value-objects/sender";
import { eq, or, sql } from "drizzle-orm";
import { createDatabaseConnection } from "../database";
import {
  contacts,
  conversations,
  messages,
  sectors,
  users,
} from "../database/schemas";

export class ConversationsRepository {
  private fullQuery(db: any) {
    return {
      where: (
        params: any
      ): Promise<(Conversation.Raw & { workspaceId: string })[]> =>
        db
          .select({
            id: conversations.id,
            channel: conversations.channel,
            contact: {
              phone: contacts.phone,
              name: contacts.name,
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
              name: users.name,
            },
            status: conversations.status,
            openedAt: conversations.openedAt,
            sector: {
              id: sectors.id,
              name: sectors.name,
            },
            workspaceId: conversations.workspaceId,
          })
          .from(conversations)
          .leftJoin(contacts, eq(conversations.contactPhone, contacts.phone))
          .leftJoin(messages, eq(messages.conversationId, conversations.id))
          .leftJoin(users, eq(users.id, conversations.attendantId))
          .leftJoin(sectors, eq(sectors.id, conversations.sectorId))
          .where(params)
          .groupBy(
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
          ),
    };
  }

  private toConversation(conversation: any) {
    return Conversation.instance({
      channel: conversation.channel,
      attendant: conversation.attendant
        ? Attendant.create(
            conversation.attendant?.id,
            conversation.attendant?.name
          )
        : null,
      contact: Contact.create(
        conversation.contact!.phone,
        conversation.contact!.name
      ),
      id: conversation.id,
      messages: (
        conversation.messages as (Message.Raw & {
          viewedAt: number | null;
          createdAt: number;
        })[]
      )?.map((m) =>
        Message.instance({
          content: m.content,
          createdAt: this.timestampToDate(m.createdAt),
          id: m.id,
          internal: !!m.internal,
          sender: Sender.create(m.sender!?.type, m.sender!.id, m.sender.name),
          type: m?.type,
          status: m.status,
          viewedAt: m.viewedAt ? this.timestampToDate(m.viewedAt) : null,
        })
      ),
      openedAt: conversation.openedAt
        ? this.timestampToDate(conversation.openedAt)
        : null,
      sector: conversation.sector
        ? Sector.create(conversation.sector.name, conversation.sector.id)
        : null,
      status: conversation.status,
    });
  }

  private dateToTimestamp(date: Date) {
    return Math.floor(date.getTime() / 1000);
  }

  private timestampToDate(timestamp: number) {
    return new Date(timestamp * 1000);
  }

  async retrieve(id: string): Promise<Conversation | null> {
    if (!id) return null;

    const db = createDatabaseConnection();

    const [conversation] = await this.fullQuery(db).where(
      eq(conversations.id, id)
    );

    if (!conversation) return null;

    return this.toConversation(conversation);
  }

  async retrieveRaw(
    id: string
  ): Promise<(Conversation.Raw & { workspaceId: string }) | null> {
    if (!id) return null;

    const db = createDatabaseConnection();

    const [conversation] = await this.fullQuery(db).where(
      eq(conversations.id, id)
    );

    if (!conversation) return null;

    return conversation;
  }

  async retrieveByContactPhone(phone: string): Promise<Conversation | null> {
    if (!phone) return null;

    const db = createDatabaseConnection();

    const [conversation] = await this.fullQuery(db).where(
      eq(conversations.contactPhone, phone)
    );

    if (!conversation) return null;

    return this.toConversation(conversation);
  }

  async listBySectorAndAttendantId(
    attendantId: string,
    sectorId?: string
  ): Promise<Conversation[]> {
    if (!attendantId) return [];

    const db = createDatabaseConnection();

    const list = await this.fullQuery(db).where(
      sectorId
        ? or(
            eq(conversations.sectorId, sectorId),
            eq(conversations.attendantId, attendantId)
          )
        : eq(conversations.attendantId, attendantId)
    );

    return list.map((c) => this.toConversation(c));
  }

  async list(workspaceId: string): Promise<Conversation[]> {
    if (!workspaceId) return [];

    const db = createDatabaseConnection();
    const list = await this.fullQuery(db).where(
      eq(conversations.workspaceId, workspaceId)
    );

    return list.map((c) => this.toConversation(c));
  }

  async upsert(conversation: Conversation, workspaceId: string) {
    const db = createDatabaseConnection();
    await db.transaction(async (tx) => {
      await tx
        .insert(conversations)
        .values({
          id: conversation.id,
          channel: conversation.channel,
          openedAt: conversation.openedAt
            ? this.dateToTimestamp(conversation.openedAt)
            : null,
          status: conversation.status,
          workspaceId,
          attendantId: conversation.attendant?.id,
          contactPhone: conversation.contact.phone,
          sectorId: conversation.sector?.id,
        })
        .onConflictDoUpdate({
          set: {
            channel: conversation.channel,
            openedAt: conversation.openedAt
              ? this.dateToTimestamp(conversation.openedAt)
              : null,
            status: conversation.status,
            workspaceId,
            attendantId: conversation.attendant?.id,
            contactPhone: conversation.contact.phone,
            sectorId: conversation.sector?.id,
          },
          target: conversations.id,
        });

      await Promise.all(
        conversation.messages.map(async (m) => {
          await tx
            .insert(messages)
            .values({
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
              status: m.status,
            })
            .onConflictDoUpdate({
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
                status: m.status,
              },
              target: messages.id,
            });
        })
      );
    });
  }

  static instance() {
    return new ConversationsRepository();
  }
}
