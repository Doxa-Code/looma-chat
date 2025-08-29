import { Cart } from "../../domain/entities/cart";
import { Conversation } from "../../domain/entities/conversation";
import { NotFound } from "../../domain/errors/not-found";
import { Setting } from "../../domain/value-objects/setting";
import { SQSMessagingDriver } from "../../infra/drivers/messaging-driver";
import { CartsDatabaseRepository } from "../../infra/repositories/carts-repository";
import { ConversationsDatabaseRepository } from "../../infra/repositories/conversations-repository";
import { SettingsDatabaseRepository } from "../../infra/repositories/settings-repository";

interface ConversationsRepository {
  retrieve(id: string): Promise<Conversation | null>;
}

interface CartsRepository {
  retrieveOpenCartByConversationId(
    conversationId: string,
    workspaceId: string
  ): Promise<Cart | null>;
  upsert(cart: Cart, conversationId: string): Promise<void>;
}

type SendMessageToQueueProps = {
  queueUrl: string;
  body: string;
  groupId: string;
  messageId: string;
};

interface MessagingDriver {
  sendMessageToQueue(data: SendMessageToQueueProps): Promise<boolean>;
}

interface SettingsRepository {
  retrieveSettingsByWorkspaceId(workspaceId: string): Promise<Setting | null>;
}

export class CloseCart {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly cartsRepository: CartsRepository,
    private readonly messagingDriver: MessagingDriver,
    private readonly settingsRepository: SettingsRepository
  ) {}
  async execute(input: InputDTO) {
    const cart = await this.cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      input.workspaceId
    );

    if (!cart) throw NotFound.throw("Cart");

    const conversation = await this.conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) throw NotFound.throw("Conversation");

    cart.order();

    const settings =
      await this.settingsRepository.retrieveSettingsByWorkspaceId(
        input.workspaceId
      );

    if (settings?.queueURL) {
      await this.messagingDriver.sendMessageToQueue({
        body: JSON.stringify({
          data: {
            cart: cart.raw(),
            total: cart.total,
          },
          workspaceId: input.workspaceId,
          operation: "orderCart",
        }),
        groupId: "defaultGroup",
        messageId: crypto.randomUUID(),
        queueUrl: settings.queueURL,
      });
    }

    await this.cartsRepository.upsert(cart, conversation.id);

    return cart;
  }

  static instance() {
    return new CloseCart(
      ConversationsDatabaseRepository.instance(),
      CartsDatabaseRepository.instance(),
      SQSMessagingDriver.instance(),
      SettingsDatabaseRepository.instance()
    );
  }
}

type InputDTO = {
  conversationId: string;
  workspaceId: string;
};
