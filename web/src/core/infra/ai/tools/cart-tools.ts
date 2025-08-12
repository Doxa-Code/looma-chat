import {
  cancelCart,
  orderCart,
  removeProductFromCart,
  retrieveOpenCart,
  setCartAddress,
  setPaymentMethod,
  upsertProductOnCart,
} from "@/app/actions/cart";
import { showCart } from "@/app/actions/conversations";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { saveMessageOnThread } from "../utils";
import { PaymentMethod } from "@/core/domain/value-objects/payment-method";
import { retrieveClient } from "@/app/actions/client";

export const retrieveClientTool = createTool({
  id: "retrieve-client-tool",
  description: "Use para recuperar o cadastro do cliente",
  execute: async ({ runtimeContext }) => {
    const result = await retrieveClient({
      userId: runtimeContext.get("userId"),
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId"),
      clientPhone: runtimeContext.get("clientPhone"),
    } as any);
    return result;
  },
});

export const retrieveCartTool = createTool({
  id: "retrieve-cart-tool",
  description: "Use para recuperar o pedido do cliente",
  execute: async ({ runtimeContext }) => {
    const result = await retrieveOpenCart({
      userId: runtimeContext.get("userId"),
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId"),
    } as any);
    return result;
  },
});

export const closeCartTool = createTool({
  id: "close-cart-tool",
  description: "Use para finalizar o pedido",
  execute: async ({ runtimeContext, resourceId, threadId }) => {
    const [, err] = await orderCart({
      userId: runtimeContext.get("userId"),
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId"),
    } as any);
    if (err) return err;
    await saveMessageOnThread({
      content: "Pedido fechado com sucesso!",
      resourceId,
      threadId,
    });
    return "Pedido fechado com sucesso!";
  },
});

export const cancelCartTool = createTool({
  id: "cancel-cart-tool",
  description: "Use para cancelar um pedido",
  execute: async ({ runtimeContext, resourceId, threadId }) => {
    const [, err] = await cancelCart({
      userId: runtimeContext.get("userId"),
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId"),
    } as any);
    if (err) return err;
    await saveMessageOnThread({
      content: "Pedido cancelado com sucesso!",
      resourceId,
      threadId,
    });
    return "Pedido cancelado com sucesso!";
  },
});

export const showCartTool = createTool({
  id: "show-cart-tool",
  description: "Use para enviar o resumo do pedido para o cliente",
  execute: async ({ runtimeContext, resourceId, threadId }) => {
    const [cart, err] = await showCart({
      userId: runtimeContext.get("userId"),
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId"),
    } as any);
    if (err) return err;
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
    const result = await upsertProductOnCart({
      userId: runtimeContext.get("userId"),
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId"),
      productId: context.productId,
      quantity: context.quantity,
    } as any);
    return result;
  },
});

export const removeProductFromCartTool = createTool({
  id: "remove-product-from-cart-tool",
  description: "Use para remover um determinado produto do pedido",
  inputSchema: z.object({
    productId: z.string(),
  }),
  execute: async ({ runtimeContext, context }) => {
    const result = await removeProductFromCart({
      userId: runtimeContext.get("userId"),
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId"),
      productId: context.productId,
    } as any);
    return result;
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
  execute: async ({ runtimeContext, context }) => {
    const [, err] = await setCartAddress({
      userId: runtimeContext.get("userId"),
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId"),
      address: context,
    } as any);
    if (err) return err;
    return "Endereço de entrega adicionado ao pedido";
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
    const result = await setPaymentMethod({
      userId: runtimeContext.get("userId"),
      workspaceId: runtimeContext.get("workspaceId"),
      conversationId: runtimeContext.get("conversationId"),
      paymentMethod: context.paymentMethod,
      paymentChange: context.paymentChange,
    } as any);
    return result;
  },
});
