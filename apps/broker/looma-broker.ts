import type { SQSEvent, SQSHandler } from "aws-lambda";

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body);

    console.log("Recebendo mensagem:", body);
  }
};
