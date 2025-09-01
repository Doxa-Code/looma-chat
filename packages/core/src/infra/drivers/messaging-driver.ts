import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { randomUUID } from "node:crypto";

type SendMessageToQueueProps = {
  queueUrl: string;
  body: string;
  groupId: string;
  messageId: string;
  delay?: number;
};

interface MessagingDriver {
  sendMessageToQueue(data: SendMessageToQueueProps): Promise<boolean>;
}

export class SQSMessagingDriver implements MessagingDriver {
  async sendMessageToQueue(data: SendMessageToQueueProps): Promise<boolean> {
    const sqsClient = new SQSClient({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      region: process.env.AWS_DEFAULT_REGION!,
    });

    const command = new SendMessageCommand({
      QueueUrl: data.queueUrl,
      MessageBody: data.body,
      MessageGroupId: data.groupId,
      MessageDeduplicationId: data.messageId,
      DelaySeconds: data.delay,
    });
    console.log(command);
    const response = await sqsClient.send(command);
    console.log("MESSAGE SEND: ", response.$metadata.httpStatusCode);

    return true;
  }
  static instance() {
    return new SQSMessagingDriver();
  }
}
