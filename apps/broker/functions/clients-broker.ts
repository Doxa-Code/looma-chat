import { Client } from "@looma/core/domain/entities/client";
import { Address } from "@looma/core/domain/value-objects/address";
import { Contact } from "@looma/core/domain/value-objects/contact";
import { ClientsRepository } from "@looma/core/infra/repositories/clients-repository";
import type { SQSEvent, SQSHandler } from "aws-lambda";
import z from "zod";

const clientValidate = z.object({
  workspaceId: z.string(),
  client: z.object({
    partnerId: z.string(),
    id: z.string(),
    contact: z.object({
      phone: z.string(),
      name: z.string(),
    }),
    address: z
      .object({
        street: z.string().optional(),
        number: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        country: z.string().optional(),
        note: z
          .string()
          .nullish()
          .transform((note) => note ?? ""),
      })
      .nullable(),
  }),
});

const clientsRepository = ClientsRepository.instance();

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body) as Client.Props;
    const result = await clientValidate.safeParseAsync(body);

    if (
      !result.success ||
      !result?.data?.client?.contact?.phone ||
      result?.data?.client?.contact?.phone !== "<nil>"
    ) {
      console.log({
        error: result.error,
        body: JSON.stringify(body, null, 2),
      });
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

    console.log(client.contact.name, " adicionada!");

    await clientsRepository.upsert(
      client,
      result.data.workspaceId,
      result.data.client.partnerId
    );
  }
};
