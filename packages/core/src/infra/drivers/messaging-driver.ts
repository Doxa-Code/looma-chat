import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { randomUUID } from "node:crypto";
type SendDataToQueueProps = {
  queueName: "carts";
  data: unknown;
  workspaceId: string;
};

interface MessagingDriver {
  sendDataToQueue(data: SendDataToQueueProps): Promise<boolean>;
}

export class SQSMessagingDriver implements MessagingDriver {
  private readonly queue = new Map<"carts", string>([
    [
      "carts",
      "https://sqs.us-east-1.amazonaws.com/557130579131/looma-broker-production-UpsertCartQueue.fifo",
    ],
  ]);
  async sendDataToQueue(data: SendDataToQueueProps): Promise<boolean> {
    if (!this.queue.has(data.queueName)) return false;

    const sqsClient = new SQSClient({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      region: process.env.AWS_DEFAULT_REGION,
    });

    const params = {
      QueueUrl: this.queue.get(data.queueName),
      MessageBody: JSON.stringify(data.data),
      MessageGroupId: "defaultGroup",
      MessageDeduplicationId: randomUUID(),
    };

    const command = new SendMessageCommand(params);
    await sqsClient.send(command);

    return true;
  }
  static instance() {
    return new SQSMessagingDriver();
  }
}
