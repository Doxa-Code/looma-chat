import { ChangeStatusMessage } from "@looma/core/application/command/change-status-message";
import { MessageReceived } from "@looma/core/application/command/message-received";
import { SendMessageToLooma } from "@looma/core/application/command/send-message-to-looma";
import { RegisterMessaging } from "@looma/core/application/queries/register-messaging";
import { MetaController } from "@looma/core/infra/controllers/meta-controller";
import type { APIGatewayEvent } from "aws-lambda";
import axios from "axios";

function getArrayBufferFromEvent(event: APIGatewayEvent): ArrayBuffer {
  const buffer = event.isBase64Encoded
    ? Buffer.from(event.body!, "base64")
    : Buffer.from(event.body!);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
}

const clientLoomaChat = axios.create({
  baseURL: "https://looma.doxacode.com.br/api",
});

const refreshConversation = async (conversationId: string) =>
  await clientLoomaChat
    .get(`/conversation/${conversationId}/refresh`)
    .catch(() => {});

const typingConversation = async (conversationId: string) =>
  await clientLoomaChat
    .get(`/conversation/${conversationId}/typing`)
    .catch(() => {});

const untypingConversation = async (conversationId: string) =>
  await clientLoomaChat
    .get(`/conversation/${conversationId}/untyping`)
    .catch((err) => {});

export const handler = async (event: APIGatewayEvent) => {
  if (
    event.queryStringParameters &&
    "hub.challenge" in event.queryStringParameters
  ) {
    const registerMessaging = RegisterMessaging.instance();
    return await registerMessaging.execute({
      challenge: event.queryStringParameters["hub.challenge"]!,
      token: event.queryStringParameters["hub.verify_token"]!,
    });
  }
  await MetaController.create({
    async onChangeMessageStatus({ messageId, status }) {
      console.log("CHANGE MESSAGE STATUS: ", { messageId, status });
      const changeStatusMessage = ChangeStatusMessage.instance();
      const conversation = await changeStatusMessage.execute({
        messageId,
        status,
      });
      if (conversation) {
        await refreshConversation(conversation.id);
      }
    },
    async onReceivedMessage(props) {
      console.log("RECEIVED MESSAGE: ", props);
      const messageReceived = MessageReceived.instance();
      const response = await messageReceived.execute(props);
      if (!response) return;
      try {
        const sendMessageToLooma = SendMessageToLooma.instance();
        const [conversation] = await Promise.all([
          sendMessageToLooma.execute({
            conversationId: response?.conversation?.id,
            workspaceId: response?.workspaceId,
          }),
          refreshConversation(response?.conversation?.id),
          typingConversation(response?.conversation?.id),
        ]);

        if (conversation) {
          await refreshConversation(conversation?.id);
        }
        await untypingConversation(response?.conversation?.id);
      } catch (err) {
        console.error({ err });
        await untypingConversation(response?.conversation?.id);
      }
    },
  })({
    input: JSON.parse(event.body!),
    request: {
      arrayBuffer: () => getArrayBufferFromEvent(event),
      headers: new Map([
        ["x-hub-signature-256", event.headers["x-hub-signature-256"]],
      ]),
    },
  });
};
