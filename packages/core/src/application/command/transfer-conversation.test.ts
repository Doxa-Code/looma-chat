import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabaseConnection } from "../../infra/database";
import { ConversationsDatabaseRepository } from "../../infra/repositories/conversations-repository";
import { SectorsDatabaseRepository } from "../../infra/repositories/sectors-respository";
import { UsersDatabaseRepository } from "../../infra/repositories/users-repository";
import {
  contacts,
  conversations,
  messages,
  sectors,
  users,
  workspaces,
} from "../../infra/database/schemas";
import { Conversation } from "../../domain/entities/conversation";
import { Contact } from "../../domain/value-objects/contact";
import { TransferConversation } from "./transfer-conversation";
import { Sector } from "../../domain/value-objects/sector";
import { Attendant } from "../../domain/value-objects/attendant";

describe("TransferConversation - Integration", () => {
  const db = createDatabaseConnection();
  const conversationsRepo = new ConversationsDatabaseRepository();
  const sectorsRepo = new SectorsDatabaseRepository();
  const usersRepo = new UsersDatabaseRepository();

  const workspaceId = randomUUID();
  const initialSectorId = randomUUID();
  const newSectorId = randomUUID();
  const initialAttendantId = randomUUID();
  const newAttendantId = randomUUID();
  const contactPhone = "5511999299999";

  let conversationId: string;

  beforeAll(async () => {
    await db
      .insert(workspaces)
      .values({
        id: workspaceId,
        name: "Workspace Test",
      })
      .onConflictDoNothing();

    await db
      .insert(contacts)
      .values({
        phone: contactPhone,
        name: "Cliente Teste",
      })
      .onConflictDoNothing();

    const sector = Sector.create("Atendimento Inicial", initialSectorId);

    await db.insert(sectors).values({
      ...sector,
      workspaceId,
    });

    await db.insert(sectors).values({
      id: newSectorId,
      name: "Suporte Avançado",
      workspaceId,
    });

    const attendant = Attendant.create(initialAttendantId, "Atendente Inicial");

    await db.insert(users).values({
      id: initialAttendantId,
      name: "Atendente Inicial",
      email: `atendente-inicial+${randomUUID()}@teste.com`,
      type: "system",
      sectorId: initialSectorId,
    });

    await db.insert(users).values({
      id: newAttendantId,
      name: "Atendente Novo",
      email: `atendente-novo+${randomUUID()}@teste.com`,
      type: "system",
      sectorId: newSectorId,
    });

    const initialConversation = Conversation.create(
      Contact.create(contactPhone, "Cliente Teste"),
      "whatsapp"
    );

    initialConversation.transferToSector(sector);
    initialConversation.attributeAttendant(attendant);

    await conversationsRepo.upsert(initialConversation, workspaceId);

    conversationId = initialConversation.id;
  });

  afterAll(async () => {
    await db
      .delete(messages)
      .where(eq(messages.conversationId, conversationId));
    await db.delete(conversations).where(eq(conversations.id, conversationId));
    await db.delete(contacts).where(eq(contacts.phone, contactPhone));
    await db.delete(users).where(eq(users.id, initialAttendantId));
    await db.delete(users).where(eq(users.id, newAttendantId));
    await db.delete(sectors).where(eq(sectors.workspaceId, workspaceId));
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
  });

  it("deve transferir a conversa para outro setor e atendente", async () => {
    const useCase = new TransferConversation(
      conversationsRepo,
      sectorsRepo,
      usersRepo
    );

    const beforeTransfer = await conversationsRepo.retrieve(conversationId);
    expect(beforeTransfer).not.toBeNull();

    expect(beforeTransfer?.attendant?.id).toBe(initialAttendantId);

    await useCase.execute({
      conversationId,
      sectorId: newSectorId,
      attendantId: newAttendantId,
      workspaceId,
    });

    const afterTransfer = await conversationsRepo.retrieve(conversationId);

    expect(afterTransfer).not.toBeNull();

    expect(afterTransfer?.sector?.id).toBe(newSectorId);
    expect(afterTransfer?.sector?.name).toBe("Suporte Avançado");

    expect(afterTransfer?.attendant?.id).toBe(newAttendantId);
    expect(afterTransfer?.attendant?.name).toBe("Atendente Novo");

    expect(beforeTransfer?.attendant?.id).not.toBe(
      afterTransfer?.attendant?.id
    );
  });

  it("não deve alterar a conversa se o setor não existir", async () => {
    const useCase = new TransferConversation(
      conversationsRepo,
      sectorsRepo,
      usersRepo
    );

    const result = await useCase.execute({
      conversationId,
      sectorId: randomUUID(),
      attendantId: newAttendantId,
      workspaceId,
    });

    expect(result).toBeUndefined();

    const unchangedConversation =
      await conversationsRepo.retrieve(conversationId);
    expect(unchangedConversation?.sector?.id).toBe(newSectorId);
  });

  it("não deve alterar a conversa se o atendente não existir", async () => {
    const useCase = new TransferConversation(
      conversationsRepo,
      sectorsRepo,
      usersRepo
    );

    const result = await useCase.execute({
      conversationId,
      sectorId: newSectorId,
      attendantId: randomUUID(),
      workspaceId,
    });

    expect(result).toBeUndefined();

    const unchangedConversation =
      await conversationsRepo.retrieve(conversationId);
    expect(unchangedConversation?.attendant?.id).toBe(newAttendantId);
  });
});
