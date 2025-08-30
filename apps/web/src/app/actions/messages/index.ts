"use server";
import { sseEmitter } from "@/lib/sse";
import { MarkLastMessagesContactAsViewed } from "@looma/core/application/command/mark-last-messages-contact-as-viewed";
import { SendAudio } from "@looma/core/application/command/send-audio";
import { SendMessage } from "@looma/core/application/command/send-message";
import { MetaMessageDriver } from "@looma/core/infra/drivers/message-driver";
import { MessagesDatabaseRepository } from "@looma/core/infra/repositories/messages-repository";
import z from "zod";
import { securityProcedure } from "../procedure";
import { MessageReceived } from "@looma/core/application/command/message-received";
import { SaveMessageResponse } from "@looma/core/application/command/save-message-response";
import { ChangeStatusMessage } from "@looma/core/application/command/change-status-message";

const messagesRepository = MessagesDatabaseRepository.instance();
const messageDriver = MetaMessageDriver.instance();

export const changeStatusMessage = securityProcedure([
  "view:conversation",
  "view:conversations",
])
  .input(
    z.object({
      messageId: z.string(),
      status: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const changeStatusMessage = ChangeStatusMessage.instance();
    const conversation = await changeStatusMessage.execute({
      messageId: input.messageId,
      status: input.status,
    });
    if (conversation) {
      sseEmitter.emit("message", conversation.raw());
    }
  });

export const saveMessageResponse = securityProcedure([
  "view:conversation",
  "view:conversations",
])
  .input(
    z.object({
      messageId: z.string(),
      conversationId: z.string(),
      content: z.string(),
    })
  )
  .handler(async ({ input, ctx }) => {
    const conversation = await SaveMessageResponse.instance().execute({
      content: input.content,
      conversationId: input.conversationId,
      userId: ctx.user.id,
      userName: ctx.user.name,
      workspaceId: ctx.membership.workspaceId,
      messageId: input.messageId,
    });

    sseEmitter.emit("message", conversation?.raw());
  });

export const messageReceived = securityProcedure([
  "view:conversation",
  "view:conversations",
])
  .onError(async (err) => {
    console.log(err);
  })
  .input(
    z.object({
      channel: z.string(),
      contactName: z.string(),
      contactPhone: z.string(),
      messagePayload: z.object({
        content: z.string(),
        id: z.string(),
        timestamp: z.number(),
        type: z.enum(["text", "audio", "image"]),
      }),
      wabaId: z.string(),
      workspaceId: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const messageReceived = MessageReceived.instance();
    const response = await messageReceived.execute({
      channel: input.channel,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      messagePayload: {
        content: input.messagePayload.content,
        id: input.messagePayload.id,
        timestamp: input.messagePayload.timestamp,
        type: input.messagePayload.type,
      },
      wabaId: input.wabaId,
      workspaceId: input.workspaceId,
    });
    sseEmitter.emit("message", response?.conversation?.raw());
    return {
      ...response,
      conversation: response?.conversation?.raw(),
    };
  });

export const listenAudio = securityProcedure([
  "view:conversation",
  "view:conversations",
])
  .input(
    z.object({
      channel: z.string(),
      messageId: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const message = await messagesRepository.retrieve(input.messageId);

    if (!message || message?.type !== "audio") return;

    const { success, content: arrayBuffer } = await messageDriver.downloadMedia(
      input.channel,
      message.content
    );
    if (!success) return;

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": "audio/ogg",
      },
    });
  });

export const retrieveImage = securityProcedure([
  "view:conversation",
  "view:conversations",
])
  .input(
    z.object({
      channel: z.string(),
      messageId: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const message = await messagesRepository.retrieve(input.messageId);

    if (!message || message?.type !== "image") return;

    const { success, content: arrayBuffer } = await messageDriver.downloadMedia(
      input.channel,
      message.content
    );
    if (!success) return;

    return new Response(new Uint8Array(arrayBuffer), {
      headers: {
        "Content-Type": "image/jpeg",
      },
    });
  });

export const sendAudio = securityProcedure(["send:message"])
  .input(
    z.object({
      file: z.instanceof(File),
      conversationId: z.string(),
    })
  )
  .handler(async ({ ctx, input }) => {
    const sendAudio = SendAudio.instance();

    const conversation = await sendAudio.execute({
      conversationId: input.conversationId,
      userId: ctx.user.id,
      userName: ctx.user.name,
      workspaceId: ctx.membership.workspaceId,
      file: input.file,
    });

    sseEmitter.emit("message", conversation.raw());
  });

export const sendMessage = securityProcedure(["send:message"])
  .input(z.object({ conversationId: z.string(), content: z.string() }))
  .handler(async ({ ctx, input }) => {
    const sendMessage = SendMessage.instance();

    const conversation = await sendMessage.execute({
      content: input.content,
      conversationId: input.conversationId,
      userId: ctx.user.id,
      userName: ctx.user.name,
      workspaceId: ctx.membership.workspaceId,
    });

    if (conversation) {
      sseEmitter.emit("message", conversation.raw());
    }
  });

export const markLastMessagesContactAsViewed = securityProcedure([
  "view:conversation",
  "view:conversations",
])
  .input(z.object({ conversationId: z.string() }))
  .handler(async ({ input, ctx: { membership } }) => {
    const markLastMessagesContactAsViewed =
      MarkLastMessagesContactAsViewed.instance();

    const conversation = await markLastMessagesContactAsViewed.execute({
      conversationId: input.conversationId,
      workspaceId: membership.workspaceId,
    });

    sseEmitter.emit("message", conversation.raw());
  });
