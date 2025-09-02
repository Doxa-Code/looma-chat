import { CloseConversation } from "@looma/core/application/command/close-conversation";
import { SendMessage } from "@looma/core/application/command/send-message";
import { Product } from "@looma/core/domain/value-objects/product";
import { createDatabaseConnection } from "@looma/core/infra/database";
import { n8nChatHistories } from "@looma/core/infra/database/schemas";
import { CartsDatabaseRepository } from "@looma/core/infra/repositories/carts-repository";
import { ConversationsDatabaseRepository } from "@looma/core/infra/repositories/conversations-repository";
import { UsersDatabaseRepository } from "@looma/core/infra/repositories/users-repository";
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
        const message =
          "opa! acabei de ver aqui e seu pedido ta sendo processado blz? jaja chega ai!";
        const loomaUser =
          await UsersDatabaseRepository.instance().retrieveLoomaUser(
            result.data.workspaceId
          );
        if (loomaUser) {
          await SendMessage.instance().execute({
            content: message,
            conversationId: conversation.id,
            userId: loomaUser?.id,
            userName: loomaUser?.name,
            workspaceId: result.data.workspaceId,
          });
          const db = createDatabaseConnection();
          await db.insert(n8nChatHistories).values({
            message: `{"type": "ai", "content": "${message}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}`,
            sessionId: `${conversation.channel}-${conversation.contact.phone}`,
          });
        }
        break;
      }
      case "shipped": {
        cart.shipped();
        const message = "opa! seu pedido ta saindo daqui? jaja chega ai ok?";
        const loomaUser =
          await UsersDatabaseRepository.instance().retrieveLoomaUser(
            result.data.workspaceId
          );
        if (loomaUser) {
          await SendMessage.instance().execute({
            content: message,
            conversationId: conversation.id,
            userId: loomaUser?.id,
            userName: loomaUser?.name,
            workspaceId: result.data.workspaceId,
          });
          const db = createDatabaseConnection();
          await db.insert(n8nChatHistories).values({
            message: `{"type": "ai", "content": "${message}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}`,
            sessionId: `${conversation.channel}-${conversation.contact.phone}`,
          });
        }
        break;
      }
    }

    await cartsRepository.upsert(cart, conversationId);
  }
};
