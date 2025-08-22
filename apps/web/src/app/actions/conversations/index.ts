"use server";
import { sseEmitter } from "@/lib/sse";
import { CloseConversation } from "@looma/core/application/command/close-conversation";
import { RegisterMessaging } from "@looma/core/application/queries/register-messaging";
import { ConversationsDatabaseRepository } from "@looma/core/infra/repositories/conversations-repository";
import z from "zod";
import { createServerAction } from "zsa";
import { securityProcedure } from "../procedure";

const conversationsRepository = ConversationsDatabaseRepository.instance();

export const listAllConversations = securityProcedure([
  "view:conversations",
  "view:conversation",
]).handler(async ({ ctx }) => {
  if (
    ctx.user.isSuperUser() ||
    ctx.membership.hasPermission("view:conversations")
  ) {
    const response = await conversationsRepository.list(
      ctx.membership.workspaceId
    );
    return response.map((c) => c.raw());
  }
  return (
    await conversationsRepository.listBySectorAndAttendantId(
      ctx.user.id,
      ctx.membership.workspaceId,
      ctx.user.sector?.id
    )
  ).map((c) => c.raw());
});

export const registerMessaging = createServerAction()
  .input(z.any())
  .handler(async ({ input }) => {
    const registerMessaging = RegisterMessaging.instance();
    return await registerMessaging.execute({
      challenge: input["hub.challenge"],
      token: input["hub.verify_token"],
    });
  });

export const closeConversation = securityProcedure(["close:conversation"])
  .input(z.object({ conversationId: z.string() }))
  .handler(async ({ input, ctx: { membership } }) => {
    const closeConversation = CloseConversation.instance();

    const conversation = await closeConversation.execute({
      conversationId: input.conversationId,
      workspaceId: membership.workspaceId,
    });

    sseEmitter.emit("message", conversation.raw());
  });
