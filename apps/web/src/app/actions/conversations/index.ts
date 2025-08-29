"use server";
import { sseEmitter } from "@/lib/sse";
import { CloseConversation } from "@looma/core/application/command/close-conversation";
import { ConversationsDatabaseRepository } from "@looma/core/infra/repositories/conversations-repository";
import z from "zod";
import { securityProcedure } from "../procedure";
import { createServerAction } from "zsa";
import { Attendant } from "@looma/core/domain/value-objects/attendant";

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

export const refreshConversation = createServerAction()
  .input(
    z.object({
      conversationId: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const conversation = await conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) return;

    sseEmitter.emit("message", conversation?.raw());
  });

export const typingConversation = createServerAction()
  .input(
    z.object({
      conversationId: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const conversation = await conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) return;

    sseEmitter.emit("typing", conversation.id);
  });

export const untypingConversation = createServerAction()
  .input(
    z.object({
      conversationId: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const conversation = await conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) return;

    sseEmitter.emit("untyping", conversation.id);
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
