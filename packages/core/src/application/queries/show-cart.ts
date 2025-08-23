import { Cart } from "../../domain/entities/cart";
import { Conversation } from "../../domain/entities/conversation";
import { Message } from "../../domain/entities/message";
import { NotFound } from "../../domain/errors/not-found";
import { MetaMessageDriver } from "../../infra/drivers/message-driver";
import { CartsDatabaseRepository } from "../../infra/repositories/carts-repository";
import { ConversationsDatabaseRepository } from "../../infra/repositories/conversations-repository";

interface ConversationsRepository {
  retrieve(id: string): Promise<Conversation | null>;
  upsert(conversation: Conversation, workspaceId: string): Promise<void>;
}

interface CartsRepository {
  retrieveOpenCartByConversationId(
    conversationId: string,
    workspaceId: string
  ): Promise<Cart | null>;
}

type SendMessageTextProps = {
  channel: string;
  to: string;
  content: string;
};

interface MessageDriver {
  sendMessageText(props: SendMessageTextProps): Promise<string | null>;
}

export class ShowCart {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly cartsRepository: CartsRepository,
    private readonly messageDriver: MessageDriver
  ) {}
  async execute(input: InputDTO) {
    const conversation = await this.conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) throw NotFound.throw("Conversation");

    let cart = await this.cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      input.workspaceId
    );

    if (!cart) throw NotFound.throw("Cart");

    const messageId = await this.messageDriver.sendMessageText({
      channel: conversation.channel,
      content: cart.formatted,
      to: conversation.contact.phone,
    });

    if (!messageId) return;

    const message = Message.create({
      content: cart.formatted,
      createdAt: new Date(),
      id: messageId,
      sender: conversation.attendant!,
      type: "text",
    });

    conversation.addMessage(message);

    await this.conversationsRepository.upsert(conversation, input.workspaceId);

    return {
      cart,
      conversation,
    };
  }

  static instance() {
    return new ShowCart(
      ConversationsDatabaseRepository.instance(),
      CartsDatabaseRepository.instance(),
      MetaMessageDriver.instance()
    );
  }
}

type InputDTO = {
  conversationId: string;
  workspaceId: string;
};
