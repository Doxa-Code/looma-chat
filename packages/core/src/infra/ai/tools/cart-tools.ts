import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { CancelCart } from "../../../application/command/cancel-cart";
import { CloseCart } from "../../../application/command/close-cart";
import { RemoveProductFromCart } from "../../../application/command/remove-product-from-cart";
import { SetCartAddress } from "../../../application/command/set-cart-address";
import { SetCartPayment } from "../../../application/command/set-cart-payment";
import { UpsertProductOnCart } from "../../../application/command/upsert-product-on-cart";
import { ShowCart } from "../../../application/queries/show-cart";
import { Cart } from "../../../domain/entities/cart";
import { PaymentMethod } from "../../../domain/value-objects/payment-method";
import { saveMessageOnThread } from "../utils";

export const getLastCartTool = createTool({
  id: "get-last-cart-tool",
  description: "Use para buscar o ultimo pedido realizado",
  execute: async ({ runtimeContext, resourceId, threadId }) => {
    const lastCart = runtimeContext.get("lastCart") as Cart;
    const response = lastCart ? lastCart : "Não há pedido realizado";
    await saveMessageOnThread({
      content: response,
      resourceId,
      threadId,
    });
    return response;
  },
});

export const getCurrentCartTool = createTool({
  id: "get-current-cart-tool",
  description: "Use para buscar o pedido atual",
  execute: async ({ runtimeContext, resourceId, threadId }) => {
    const currentCart =
      (runtimeContext.get("currentCart") as Cart) ||
      (runtimeContext.get("lastCart") as Cart);
    const response = currentCart ? currentCart : "Não há pedido aberto";

    await saveMessageOnThread({
      content: response,
      resourceId,
      threadId,
    });

    return response;
  },
});

export const closeCartTool = createTool({
  id: "close-cart-tool",
  description: "Use para finalizar o pedido",
  execute: async ({ runtimeContext }) => {
    try {
      const closeCart = CloseCart.instance();
      const cart = await closeCart.execute({
        conversationId: runtimeContext.get("conversationId"),
        workspaceId: runtimeContext.get("workspaceId"),
      });

      return cart.raw();
    } catch (err) {
      console.log(err);
      return err;
    }
  },
});

export const cancelCartTool = createTool({
  id: "cancel-cart-tool",
  description: "Use para cancelar um pedido",
  inputSchema: z.object({
    reason: z
      .string()
      .describe("Razão do cliente pelo cancelamento")
      .optional(),
  }),
  execute: async ({ context, runtimeContext }) => {
    const cancelCart = CancelCart.instance();
    const cart = await cancelCart.execute({
      conversationId: runtimeContext.get("conversationId"),
      workspaceId: runtimeContext.get("workspaceId"),
      reason: context.reason,
    });
    return cart.raw();
  },
});

export const showCartTool = createTool({
  id: "show-cart-tool",
  description: "Use para enviar o resumo do pedido para o cliente",
  execute: async ({ runtimeContext, resourceId, threadId }) => {
    const showCart = ShowCart.instance();
    const { cart } = await showCart.execute({
      conversationId: runtimeContext.get("conversationId"),
      workspaceId: runtimeContext.get("workspaceId"),
    });
    await saveMessageOnThread({
      content: cart,
      resourceId,
      threadId,
    });
    return "Resumo do pedido enviado ao cliente";
  },
});

export const addProductOnCartTool = createTool({
  id: "add-product-on-cart-tool",
  description:
    "Use para alterar a quantidade de um determinado produto do pedido",
  inputSchema: z.object({
    productId: z.string(),
    quantity: z.number(),
  }),
  execute: async ({ runtimeContext, context }) => {
    const upsertProductOnCart = UpsertProductOnCart.instance();
    const cart = await upsertProductOnCart.execute({
      conversationId: runtimeContext.get("conversationId"),
      productId: context.productId,
      quantity: context.quantity,
      workspaceId: runtimeContext.get("workspaceId"),
    });
    console.log("ADD PRODUCT: ", { cart: cart.raw(), context });
    return cart.raw();
  },
});

export const removeProductFromCartTool = createTool({
  id: "remove-product-from-cart-tool",
  description: "Use para remover um determinado produto do pedido",
  inputSchema: z.object({
    productId: z.string(),
  }),
  execute: async ({ runtimeContext, context }) => {
    const removeProductFromCart = RemoveProductFromCart.instance();
    const cart = await removeProductFromCart.execute({
      conversationId: runtimeContext.get("conversationId"),
      productId: context.productId,
      workspaceId: runtimeContext.get("workspaceId"),
    });
    console.log("REMOVE PRODUCT: ", { cart: cart.raw(), context });
    return cart.raw();
  },
});

export const setAddressCartTool = createTool({
  id: "set-address-cart-tool",
  description: "Use para alterar o endereço de entrega do pedido",
  inputSchema: z.object({
    street: z.string().optional().default(""),
    number: z.string().optional().default(""),
    neighborhood: z.string().optional().default(""),
    city: z.string().optional().default(""),
    state: z.string().optional().default(""),
    zipCode: z.string().optional().default(""),
    country: z.string().optional().default(""),
    note: z
      .string()
      .optional()
      .default("")
      .nullable()
      .describe("Complemento do endereço"),
  }),
  execute: async ({ runtimeContext, context, resourceId, threadId }) => {
    const setCartAddress = SetCartAddress.instance();
    const cart = await setCartAddress.execute({
      address: context,
      conversationId: runtimeContext.get("conversationId"),
      workspaceId: runtimeContext.get("workspaceId"),
    });
    const response = cart.address?.validate();
    if (!response?.isValid) {
      const result = `Endereço ${cart.address?.fullAddress()} salvo porém com campos faltantes: ${response?.missingFields.join(", ")}`;
      await saveMessageOnThread({
        content: result,
        resourceId,
        threadId,
      });
      return result;
    }

    console.log("SET ADDRESS: ", { cart: cart.raw(), context });

    return cart.raw();
  },
});

export const setPaymentMethodCartTool = createTool({
  id: "set-payment-method-cart-tool",
  description: "Use para alterar o método de pagamento do pedido",
  inputSchema: z.object({
    paymentMethod: z.enum(PaymentMethod.values),
    paymentChange: z.number().optional().describe("valor de troco"),
  }),
  execute: async ({ runtimeContext, context }) => {
    const setCartPayment = SetCartPayment.instance();

    const cart = await setCartPayment.execute({
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId"),
      paymentMethod: context.paymentMethod,
      paymentChange: context.paymentChange,
    });

    console.log("SET PAYMENT: ", { cart: cart.raw(), context });

    return cart.raw();
  },
});
