import { Cart } from "../../domain/entities/cart";
import { CartProduct } from "../../domain/entities/cart-product";
import { Client } from "../../domain/entities/client";
import { Conversation } from "../../domain/entities/conversation";
import { NotFound } from "../../domain/errors/not-found";
import { Product } from "../../domain/value-objects/product";
import { Setting } from "../../domain/value-objects/setting";
import { SQSMessagingDriver } from "../../infra/drivers/messaging-driver";
import { CartsDatabaseRepository } from "../../infra/repositories/carts-repository";
import { ClientsDatabaseRepository } from "../../infra/repositories/clients-repository";
import { ConversationsDatabaseRepository } from "../../infra/repositories/conversations-repository";
import { ProductsDatabaseRepository } from "../../infra/repositories/products-repository";
import { SettingsDatabaseRepository } from "../../infra/repositories/settings-repository";

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

interface ProductsRepository {
  retrieve(productId: string): Promise<Product | null>;
}

type SendDataToQueueProps = {
  queueURL: string;
  data: {
    cart: Cart.Raw;
    total: number;
  };
  workspaceId: string;
  operation: "upsertProduct";
};

interface MessagingDriver {
  sendDataToQueue(props: SendDataToQueueProps): Promise<boolean>;
}

interface SettingsRepository {
  retrieveSettingsByWorkspaceId(workspaceId: string): Promise<Setting | null>;
}

export class UpsertProductOnCart {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly clientsRepository: ClientsRepository,
    private readonly cartsRepository: CartsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly messagingDriver: MessagingDriver,
    private readonly settingsRepository: SettingsRepository
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

    const product = await this.productsRepository.retrieve(input.productId);

    if (!product) throw NotFound.throw("Product");

    const cartProduct = CartProduct.create({
      product,
      quantity: input.quantity,
    });

    cart.upsertProduct(cartProduct);

    await this.cartsRepository.upsert(cart, conversation.id);

    if (cart.status.is("order")) {
      const settings =
        await this.settingsRepository.retrieveSettingsByWorkspaceId(
          input.workspaceId
        );
      if (settings?.queueURL) {
        await this.messagingDriver.sendDataToQueue({
          queueURL: settings?.queueURL,
          data: {
            cart: cart.raw(),
            total: cart.total,
          },
          workspaceId: input.workspaceId,
          operation: "upsertProduct",
        });
      }
    }

    return cart;
  }

  static instance() {
    return new UpsertProductOnCart(
      ConversationsDatabaseRepository.instance(),
      ClientsDatabaseRepository.instance(),
      CartsDatabaseRepository.instance(),
      ProductsDatabaseRepository.instance(),
      SQSMessagingDriver.instance(),
      SettingsDatabaseRepository.instance()
    );
  }
}

type InputDTO = {
  conversationId: string;
  workspaceId: string;
  productId: string;
  quantity: number;
};
