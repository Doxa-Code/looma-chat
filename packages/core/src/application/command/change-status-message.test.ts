import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";
import { createDatabaseConnection } from "../../infra/database";
import {
  conversations,
  messages,
  contacts,
  users,
  workspaces,
} from "../../infra/database/schemas";
import { ChangeStatusMessage } from "./change-status-message";
import { MessagesDatabaseRepository } from "../../infra/repositories/messages-repository";
import { ConversationsDatabaseRepository } from "../../infra/repositories/conversations-repository";

describe("ChangeStatusMessage Integration Test", () => {
  const db = createDatabaseConnection();

  const workspaceId = uuid();
  const conversationId = uuid();
  const messageId = uuid();
  const contactPhone = "9999999993";

  beforeAll(async () => {
    // Criar workspace
    await db.insert(workspaces).values({
      id: workspaceId,
      name: "Test Workspace",
    });

    // Criar usuário
    const userId = uuid();
    await db.insert(users).values({
      id: userId,
      name: "Attendant Test",
      email: "attendant3@test.com",
      password: "1234",
    });

    // Criar contato
    await db.insert(contacts).values({
      phone: contactPhone,
      name: "Contact Test",
    });

    // Criar conversa vinculada à workspace
    await db.insert(conversations).values({
      id: conversationId,
      channel: "whatsapp",
      contactPhone,
      status: "open",
      workspaceId,
    });

    // Criar mensagem
    await db.insert(messages).values({
      id: messageId,
      conversationId,
      senderId: userId,
      senderType: "attendant",
      senderName: "Attendant Test",
      content: "Mensagem inicial",
      createdAt: Math.floor(Date.now() / 1000),
      type: "text",
      status: "delivered",
    });
  });

  afterAll(async () => {
    // Limpeza correta
    await db.delete(messages).where(eq(messages.id, messageId));
    await db.delete(conversations).where(eq(conversations.id, conversationId));
    await db.delete(contacts).where(eq(contacts.phone, contactPhone));
    await db.delete(users).where(eq(users.name, "Attendant Test"));
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
  });

  it("should update message status and return the conversation", async () => {
    const useCase = new ChangeStatusMessage(
      MessagesDatabaseRepository.instance(),
      ConversationsDatabaseRepository.instance()
    );

    const conversationAfterSent = await useCase.execute({
      messageId,
      status: "sent",
    });
    expect(conversationAfterSent).toBeDefined();

    const conversationAfterDelivered = await useCase.execute({
      messageId,
      status: "delivered",
    });
    expect(conversationAfterDelivered).toBeDefined();

    const conversationAfterRead = await useCase.execute({
      messageId,
      status: "read",
    });
    expect(conversationAfterRead).toBeDefined();

    // Confirmar status final no banco
    const [msg] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId));
    expect(msg?.status).toBe("viewed");
  });
});
