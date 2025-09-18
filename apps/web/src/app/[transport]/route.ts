import { createMcpHandler } from "@vercel/mcp-adapter";
import z from "zod";
import { ConsultingStock } from "@looma/core/application/queries/consulting-stock";
import { ConsultingPromotion } from "@looma/core/application/queries/consulting-promotion";
import { CloseConversation } from "@looma/core/application/command/close-conversation";
import { ClientsDatabaseRepository } from "@looma/core/infra/repositories/clients-repository";
import { BrasilAPISearchZipCodeDriver } from "@looma/core/infra/drivers/search-zipcode-driver";
import { CartsDatabaseRepository } from "@looma/core/infra/repositories/carts-repository";
import { CloseCart } from "@looma/core/application/command/close-cart";
import { CancelCart } from "@looma/core/application/command/cancel-cart";
import { ShowCart } from "@looma/core/application/queries/show-cart";
import { UpsertProductOnCart } from "@looma/core/application/command/upsert-product-on-cart";
import { RemoveProductFromCart } from "@looma/core/application/command/remove-product-from-cart";
import { SetCartAddress } from "@looma/core/application/command/set-cart-address";
import { PaymentMethod } from "@looma/core/domain/value-objects/payment-method";
import { SetCartPayment } from "@looma/core/application/command/set-cart-payment";
import { sseEmitter } from "@/lib/sse";
import { NextRequest } from "next/server";

const handler = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);

  const workspaceId = searchParams.get("workspaceId")!;
  const conversationId = searchParams.get("conversationId")!;
  const contactPhone = searchParams.get("contactPhone")!;

  return createMcpHandler((server) => {
    server.registerTool(
      "stock-tool",
      {
        title: "Stock Tool",
        description: "use para verificar se o produto está em estoque",
        inputSchema: {
          query: z.string().describe("Nome do produto e/ou apresentação"),
        },
      },
      async ({ query }) => {
        const consultingStock = ConsultingStock.instance();
        const products = await consultingStock.execute({
          query,
          workspaceId,
        });
        return {
          content: [
            {
              text: products
                .map(
                  (i) =>
                    `
                    ${i.description} (ID: ${i.id})
                    Fabricante: ${i.manufactory}
                    Preço: ${i.promotionPrice ? `de ${i.price.toLocaleString("pt-BR", { currency: "BRL", style: "currency" })} por ${i.promotionPrice?.toLocaleString("pt-BR", { currency: "BRL", style: "currency" })}` : i.price.toLocaleString("pt-BR", { currency: "BRL", style: "currency" })}
                  `
                )
                .join("\n\n"),
              type: "text",
            },
          ],
        };
      }
    );
    server.registerTool(
      "promotion-products-tool",
      {
        title: "Promotion Tool",
        description:
          "use para consultar os produtos do estoque que estão em promoção",
        inputSchema: {
          query: z.string().describe("Nome do produto e/ou apresentação"),
        },
      },
      async ({ query }) => {
        const consultingPromotion = ConsultingPromotion.instance();
        const promotions = await consultingPromotion.execute({
          query,
          workspaceId,
        });
        return {
          content: [
            {
              text: promotions
                .map(
                  (i) =>
                    `
                    ${i.description} (ID: ${i.id})
                    Fabricante: ${i.manufactory}
                    Preço: ${i.promotionPrice ? `de ${i.price.toLocaleString("pt-BR", { currency: "BRL", style: "currency" })} por ${i.promotionPrice?.toLocaleString("pt-BR", { currency: "BRL", style: "currency" })}` : i.price.toLocaleString("pt-BR", { currency: "BRL", style: "currency" })}
                  `
                )
                .join("\n\n"),
              type: "text",
            },
          ],
        };
      }
    );
    server.registerTool(
      "close-conversation-tool",
      {
        title: "Close Conversation Tool",
        description: "Use para fechar um atendimento",
      },
      async () => {
        const closeConversation = CloseConversation.instance();

        const conversation = await closeConversation.execute({
          conversationId,
          workspaceId,
        });

        sseEmitter.emit("cart");

        return {
          content: [
            {
              text: JSON.stringify(conversation.raw()),
              type: "text",
            },
          ],
        };
      }
    );
    server.registerTool(
      "retrieve-client-tool",
      {
        title: "Retrieve Client Tool",
        description: "Use para recuperar o cadastro do cliente",
      },
      async () => {
        const clientsRepository = ClientsDatabaseRepository.instance();

        const client = await clientsRepository.retrieveByPhone(
          contactPhone,
          workspaceId
        );

        return {
          content: [
            {
              text: JSON.stringify(client?.raw()) ?? "Cliente não cadastrado",
              type: "text",
            },
          ],
        };
      }
    );
    server.registerTool(
      "consulting-cep-tool",
      {
        title: "Consulting CEP Tool",
        description: "Use para recuperar informações de um CEP de um endereço",
        inputSchema: {
          zipCode: z.string().describe("CEP para recuperar"),
        },
      },
      async ({ zipCode }) => {
        const searchZipCodeDriver = BrasilAPISearchZipCodeDriver.instance();
        const address = await searchZipCodeDriver.search(zipCode);
        return {
          content: [
            {
              text: JSON.stringify(address),
              type: "text",
            },
          ],
        };
      }
    );
    server.registerTool(
      "retrieve-last-cart-tool",
      {
        title: "Retrieve Last Cart Tool",
        description: "Use para buscar o ultimo pedido realizado",
      },
      async () => {
        const cartsRepository = CartsDatabaseRepository.instance();
        const lastCart = await cartsRepository.retrieveLastCartByContactPhone(
          contactPhone,
          workspaceId
        );
        sseEmitter.emit("cart");

        if (!lastCart) {
          return {
            content: [
              {
                type: "text",
                text: "Não há último pedido",
              },
            ],
          };
        }

        return {
          content: [
            {
              text: JSON.stringify(lastCart.raw()),
              type: "text",
            },
          ],
        };
      }
    );
    server.registerTool(
      "retrieve-current-cart-tool",
      {
        title: "Retrieve Current Cart Tool",
        description: "Use para buscar o pedido atual",
      },
      async () => {
        const cartsRepository = CartsDatabaseRepository.instance();
        const currentCart =
          await cartsRepository.retrieveOpenCartByConversationId(
            conversationId,
            workspaceId
          );
        sseEmitter.emit("cart");

        if (!currentCart) {
          return {
            content: [
              {
                type: "text",
                text: "Não há pedido aberto",
              },
            ],
          };
        }

        return {
          content: [
            {
              text: JSON.stringify(currentCart.raw()),
              type: "text",
            },
          ],
        };
      }
    );
    server.registerTool(
      "close-cart-tool",
      {
        title: "Close Cart Tool",
        description: "Use para finalizar o pedido",
      },
      async () => {
        const closeCart = CloseCart.instance();
        const cart = await closeCart.execute({
          conversationId,
          workspaceId,
        });
        sseEmitter.emit("cart");

        return {
          content: [
            {
              text: JSON.stringify(cart.raw()),
              type: "text",
            },
          ],
        };
      }
    );
    server.registerTool(
      "cancel-cart-tool",
      {
        title: "Cancel Cart Tool",
        description: "Use para cancelar um pedido",
        inputSchema: {
          reason: z
            .string()
            .describe("Razão do cancelamento provida pelo cliente"),
        },
      },
      async ({ reason }) => {
        const cancelCart = CancelCart.instance();
        const cart = await cancelCart.execute({
          conversationId,
          workspaceId,
          reason,
        });
        sseEmitter.emit("cart");

        return {
          content: [
            {
              text: JSON.stringify(cart.raw()),
              type: "text",
            },
          ],
        };
      }
    );
    server.registerTool(
      "show-cart-tool",
      {
        title: "Show Cart Tool",
        description: "Use para enviar o resumo do pedido para o cliente",
      },
      async () => {
        const showCart = ShowCart.instance();

        await showCart.execute({
          conversationId,
          workspaceId,
        });
        sseEmitter.emit("cart");

        return {
          content: [
            {
              text: "Resumo do pedido enviado ao cliente",
              type: "text",
            },
          ],
        };
      }
    );
    server.registerTool(
      "add-product-on-cart-tool",
      {
        title: "Add Product on Cart Tool",
        description:
          "Use para adicionar ou alterar a quantidade de um determinado produto do pedido",
        inputSchema: {
          productId: z.string().describe("ID do produto"),
          quantity: z.number().describe("Quantidade de produto"),
        },
      },
      async (input) => {
        const upsertProductOnCart = UpsertProductOnCart.instance();
        const cart = await upsertProductOnCart.execute({
          ...input,
          conversationId,
          workspaceId,
        });
        sseEmitter.emit("cart");

        return {
          content: [
            {
              text: JSON.stringify(cart.raw()),
              type: "text",
            },
          ],
        };
      }
    );
    server.registerTool(
      "remove-product-from-cart-tool",
      {
        title: "Remove Product from Cart Tool",
        description: "Use para remover um determinado produto do pedido",
        inputSchema: {
          productId: z.string().describe("ID do produto"),
        },
      },
      async (input) => {
        const removeProductFromCart = RemoveProductFromCart.instance();
        const cart = await removeProductFromCart.execute({
          ...input,
          conversationId,
          workspaceId,
        });
        sseEmitter.emit("cart");

        return {
          content: [
            {
              text: JSON.stringify(cart.raw()),
              type: "text",
            },
          ],
        };
      }
    );
    server.registerTool(
      "set-address-cart-tool",
      {
        title: "Set Address Cart Tool",
        description: "Use para alterar o endereço de entrega do pedido",
        inputSchema: {
          address: z.object({
            street: z.string().optional().default(""),
            number: z.string().optional().default(""),
            neighborhood: z.string().optional().default(""),
            city: z.string().optional().default(""),
            state: z.string().optional().default(""),
            zipCode: z.string().optional().default(""),
            note: z
              .string()
              .optional()
              .default("")
              .nullable()
              .describe("Complemento do endereço"),
          }),
        },
      },
      async (input) => {
        const setCartAddress = SetCartAddress.instance();
        const cart = await setCartAddress.execute({
          address: {
            ...input.address,
            country: "Brasil",
          },
          conversationId,
          workspaceId,
        });

        const response = cart.address?.validate();
        sseEmitter.emit("cart");

        if (!response?.isValid) {
          const result = `Endereço ${cart.address?.fullAddress()} salvo porém com campos faltantes: ${response?.missingFields.join(", ")}`;

          return {
            content: [
              {
                type: "text",
                text: result,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(cart.raw()),
            },
          ],
        };
      }
    );
    server.registerTool(
      "set-payment-method-cart-tool",
      {
        title: "Set Payment Method Cart Tool",
        description: "Use para alterar o método de pagamento do pedido",
        inputSchema: {
          paymentMethod: z.enum(PaymentMethod.values),
          paymentChange: z.number().optional().describe("valor de troco"),
        },
      },
      async (input) => {
        const setCartPayment = SetCartPayment.instance();

        const cart = await setCartPayment.execute({
          ...input,
          conversationId,
          workspaceId,
        });
        sseEmitter.emit("cart");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(cart.raw()),
            },
          ],
        };
      }
    );
  })(req);
};

export { handler as DELETE, handler as GET, handler as POST };
