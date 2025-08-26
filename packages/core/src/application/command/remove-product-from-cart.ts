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
  data: {
    cart: Cart.Raw;
    total: number;
    productId: string;
  };
  workspaceId: string;
  operation: "removeProduct";
};

interface MessagingDriver {
  sendDataToQueue(props: SendDataToQueueProps): Promise<boolean>;
}

interface SettingsRepository {
  retrieveSettingsByWorkspaceId(workspaceId: string): Promise<Setting | null>;
}

export class RemoveProductFromCart {
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

    if (!cart.hasProduct(input.productId))
      throw NotFound.throw(
        `produto com o id ${input.productId}, somente existe os seguintes produtos no carrinho: ${cart.products.map((p) => `id: ${p.id}, nome: ${p.description}`).join("\n")}. Tente remover com um id válido.`
      );

    cart.removeProduct(input.productId);

    await this.cartsRepository.upsert(cart, conversation.id);

    if (cart.status.is("order")) {
      const settings =
        await this.settingsRepository.retrieveSettingsByWorkspaceId(
          input.workspaceId
        );
      if (settings?.queueURL) {
        await this.messagingDriver.sendDataToQueue({
          queueURL: settings.queueURL,
          data: {
            cart: cart.raw(),
            productId: input.productId,
            total: cart.total,
          },
          workspaceId: input.workspaceId,
          operation: "removeProduct",
        });
      }
    }

    return cart;
  }

  static instance() {
    return new RemoveProductFromCart(
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
  productId: string;
};
