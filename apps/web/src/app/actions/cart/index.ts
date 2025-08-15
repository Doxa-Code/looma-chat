"use server";
import { Cart } from "@looma/core/domain/entities/cart";
import { CartProduct } from "@looma/core/domain/entities/cart-product";
import { Client } from "@looma/core/domain/entities/client";
import { NotFound } from "@looma/core/domain/errors/not-found";
import { Address } from "@looma/core/domain/value-objects/address";
import { PaymentMethod } from "@looma/core/domain/value-objects/payment-method";
import { SQSMessagingDriver } from "@looma/core/infra/drivers/messaging-driver";
import { CartsRepository } from "@looma/core/infra/repositories/carts-repository";
import { ClientsRepository } from "@looma/core/infra/repositories/clients-repository";
import { ConversationsRepository } from "@looma/core/infra/repositories/conversations-repository";
import { ProductsRepository } from "@looma/core/infra/repositories/products-repository";
import z from "zod";
import { securityProcedure } from "./../procedure";

const conversationsRepository = ConversationsRepository.instance();
const cartsRepository = CartsRepository.instance();
const productsRepository = ProductsRepository.instance();
const clientsRepository = ClientsRepository.instance();

const messaging = SQSMessagingDriver.instance();

export const listCarts = securityProcedure([
  "view:carts",
  "manage:carts",
]).handler(async ({ ctx }) => {
  const carts = await cartsRepository.list(ctx.membership.workspaceId);
  return carts;
});

export const retrieveOpenCart = securityProcedure([
  "manage:carts",
  "view:carts",
])
  .input(
    z.object({
      conversationId: z.string(),
    })
  )
  .handler(async ({ input, ctx }) => {
    const conversation = await conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) throw NotFound.instance("Conversation");

    let cart = await cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      ctx.membership.workspaceId
    );

    if (!cart) throw NotFound.instance("Cart");

    return cart.raw();
  });

export const upsertProductOnCart = securityProcedure(["manage:carts"])
  .input(
    z.object({
      productId: z.string(),
      conversationId: z.string(),
      quantity: z.number(),
    })
  )
  .handler(async ({ input, ctx }) => {
    const conversation = await conversationsRepository.retrieve(
      input.conversationId
    );
    if (!conversation) throw NotFound.instance("Conversation");

    let client = await clientsRepository.retrieveByPhone(
      conversation.contact.phone,
      ctx.membership.workspaceId
    );

    if (!client) {
      client = Client.create(conversation.contact);

      await clientsRepository.upsert(client, ctx.membership.workspaceId);
    }

    let cart = await cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      ctx.membership.workspaceId
    );

    if (!cart) {
      cart = Cart.create({
        attendant: conversation.attendant!,
        client,
      });
    }

    const product = await productsRepository.retrieve(input.productId);

    if (!product) throw NotFound.instance("Product");

    const cartProduct = CartProduct.create({
      product,
      quantity: input.quantity,
    });

    cart.upsertProduct(cartProduct);

    await cartsRepository.upsert(cart, conversation.id);

    if (cart.status.is("order")) {
      await messaging.sendDataToQueue({
        queueName: "orderCart",
        data: {
          cartId: cart.id,
          cartProduct: {
            id: cartProduct.id,
            quantity: cartProduct.quantity,
            price: cartProduct.price,
          },
        },
        workspaceId: ctx.membership.workspaceId,
        operation: "upsertProduct",
      });
    }

    return cart.raw();
  });

export const removeProductFromCart = securityProcedure(["manage:carts"])
  .input(
    z.object({
      productId: z.string(),
      conversationId: z.string(),
    })
  )
  .handler(async ({ input, ctx }) => {
    const conversation = await conversationsRepository.retrieve(
      input.conversationId
    );
    if (!conversation) throw NotFound.instance("Conversation");

    const cart = await cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      ctx.membership.workspaceId
    );

    if (!cart) throw NotFound.instance("Cart");

    cart.removeProduct(input.productId);

    await cartsRepository.upsert(cart, conversation.id);

    if (cart.status.is("order")) {
      await messaging.sendDataToQueue({
        queueName: "orderCart",
        data: {
          cartId: cart.id,
          productId: input.productId,
        },
        workspaceId: ctx.membership.workspaceId,
        operation: "removeProduct",
      });
    }
  });

export const orderCart = securityProcedure(["manage:carts"])
  .input(
    z.object({
      conversationId: z.string(),
    })
  )
  .handler(async ({ input, ctx }) => {
    const cart = await cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      ctx.membership.workspaceId
    );

    if (!cart) throw NotFound.instance("Cart");

    const conversation = await conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) throw NotFound.instance("Conversation");

    cart.order();

    await messaging.sendDataToQueue({
      queueName: "orderCart",
      data: {
        cart: cart.raw(),
        total: cart.total,
      },
      workspaceId: ctx.membership.workspaceId,
      operation: "orderCart",
    });

    await cartsRepository.upsert(cart, conversation.id);

    conversation.close();

    await conversationsRepository.upsert(
      conversation,
      ctx.membership.workspaceId
    );

    return cart.raw();
  });

export const expireCart = securityProcedure(["manage:carts"])
  .input(
    z.object({
      conversationId: z.string(),
    })
  )
  .handler(async ({ input, ctx }) => {
    const conversation = await conversationsRepository.retrieve(
      input.conversationId
    );
    if (!conversation) throw NotFound.instance("Conversation");

    const cart = await cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      ctx.membership.workspaceId
    );

    if (!cart) throw NotFound.instance("Cart");

    cart.expire();

    await cartsRepository.upsert(cart, conversation.id);
  });

export const cancelCart = securityProcedure(["manage:carts"])
  .input(
    z.object({
      conversationId: z.string(),
      reason: z.string().optional(),
    })
  )
  .handler(async ({ input, ctx }) => {
    const conversation = await conversationsRepository.retrieve(
      input.conversationId
    );
    if (!conversation) throw NotFound.instance("Conversation");

    const cart = await cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      ctx.membership.workspaceId
    );

    if (!cart) throw NotFound.instance("Cart");

    cart.cancel(input.reason);

    await messaging.sendDataToQueue({
      queueName: "cancelCart",
      data: cart.id,
      workspaceId: ctx.membership.workspaceId,
      operation: "cancelCart",
    });

    await cartsRepository.upsert(cart, conversation.id);
  });

export const setCartAddress = securityProcedure(["manage:carts"])
  .input(
    z.object({
      conversationId: z.string(),
      address: z.object({
        street: z.string().optional().default(""),
        number: z.string().optional().default(""),
        neighborhood: z.string().optional().default(""),
        city: z.string().optional().default(""),
        state: z.string().optional().default(""),
        zipCode: z.string().optional().default(""),
        country: z.string().optional().default("Brasil"),
        note: z.string().optional().default("").nullable(),
      }),
    })
  )
  .handler(async ({ input, ctx }) => {
    const conversation = await conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) throw NotFound.instance("Conversation");

    let client = await clientsRepository.retrieveByPhone(
      conversation.contact.phone,
      ctx.membership.workspaceId
    );

    if (!client) {
      client = Client.create(conversation.contact);

      await clientsRepository.upsert(client, ctx.membership.workspaceId);
    }

    let cart = await cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      ctx.membership.workspaceId
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
      await clientsRepository.upsert(client, ctx.membership.workspaceId);
    }

    cart.address = newAddress;

    await cartsRepository.upsert(cart, conversation.id);
  });

export const setPaymentMethod = securityProcedure(["manage:carts"])
  .input(
    z.object({
      conversationId: z.string(),
      paymentMethod: z.enum(PaymentMethod.values),
      paymentChange: z.number().optional(),
    })
  )
  .handler(async ({ input, ctx }) => {
    const conversation = await conversationsRepository.retrieve(
      input.conversationId
    );
    if (!conversation) throw NotFound.instance("Conversation");

    const cart = await cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      ctx.membership.workspaceId
    );

    if (!cart) throw NotFound.instance("Cart");

    const paymentMethod = PaymentMethod.create(input.paymentMethod);

    cart.setPaymentMethod(paymentMethod);
    cart.setPaymentChange(input.paymentChange);

    await cartsRepository.upsert(cart, conversation.id);
  });
