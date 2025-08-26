import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { randomUUID } from "node:crypto";

type SendDataToQueueProps = {
  queueURL: string;
  data: unknown;
  workspaceId: string;
  operation: "orderCart" | "upsertProduct" | "removeProduct" | "cancelCart";
};

interface MessagingDriver {
  sendDataToQueue(data: SendDataToQueueProps): Promise<boolean>;
}

export class SQSMessagingDriver implements MessagingDriver {
  async sendDataToQueue(data: SendDataToQueueProps): Promise<boolean> {
    const sqsClient = new SQSClient({});

    const params = {
      QueueUrl: data.queueURL,
      MessageBody: JSON.stringify({
        data: data.data,
        workspaceId: data.workspaceId,
        operation: data.operation,
      }),
      MessageGroupId: "defaultGroup",
      MessageDeduplicationId: randomUUID(),
    };

    const command = new SendMessageCommand(params);
    const response = await sqsClient.send(command);
    console.log(response);

    return true;
  }
  static instance() {
    return new SQSMessagingDriver();
  }
}
