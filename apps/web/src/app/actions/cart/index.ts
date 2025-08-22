"use server";
import { sseEmitter } from "@/lib/sse";
import { CancelCart } from "@looma/core/application/command/cancel-cart";
import { RemoveProductFromCart } from "@looma/core/application/command/remove-product-from-cart";
import { SetCartAddress } from "@looma/core/application/command/set-cart-address";
import { SetCartPayment } from "@looma/core/application/command/set-cart-payment";
import { UpsertProductOnCart } from "@looma/core/application/command/upsert-product-on-cart";
import { ShowCart } from "@looma/core/application/queries/show-cart";
import { NotFound } from "@looma/core/domain/errors/not-found";
import { PaymentMethod } from "@looma/core/domain/value-objects/payment-method";
import { CartsDatabaseRepository } from "@looma/core/infra/repositories/carts-repository";
import { ConversationsDatabaseRepository } from "@looma/core/infra/repositories/conversations-repository";
import z from "zod";
import { securityProcedure } from "./../procedure";
import { CloseCart } from "@looma/core/application/command/close-cart";

const conversationsRepository = ConversationsDatabaseRepository.instance();
const cartsRepository = CartsDatabaseRepository.instance();

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

    if (!conversation) throw NotFound.throw("Conversation");

    let cart = await cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      ctx.membership.workspaceId
    );

    if (!cart) throw NotFound.throw("Cart");

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
    const upsertProductOnCart = UpsertProductOnCart.instance();
    const cart = await upsertProductOnCart.execute({
      conversationId: input.conversationId,
      productId: input.productId,
      quantity: input.quantity,
      workspaceId: ctx.membership.workspaceId,
    });
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
    const removeProductFromCart = RemoveProductFromCart.instance();
    await removeProductFromCart.execute({
      conversationId: input.conversationId,
      productId: input.productId,
      workspaceId: ctx.membership.workspaceId,
    });
  });

export const closeCart = securityProcedure(["manage:carts"])
  .input(
    z.object({
      conversationId: z.string(),
    })
  )
  .handler(async ({ input, ctx }) => {
    const closeCart = CloseCart.instance();
    await closeCart.execute({
      conversationId: input.conversationId,
      workspaceId: ctx.membership.workspaceId,
    });
  });

export const cancelCart = securityProcedure(["manage:carts"])
  .input(
    z.object({
      conversationId: z.string(),
      reason: z.string().optional(),
    })
  )
  .handler(async ({ input, ctx }) => {
    const cancelCart = CancelCart.instance();
    await cancelCart.execute({
      conversationId: input.conversationId,
      reason: input.reason,
      workspaceId: ctx.membership.workspaceId,
    });
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
    const setCartAddress = SetCartAddress.instance();
    await setCartAddress.execute({
      address: input.address,
      conversationId: input.conversationId,
      workspaceId: ctx.membership.workspaceId,
    });
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
    const setCartPayment = SetCartPayment.instance();
    await setCartPayment.execute({
      conversationId: input.conversationId,
      paymentChange: input.paymentChange,
      paymentMethod: input.paymentMethod,
      workspaceId: ctx.membership.workspaceId,
    });
  });

export const showCart = securityProcedure([
  "manage:carts",
  "send:message",
  "view:conversation",
  "view:conversations",
])
  .input(z.object({ conversationId: z.string() }))
  .handler(async ({ input, ctx }) => {
    const showCart = ShowCart.instance();

    const { cart, conversation } = await showCart.execute({
      conversationId: input.conversationId,
      workspaceId: ctx.membership.workspaceId,
    });

    sseEmitter.emit("message", conversation.raw());

    return cart.formatted;
  });
