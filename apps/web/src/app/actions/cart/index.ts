"use server";
import { Cart } from "@looma/core/domain/entities/cart";
import { CartProduct } from "@looma/core/domain/entities/cart-product";
import { Client } from "@looma/core/domain/entities/client";
import { NotFound } from "@looma/core/domain/errors/not-found";
import { Address } from "@looma/core/domain/value-objects/address";
import { CartsRepository } from "@looma/core/infra/repositories/carts-repository";
import { ClientsRepository } from "@looma/core/infra/repositories/clients-repository";
import { ConversationsRepository } from "@looma/core/infra/repositories/conversations-repository";
import { ProductsRepository } from "@looma/core/infra/repositories/products-repository";
import z from "zod";
import { securityProcedure } from "./../procedure";
import { PaymentMethod } from "@looma/core/domain/value-objects/payment-method";
import { SQSMessagingDriver } from "@looma/core/infra/drivers/messaging-driver";
import { messages } from "@looma/core/infra/database/schemas";

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
      conversation.contact.phone
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

    cart.upsertProduct(
      CartProduct.create({
        product,
        quantity: input.quantity,
      })
    );

    await cartsRepository.upsert(cart, ctx.membership.workspaceId);

    if (cart.status.is("order")) {
      await messaging.sendDataToQueue({
        queueName: "carts",
        data: cart.raw(),
        workspaceId: ctx.membership.workspaceId,
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
    const cart = await cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      ctx.membership.workspaceId
    );

    if (!cart) throw NotFound.instance("Cart");

    const product = cart.products.find((p) => p.id === input.productId);

    if (!product) throw NotFound.instance("Product");

    await cartsRepository.removeProductFromCart(input.productId, cart.id);

    return;
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

    if (!cart.address)
      throw new Error("Não é possível finalizar o pedido sem um endereço.");

    const address = Address.create(cart.address?.raw());

    const validateAddress = address.validate();

    if (!validateAddress.isValid)
      throw new Error(`
      Não é possível finalizar o pedido com o endereço incompleto.
      Campos faltantes: ${validateAddress.missingFields}
      `);

    if (!cart.paymentMethod) throw new Error("Defina um método de pagamento.");

    cart.orderCart();

    await cartsRepository.upsert(cart, ctx.membership.workspaceId);

    await messaging.sendDataToQueue({
      queueName: "carts",
      data: cart.raw(),
      workspaceId: ctx.membership.workspaceId,
    });
    return cart.raw();
  });

export const expireCart = securityProcedure(["manage:carts"])
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

    cart.expireCart();

    await cartsRepository.upsert(cart, ctx.membership.workspaceId);
    return;
  });

export const cancelCart = securityProcedure(["manage:carts"])
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

    const isOrder = cart.status.is("order");

    cart.cancelCart();

    await cartsRepository.upsert(cart, ctx.membership.workspaceId);

    if (isOrder) {
      await messaging.sendDataToQueue({
        queueName: "carts",
        data: cart.raw(),
        workspaceId: ctx.membership.workspaceId,
      });
    }
    return;
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
      conversation.contact.phone
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

    await cartsRepository.upsert(cart, ctx.membership.workspaceId);
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
    const cart = await cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      ctx.membership.workspaceId
    );

    if (!cart) throw NotFound.instance("Cart");

    const paymentMethod = PaymentMethod.create(input.paymentMethod);

    cart.setPaymentMethod(paymentMethod);
    cart.setPaymentChange(input.paymentChange);

    await cartsRepository.upsert(cart, ctx.membership.workspaceId);
    return;
  });
