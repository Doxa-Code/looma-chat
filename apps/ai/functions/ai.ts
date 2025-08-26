import { ChangeStatusMessage } from "@looma/core/application/command/change-status-message";
import { MessageReceived } from "@looma/core/application/command/message-received";
import { SendMessageToLooma } from "@looma/core/application/command/send-message-to-looma";
import { RegisterMessaging } from "@looma/core/application/queries/register-messaging";
import { MetaController } from "@looma/core/infra/controllers/meta-controller";
import type { APIGatewayEvent } from "aws-lambda";

function getArrayBufferFromEvent(event: APIGatewayEvent): ArrayBuffer {
  const buffer = event.isBase64Encoded
    ? Buffer.from(event.body!, "base64")
    : Buffer.from(event.body!);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
}

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
  return await MetaController.create({
    async onChangeMessageStatus({ messageId, status }) {
      const changeStatusMessage = ChangeStatusMessage.instance();
      const conversation = await changeStatusMessage.execute({
        messageId,
        status,
      });
      // if (conversation) {
      //   sseEmitter.emit("message", conversation.raw());
      // }
    },
    async onReceivedMessage(props) {
      try {
        const messageReceived = MessageReceived.instance();
        console.log("MESSAGE RECEIVED:", { props });
        const response = await messageReceived.execute(props);
        console.log({ response });
        if (!response) return;
        // if (response.conversation) {
        //   sseEmitter.emit("message", response?.conversation?.raw());
        // }
        // sseEmitter.emit("typing");
        const sendMessageToLooma = SendMessageToLooma.instance();
        const conversation = await sendMessageToLooma.execute({
          conversationId: response.conversation.id,
          workspaceId: response.workspaceId,
        });
        // if (conversation) {
        //   sseEmitter.emit("message", conversation?.raw());
        // }
        // sseEmitter.emit("untyping");
      } catch (err) {
        console.error({ err });
        // sseEmitter.emit("untyping");
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
