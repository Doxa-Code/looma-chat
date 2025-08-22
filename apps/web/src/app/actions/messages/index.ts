"use server";
import { sseEmitter } from "@/lib/sse";
import { SendAudio } from "@looma/core/application/command/send-audio";
import { SendMessage } from "@looma/core/application/command/send-message";
import { MetaMessageDriver } from "@looma/core/infra/drivers/message-driver";
import { MessagesDatabaseRepository } from "@looma/core/infra/repositories/messages-repository";
import z from "zod";
import { securityProcedure } from "../procedure";
import { MarkLastMessagesContactAsViewed } from "@looma/core/application/command/mark-last-messages-contact-as-viewed";
import { MetaController } from "@looma/core/infra/controllers/meta-controller";
import { createServerAction } from "zsa";
import { ChangeStatusMessage } from "@looma/core/application/command/change-status-message";
import { MessageReceived } from "@looma/core/application/command/message-received";
import { SendMessageToLooma } from "@looma/core/application/command/send-message-to-looma";

const messagesRepository = MessagesDatabaseRepository.instance();
const messageDriver = MetaMessageDriver.instance();

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

export const receivedMessage = createServerAction()
  .input(z.any())
  .handler(
    MetaController.create({
      async onChangeMessageStatus({ messageId, status }) {
        const changeStatusMessage = ChangeStatusMessage.instance();
        const conversation = await changeStatusMessage.execute({
          messageId,
          status,
        });

        if (conversation) {
          sseEmitter.emit("message", conversation.raw());
        }
      },
      async onReceivedMessage(props) {
        try {
          const messageReceived = MessageReceived.instance();
          const response = await messageReceived.execute(props);

          if (!response) return;

          if (response.conversation) {
            sseEmitter.emit("message", response?.conversation?.raw());
          }

          sseEmitter.emit("typing");

          const sendMessageToLooma = SendMessageToLooma.instance();
          const conversation = await sendMessageToLooma.execute({
            conversationId: response.conversation.id,
            workspaceId: response.workspaceId,
          });

          if (conversation) {
            sseEmitter.emit("message", conversation?.raw());
          }

          sseEmitter.emit("untyping");
        } catch {
          sseEmitter.emit("untyping");
        }
      },
    })
  );

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
