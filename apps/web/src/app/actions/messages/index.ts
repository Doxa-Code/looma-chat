"use server";
import { sseEmitter } from "@/lib/sse";
import { ChangeStatusMessage } from "@looma/core/application/command/change-status-message";
import { MarkLastMessagesContactAsViewed } from "@looma/core/application/command/mark-last-messages-contact-as-viewed";
import { MessageReceived } from "@looma/core/application/command/message-received";
import { SendAudio } from "@looma/core/application/command/send-audio";
import { SendMessage } from "@looma/core/application/command/send-message";
import { MetaMessageDriver } from "@looma/core/infra/drivers/message-driver";
import { MessagesDatabaseRepository } from "@looma/core/infra/repositories/messages-repository";
import z from "zod";
import { securityProcedure } from "../procedure";

const messagesRepository = MessagesDatabaseRepository.instance();
const messageDriver = MetaMessageDriver.instance();

export const sendTyping = securityProcedure([
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
    const messageDriver = MetaMessageDriver.instance();

    sseEmitter.emit("typing", { messageId: input.messageId });

    await messageDriver.sendTyping({
      channel: input.channel,
      lastMessageId: input.messageId,
    });
  });

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
  .onError(async (err) => {
    console.log(err);
  })
  .handler(async ({ input }) => {
    const changeStatusMessage = ChangeStatusMessage.instance();
    const conversation = await changeStatusMessage.execute({
      messageId: input.messageId,
      status: input.status,
    });
    if (conversation) {
      sseEmitter.emit("conversation", conversation.raw());
    }
  });

export const messageReceived = securityProcedure([
  "view:conversation",
  "view:conversations",
])
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
    })
  )
  .handler(async ({ input, ctx }) => {
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
      workspaceId: ctx.membership.workspaceId,
    });
    sseEmitter.emit("conversation", response?.conversation?.raw());
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

    sseEmitter.emit("conversation", conversation.raw());
    sseEmitter.emit("untyping", { id: conversation.id });
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
      sseEmitter.emit("conversation", conversation.raw());
    }

    sseEmitter.emit("untyping", { id: input.conversationId });
  });

export const markLastMessagesContactAsViewed = securityProcedure([
  "view:conversation",
  "view:conversations",
])
  .input(z.object({ channel: z.string(), contactPhone: z.string() }))
  .handler(async ({ input, ctx: { membership } }) => {
    const markLastMessagesContactAsViewed =
      MarkLastMessagesContactAsViewed.instance();

    const conversation = await markLastMessagesContactAsViewed.execute({
      channel: input.channel,
      workspaceId: membership.workspaceId,
      contactPhone: input.contactPhone,
    });

    sseEmitter.emit("conversation", conversation.raw());

    return conversation.raw();
  });
