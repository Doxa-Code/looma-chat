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
  upsert(conversation: Conversation, workspaceId: string): Promise<void>;
}

interface CartsRepository {
  retrieveOpenCartByConversationId(
    conversationId: string,
    workspaceId: string
  ): Promise<Cart | null>;
  upsert(cart: Cart, conversationId: string): Promise<void>;
}

type SendDataToQueueProps = {
  queueURL: string;
  data: string;
  workspaceId: string;
  operation: "cancelCart";
};

interface MessagingDriver {
  sendDataToQueue(props: SendDataToQueueProps): Promise<boolean>;
}

interface SettingsRepository {
  retrieveSettingsByWorkspaceId(workspaceId: string): Promise<Setting | null>;
}

export class CancelCart {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly cartsRepository: CartsRepository,
    private readonly messagingDriver: MessagingDriver,
    private readonly settingsRepository: SettingsRepository
  ) {}
  async execute(input: InputDTO) {
    const conversation = await this.conversationsRepository.retrieve(
      input.conversationId
    );
    if (!conversation) throw NotFound.throw("Conversation");

    const cart = await this.cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      input.workspaceId
    );

    if (!cart) throw NotFound.throw("Cart");

    cart.cancel(input.reason);

    const settings =
      await this.settingsRepository.retrieveSettingsByWorkspaceId(
        input.workspaceId
      );

    if (settings?.queueURL) {
      await this.messagingDriver.sendDataToQueue({
        queueURL: settings.queueURL,
        data: cart.id,
        workspaceId: input.workspaceId,
        operation: "cancelCart",
      });
    }

    conversation.close();

    await this.cartsRepository.upsert(cart, conversation.id);
    await this.conversationsRepository.upsert(conversation, input.workspaceId);

    return cart;
  }

  static instance() {
    return new CancelCart(
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
  reason?: string;
};
