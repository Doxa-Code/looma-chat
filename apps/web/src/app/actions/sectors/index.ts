"use server";

import { SectorsRepository } from "@looma/core/infra/repositories/sectors-respository";
import { securityProcedure } from "../procedure";
import z from "zod";
import { Sector } from "@looma/core/domain/value-objects/sector";

const sectorsRepository = SectorsRepository.instance();

export const listSectors = securityProcedure([
  "manage:sectors",
  "view:sectors",
  "manage:users",
  "view:users",
]).handler(async ({ ctx }) => {
  return await sectorsRepository.list(ctx.membership.workspaceId);
});

export const upsertSector = securityProcedure([
  "manage:sectors",
  "upsert:sectors",
  "manage:users",
  "upsert:users",
])
  .input(
    z.object({
      id: z.string().optional(),
      name: z.string(),
    })
  )
  .handler(async ({ ctx, input }) => {
    const sector = Sector.create(input.name, input.id);
    await sectorsRepository.upsert(ctx.membership.workspaceId, sector!);
  });
