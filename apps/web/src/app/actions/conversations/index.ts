"use server";
import { sseEmitter } from "@/lib/sse";
import { CloseConversation } from "@looma/core/application/command/close-conversation";
import { TransferConversation } from "@looma/core/application/command/transfer-conversation";
import { Sector } from "@looma/core/domain/value-objects/sector";
import { Attendant } from "@looma/core/domain/value-objects/attendant";
import { ConversationsDatabaseRepository } from "@looma/core/infra/repositories/conversations-repository";
import z from "zod";
import { securityProcedure } from "../procedure";

const conversationsRepository = ConversationsDatabaseRepository.instance();

export const transferConversation = securityProcedure([
  "view:conversations",
  "view:conversation",
])
  .input(
    z.object({
      conversationId: z.string(),
      sectorId: z.string(),
      attendantId: z.string().optional(),
    })
  )
  .handler(async ({ input, ctx }) => {
    const transferConversation = TransferConversation.instance();

    const conversation = await transferConversation.execute({
      conversationId: input.conversationId,
      sectorId: input.sectorId,
      workspaceId: ctx.membership.workspaceId,
      attendantId: input.attendantId,
    });

    if (conversation) {
      sseEmitter.emit("conversation", conversation.raw());
    }
  });

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
  const result = await conversationsRepository.listBySectorAndAttendantId(
    ctx.user.id,
    ctx.membership.workspaceId,
    ctx.user.sector?.id
  );

  return result.map((c) => c.raw());
});

export const closeConversation = securityProcedure(["close:conversation"])
  .input(z.object({ conversationId: z.string() }))
  .handler(async ({ input, ctx: { membership } }) => {
    const closeConversation = CloseConversation.instance();

    const conversation = await closeConversation.execute({
      conversationId: input.conversationId,
      workspaceId: membership.workspaceId,
    });

    sseEmitter.emit("conversation", conversation.raw());
  });

export const registerMeAttendant = securityProcedure(["view:conversation"])
  .input(
    z.object({
      conversationId: z.string(),
      sector: z.object({
        id: z.string().nullish(),
        name: z.string().nullish(),
      }),
    })
  )
  .handler(async ({ ctx, input }) => {
    const conversation = await conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) return;

    if (!!input.sector.id && !!input.sector.name) {
      conversation.transferToSector(
        Sector.create(input.sector.name, input.sector.id)
      );
    }

    conversation.attributeAttendant(
      Attendant.create(ctx.user.id, ctx.user.name)
    );

    await conversationsRepository.upsert(
      conversation,
      ctx.membership.workspaceId
    );

    sseEmitter.emit("conversation", conversation.raw());
  });
