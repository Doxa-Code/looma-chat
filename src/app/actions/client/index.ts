"use server";
import { NotFound } from "@/core/domain/errors/not-found";
import { Address } from "@/core/domain/value-objects/address";
import { ClientsRepository } from "@/core/infra/repositories/clients-repository";
import z from "zod";
import { AddressRepository } from "./../../../core/infra/repositories/addresses-repository";
import { securityProcedure } from "./../procedure";

const clientsRepository = ClientsRepository.instance();
const addressRepository = AddressRepository.instance();

export const changeClientAddress = securityProcedure(["manage:cart"])
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
  .handler(async ({ input }) => {
    const client = await clientsRepository.retrieveByPhone(input.phone);

    if (!client) throw NotFound.instance("Client");

    const newAddress = Address.create({
      id: client.address?.id,
      ...input.address,
    });

    await addressRepository.upsertAddress(newAddress);

    return;
  });

export const retrieveClient = securityProcedure(["manage:cart"])
  .input(
    z.object({
      phone: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const client = await clientsRepository.retrieveByPhone(input.phone);

    if (!client) throw NotFound.instance("Client");

    return client;
  });
