import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";
import { createDatabaseConnection } from "../../infra/database";
import {
  workspaces,
  users,
  contacts,
  conversations,
  messages,
} from "../../infra/database/schemas";
import { MessageReceived, MessagePayload } from "./message-received";
import { ContactsDatabaseRepository } from "../../infra/repositories/contacts-repository";
import { ConversationsDatabaseRepository } from "../../infra/repositories/conversations-repository";

describe("MessageReceived Integration Test", () => {
  const db = createDatabaseConnection();

  const workspaceId = uuid();
  const contactPhone = "999999992";
  const contactName = "Cliente Teste";
  const messageId = uuid();
  const attendantId = uuid();

  beforeAll(async () => {
    await db
      .insert(workspaces)
      .values({ id: workspaceId, name: "Test Workspace" });
    await db.insert(users).values({
      id: attendantId,
      name: "Attendant",
      email: "attendant@test.com",
      password: "1234",
    });
  });

  afterAll(async () => {
    await db.delete(messages).where(eq(messages.id, messageId));
    await db
      .delete(conversations)
      .where(eq(conversations.contactPhone, contactPhone));
    await db.delete(contacts).where(eq(contacts.phone, contactPhone));
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    await db.delete(users).where(eq(users.id, attendantId));
  });

  it("should create a contact, conversation and message", async () => {
    const useCase = new MessageReceived(
      ContactsDatabaseRepository.instance(),
      ConversationsDatabaseRepository.instance()
    );

    const messagePayload: MessagePayload = {
      id: messageId,
      type: "text",
      content: "Olá, teste!",
      timestamp: Math.floor(Date.now() / 1000),
    };

    const result = await useCase.execute({
      channel: "whatsapp",
      contactPhone,
      contactName,
      messagePayload,
      workspaceId,
    });

    expect(result).toBeDefined();
    expect(result?.conversation.contact.phone).toBe(contactPhone);
    expect(result?.conversation.messages.length).toBe(1);
    expect(result?.conversation.messages[0]?.content).toBe("Olá, teste!");

    const result2 = await useCase.execute({
      channel: "whatsapp",
      contactPhone,
      contactName,
      messagePayload,
      workspaceId,
    });

    expect(result2).toBeFalsy();
  });
});
