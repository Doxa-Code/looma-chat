"use server";
import { NotFound } from "@looma/core/domain/errors/not-found";
import { Address } from "@looma/core/domain/value-objects/address";
import { ClientsRepository } from "@looma/core/infra/repositories/clients-repository";
import z from "zod";
import { securityProcedure } from "./../procedure";
import { AddressesRepository } from "@looma/core/infra/repositories/addresses-repository";

const clientsRepository = ClientsRepository.instance();
const addressesRepository = AddressesRepository.instance();

export const changeClientAddress = securityProcedure(["manage:carts"])
  .input(
    z.object({
      phone: z.string(),
      address: z.object({
        street: z.string(),
        number: z.string(),
        neighborhood: z.string(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        country: z.string(),
        note: z.string().nullable(),
      }),
    })
  )
  .handler(async ({ input, ctx }) => {
    const client = await clientsRepository.retrieveByPhone(
      input.phone,
      ctx.membership.workspaceId
    );

    if (!client) throw NotFound.instance("Client");

    const newAddress = Address.create({
      id: client.address?.id,
      ...input.address,
    });

    await addressesRepository.upsertAddress(newAddress);

    return;
  });

export const retrieveClient = securityProcedure(["manage:carts"])
  .input(
    z.object({
      phone: z.string(),
    })
  )
  .handler(async ({ input, ctx }) => {
    const client = await clientsRepository.retrieveByPhone(
      input.phone,
      ctx.membership.workspaceId
    );

    if (!client) throw NotFound.instance("Client");

    return client;
  });
