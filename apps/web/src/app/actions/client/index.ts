"use server";
import { ChangeClientAddress } from "@looma/core/application/command/change-client-address";
import { NotFound } from "@looma/core/domain/errors/not-found";
import { ClientsDatabaseRepository } from "@looma/core/infra/repositories/clients-repository";
import z from "zod";
import { securityProcedure } from "./../procedure";

const clientsRepository = ClientsDatabaseRepository.instance();

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
    const changeClientAddress = ChangeClientAddress.instance();
    await changeClientAddress.execute({
      address: input.address,
      phone: input.phone,
      workspaceId: ctx.membership.workspaceId,
    });
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

    if (!client) throw NotFound.throw("Client");

    return client;
  });
