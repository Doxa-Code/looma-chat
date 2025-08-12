import { Client } from "@looma/core/domain/entities/client";
import { Address } from "@looma/core/domain/value-objects/address";
import { Contact } from "@looma/core/domain/value-objects/contact";
import { ClientsRepository } from "@looma/core/infra/repositories/clients-repository";
import type { SQSEvent, SQSHandler } from "aws-lambda";
import z from "zod";

const clientValidate = z.object({
  workspaceId: z.string(),
  client: z.object({
    id: z.string(),
    contact: z.object({
      phone: z.string(),
      name: z.string(),
    }),
    address: z
      .object({
        street: z.string(),
        number: z.string(),
        neighborhood: z.string(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        country: z.string(),
        note: z.string().nullable(),
      })
      .nullable(),
  }),
});

const clientsRepository = ClientsRepository.instance();

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body) as Client.Props;
    const result = await clientValidate.safeParseAsync(body);

    if (!result.success) {
      return;
    }

    const client = Client.instance({
      ...result.data.client,
      address: result?.data?.client?.address
        ? Address.create(result?.data?.client?.address)
        : null,
      contact: Contact.create(
        result.data.client.contact.phone,
        result.data.client.contact.name
      ),
    });

    await clientsRepository.upsert(client, result.data.workspaceId);
  }
};
