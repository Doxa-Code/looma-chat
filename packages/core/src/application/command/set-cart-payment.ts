import { Cart } from "../../domain/entities/cart";
import { Conversation } from "../../domain/entities/conversation";
import { NotFound } from "../../domain/errors/not-found";
import {
  PaymentMethod,
  PaymentMethodValue,
} from "../../domain/value-objects/payment-method";
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
  upsert(cart: Cart, conversationId: string): Promise<void>;
}

export class SetCartPayment {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly cartsRepository: CartsRepository
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

    const paymentMethod = PaymentMethod.create(input.paymentMethod);

    cart.setPaymentMethod(paymentMethod);
    cart.setPaymentChange(input.paymentChange);

    await this.cartsRepository.upsert(cart, conversation.id);
    return cart;
  }

  static instance() {
    return new SetCartPayment(
      ConversationsDatabaseRepository.instance(),
      CartsDatabaseRepository.instance()
    );
  }
}

type InputDTO = {
  conversationId: string;
  workspaceId: string;
  paymentMethod: PaymentMethodValue;
  paymentChange?: number;
};
