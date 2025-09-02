import { Product } from "@looma/core/domain/value-objects/product";
import { createDatabaseConnection } from "@looma/core/infra/database";
import { n8nChatHistories } from "@looma/core/infra/database/schemas";
import { MetaMessageDriver } from "@looma/core/infra/drivers/message-driver";
import { CartsDatabaseRepository } from "@looma/core/infra/repositories/carts-repository";
import { ConversationsDatabaseRepository } from "@looma/core/infra/repositories/conversations-repository";
import type { SQSEvent, SQSHandler } from "aws-lambda";
import z from "zod";

const finishCartValidate = z.object({
  cartId: z.string(),
  status: z.enum(["finished", "processing", "shipped", "cancelled"]),
  workspaceId: z.string(),
});

const cartsRepository = CartsDatabaseRepository.instance();
const conversationsRepository = ConversationsDatabaseRepository.instance();

export const handler: SQSHandler = async (event: SQSEvent) => {
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
        break;
      }
      case "finished": {
        cart.finish();
        break;
      }
      case "processing": {
        cart.processing();
        const message =
          "opa! acabei de ver aqui e seu pedido ta sendo processado blz? jaja chega ai!";
        const db = createDatabaseConnection();
        await db.insert(n8nChatHistories).values({
          message: `{"type": "ai", "content": "${message}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}`,
          sessionId: `${conversation.channel}-${conversation.contact.phone}`,
        });
        await MetaMessageDriver.instance().sendMessageText({
          channel: conversation.channel,
          content: message,
          to: conversation.contact.phone,
        });
        break;
      }
      case "shipped": {
        cart.shipped();
        const message = "opa! seu pedido ta saindo daqui? jaja chega ai ok?";
        const db = createDatabaseConnection();
        await db.insert(n8nChatHistories).values({
          message: `{"type": "ai", "content": "${message}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}`,
          sessionId: `${conversation.channel}-${conversation.contact.phone}`,
        });
        await MetaMessageDriver.instance().sendMessageText({
          channel: conversation.channel,
          content: message,
          to: conversation.contact.phone,
        });
        break;
      }
    }

    await cartsRepository.upsert(cart, conversationId);
  }
};
