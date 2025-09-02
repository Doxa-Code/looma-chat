import { CloseConversation } from "@looma/core/application/command/close-conversation";
import { Product } from "@looma/core/domain/value-objects/product";
import { CartsDatabaseRepository } from "@looma/core/infra/repositories/carts-repository";
import { ConversationsDatabaseRepository } from "@looma/core/infra/repositories/conversations-repository";
import type { SQSEvent, SQSHandler } from "aws-lambda";
import axios from "axios";
import z from "zod";

const finishCartValidate = z.object({
  cartId: z.string(),
  status: z.enum(["finished", "processing", "shipped", "cancelled"]),
  workspaceId: z.string(),
});

const cartsRepository = CartsDatabaseRepository.instance();
const conversationsRepository = ConversationsDatabaseRepository.instance();

export const handler: SQSHandler = async (event: SQSEvent) => {
  const loomaClient = axios.create({
    baseURL:
      "https://n8n.doxacode.com.br/webhook/f1c118f6-1c41-4866-8fc1-6c4497fa980b",
  });
  for (const record of event.Records) {
    const body = JSON.parse(record.body) as Product.Props;
    const result = await finishCartValidate.safeParseAsync(body);

    if (!result.success) {
      return;
    }

    const cart = await cartsRepository.retrieve(result.data.cartId);

    if (!cart) return;

    const conversationId = await cartsRepository.retrieveConversationId(
      cart.id
    );

    if (!conversationId) return;

    const conversation = await conversationsRepository.retrieve(conversationId);

    if (!conversation) return;

    switch (result.data.status) {
      case "cancelled": {
        cart.cancel("Cancelado pelo sistema da farmácia");
        await CloseConversation.instance().execute({
          conversationId: conversation.id,
          workspaceId: result.data.workspaceId,
        });
        break;
      }
      case "finished": {
        cart.finish();
        await CloseConversation.instance().execute({
          conversationId: conversation.id,
          workspaceId: result.data.workspaceId,
        });
        break;
      }
      case "processing": {
        cart.processing();
        await loomaClient.post("/", {
          workspaceId: result.data.workspaceId,
          conversationId: conversation.id,
          status: "processing",
          channel: conversation.channel,
          contactPhone: conversation.contact.phone,
        });
        break;
      }
      case "shipped": {
        cart.shipped();
        await loomaClient.post("/", {
          workspaceId: result.data.workspaceId,
          conversationId: conversation.id,
          status: "shipped",
          channel: conversation.channel,
          contactPhone: conversation.contact.phone,
        });
        break;
      }
    }

    await cartsRepository.upsert(cart, conversationId);
  }
};
