import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { createDatabaseConnection } from "../../infra/database";
import {
  addresses,
  clients,
  contacts,
  conversations,
  products,
  settings,
  users,
  workspaces,
} from "../../infra/database/schemas";
import { SQSMessagingDriver } from "../../infra/drivers/messaging-driver";
import { CartsDatabaseRepository } from "../../infra/repositories/carts-repository";
import { ClientsDatabaseRepository } from "../../infra/repositories/clients-repository";
import { ConversationsDatabaseRepository } from "../../infra/repositories/conversations-repository";
import { ProductsDatabaseRepository } from "../../infra/repositories/products-repository";
import { SettingsDatabaseRepository } from "../../infra/repositories/settings-repository";
import { UpsertProductOnCart } from "./upsert-product-on-cart";

describe("UpsertProductOnCart Integration Test", () => {
  const db = createDatabaseConnection();

  // ids temporários
  const workspaceId = uuid();
  const attendantId = uuid();
  const conversationId = uuid();
  const clientId = uuid();
  const addressId = uuid();
  const productId = "product-123";

  const messagingDriver = {
    sendMessageToQueue: vi.fn(),
  } as unknown as SQSMessagingDriver;

  beforeAll(async () => {
    // Criar workspace, user, address, contact, conversation, product
    await db
      .insert(workspaces)
      .values({ id: workspaceId, name: "Test Workspace" });
    await db.insert(users).values({
      id: attendantId,
      name: "Attendant",
      email: "attendant2@test.com",
      password: "1234",
    });
    await db.insert(addresses).values({
      id: addressId,
      street: "Rua Teste",
      number: "123",
      neighborhood: "Bairro",
      city: "Cidade",
      state: "SP",
      zipCode: "12345-678",
      country: "Brasil",
    });
    await db
      .insert(contacts)
      .values({ phone: "999999999", name: "Cliente Teste" });
    await db.insert(clients).values({
      id: clientId,
      contactPhone: "999999999",
      addressId,
      workspaceId,
    });
    await db.insert(conversations).values({
      id: conversationId,
      channel: "whatsapp",
      contactPhone: "999999999",
      attendantId,
      status: "open",
      workspaceId,
    });
    await db.insert(products).values({
      id: productId,
      description: "Produto Teste",
      manufactory: "Manufatura",
      price: 1000,
      stock: 10,
      workspaceId,
    });
    await db.insert(settings).values({
      id: uuid(),
      workspaceId,
      wabaId: "",
      phoneId: "",
      attendantName: "Attendant",
      businessName: "Business",
      locationAvailable: "",
      openingHours: "",
      paymentMethods: "",
      vectorNamespace: "",
      knowledgeBase: "",
      aiEnabled: true,
      queueURL: "https://queue.test",
    });
  });

  afterAll(async () => {
    await db.delete(products).where(eq(products.id, productId));
    await db.delete(conversations).where(eq(conversations.id, conversationId));
    await db.delete(clients).where(eq(clients.id, clientId));
    await db.delete(contacts).where(eq(contacts.phone, "999999999"));
    await db.delete(users).where(eq(users.id, attendantId));
    await db.delete(addresses).where(eq(addresses.id, addressId));
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    await db.delete(settings).where(eq(settings.workspaceId, workspaceId));
  });

  it("should upsert a product on cart", async () => {
    const useCase = new UpsertProductOnCart(
      ConversationsDatabaseRepository.instance(),
      ClientsDatabaseRepository.instance(),
      CartsDatabaseRepository.instance(),
      ProductsDatabaseRepository.instance(),
      messagingDriver,
      SettingsDatabaseRepository.instance()
    );

    const cart = await useCase.execute({
      conversationId,
      workspaceId,
      productId,
      quantity: 2,
    });

    expect(cart).toBeDefined();
    expect(cart.products.length).toBe(1);
    expect(cart.products[0]?.id).toBe(productId);
    expect(cart.products[0]?.quantity).toBe(2);

    // Confirma se a fila foi chamada
    expect(messagingDriver.sendMessageToQueue).not.toHaveBeenCalled();
  });
});
