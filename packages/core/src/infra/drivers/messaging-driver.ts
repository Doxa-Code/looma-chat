import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
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

    const sqsClient = new SQSClient();

    const params = {
      QueueUrl: this.queue.get(data.queueName),
      MessageBody: JSON.stringify(data.data),
      MessageGroupId: "defaultGroup",
    };

    const command = new SendMessageCommand(params);
    await sqsClient.send(command);

    return true;
  }
  static instance() {
    return new SQSMessagingDriver();
  }
}
