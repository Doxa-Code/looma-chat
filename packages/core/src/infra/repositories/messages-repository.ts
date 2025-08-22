import { Message } from "../../domain/entities/message";
import { Sender, SenderType } from "../../domain/value-objects/sender";
import { eq } from "drizzle-orm";
import { createDatabaseConnection } from "../database";
import { messages } from "../database/schemas";

export class MessagesDatabaseRepository {
  private timestampToDate(timestamp: number) {
    return new Date(timestamp * 1000);
  }

  private dateToTimestamp(date: Date) {
    return Math.floor(date.getTime() / 1000);
  }

  async upsert(message: Message) {
    const db = createDatabaseConnection();

    const [oldMessage] = await db
      .select({ conversationId: messages.conversationId })
      .from(messages)
      .where(eq(messages.id, message.id));

    if (!oldMessage) return null;

    await db
      .insert(messages)
      .values({
        content: message.content,
        createdAt: this.dateToTimestamp(message.createdAt),
        id: message.id,
        senderId: message.sender.id,
        conversationId: oldMessage.conversationId,
        internal: message.internal,
        senderName: message.sender.name,
        senderType: message.sender?.type,
        status: message.status,
        type: message?.type,
        viewedAt: message.viewedAt
          ? this.dateToTimestamp(message.viewedAt)
          : null,
      })
      .onConflictDoUpdate({
        set: {
          content: message.content,
          createdAt: this.dateToTimestamp(message.createdAt),
          senderId: message.sender.id,
          conversationId: oldMessage.conversationId,
          internal: message.internal,
          senderName: message.sender.name,
          senderType: message.sender?.type,
          status: message.status,
          type: message?.type,
          viewedAt: message.viewedAt
            ? this.dateToTimestamp(message.viewedAt)
            : null,
        },
        target: messages.id,
      });

    return oldMessage.conversationId!;
  }

  async retrieve(messageId: string) {
    const db = createDatabaseConnection();
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId));

    if (!message) return null;

    return Message.instance({
      content: message.content,
      createdAt: this.timestampToDate(message.createdAt),
      id: message.id,
      internal: message.internal,
      sender: Sender.create(
        message.senderType as SenderType,
        message.senderId,
        message.senderName
      ),
      type: message?.type as Message.Type,
      status: message.status,
      viewedAt: message.viewedAt
        ? this.timestampToDate(message.viewedAt)
        : null,
    });
  }

  static instance() {
    return new MessagesDatabaseRepository();
  }
}
