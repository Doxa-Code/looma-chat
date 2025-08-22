"use server";

import { UpsertSector } from "@looma/core/application/command/upsert-sector";
import { SectorsDatabaseRepository } from "@looma/core/infra/repositories/sectors-respository";
import z from "zod";
import { securityProcedure } from "../procedure";

const sectorsRepository = SectorsDatabaseRepository.instance();

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
    const upsertSector = UpsertSector.instance();
    await upsertSector.execute({
      id: input.id,
      name: input.name,
      workspaceId: ctx.membership.workspaceId,
    });
  });
