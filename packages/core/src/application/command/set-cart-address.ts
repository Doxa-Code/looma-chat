import { Cart } from "../../domain/entities/cart";
import { Client } from "../../domain/entities/client";
import { Conversation } from "../../domain/entities/conversation";
import { NotFound } from "../../domain/errors/not-found";
import { Address, AddressRaw } from "../../domain/value-objects/address";
import { CartsDatabaseRepository } from "../../infra/repositories/carts-repository";
import { ClientsDatabaseRepository } from "../../infra/repositories/clients-repository";
import { ConversationsDatabaseRepository } from "../../infra/repositories/conversations-repository";

interface ConversationsRepository {
  retrieve(id: string): Promise<Conversation | null>;
  upsert(conversation: Conversation, workspaceId: string): Promise<void>;
}

interface ClientsRepository {
  retrieveByPhone(phone: string, workspaceId: string): Promise<Client | null>;
  upsert(client: Client, workspaceId: string): Promise<void>;
}

interface CartsRepository {
  retrieveOpenCartByConversationId(
    conversationId: string,
    workspaceId: string
  ): Promise<Cart | null>;
  upsert(cart: Cart, conversationId: string): Promise<void>;
}

export class SetCartAddress {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly cartsRepository: CartsRepository,
    private readonly clientsRepository: ClientsRepository
  ) {}
  async execute(input: InputDTO) {
    const conversation = await this.conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) throw NotFound.throw("Conversation");

    let client = await this.clientsRepository.retrieveByPhone(
      conversation.contact.phone,
      input.workspaceId
    );

    if (!client) {
      client = Client.create(conversation.contact);

      await this.clientsRepository.upsert(client, input.workspaceId);
    }

    let cart = await this.cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      input.workspaceId
    );

    if (!cart) {
      cart = Cart.create({
        attendant: conversation.attendant!,
        client,
      });
    }

    const newAddress = Address.create(input.address);

    if (!client.address) {
      client.setAddress(newAddress);
      await this.clientsRepository.upsert(client, input.workspaceId);
    }

    cart.address = newAddress;

    await this.cartsRepository.upsert(cart, conversation.id);
    return cart;
  }

  static instance() {
    return new SetCartAddress(
      ConversationsDatabaseRepository.instance(),
      CartsDatabaseRepository.instance(),
      ClientsDatabaseRepository.instance()
    );
  }
}

type InputDTO = {
  conversationId: string;
  workspaceId: string;
  address: AddressRaw;
};
