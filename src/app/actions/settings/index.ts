"use server";
import { Setting } from "@/core/domain/value-objects/setting";
import { SettingsRepository } from "@/core/infra/repositories/settings-repository";
import z from "zod";
import { securityProcedure } from "../procedure";

const settingsRepository = SettingsRepository.instance();

export const retrieveSettings = securityProcedure([
  "manage:settings",
  "view:settings",
]).handler(async ({ ctx }) => {
  const settings = await settingsRepository.retrieveSettingsByWorkspaceId(
    ctx.membership.workspaceId
  );

  if (!settings) {
    const newSettings = Setting.create();
    return newSettings.raw();
  }

  return settings.raw();
});

export const updateSettings = securityProcedure([
  "manage:settings",
  "update:settings",
])
  .input(
    z.object({
      wabaId: z.string(),
      attendantName: z.string(),
      businessName: z.string(),
      locationAvailable: z.string(),
      paymentMethods: z.string(),
      vectorNamespace: z.string(),
      knowledgeBase: z.string(),
      aiEnabled: z.boolean(),
    })
  )
  .handler(async ({ input, ctx }) => {
    await settingsRepository.upsert(
      ctx.membership.workspaceId,
      Setting.create({
        wabaId: input.wabaId,
        attendantName: input.attendantName,
        businessName: input.businessName,
        locationAvailable: input.locationAvailable,
        paymentMethods: input.paymentMethods,
        vectorNamespace: input.vectorNamespace,
        knowledgeBase: input.knowledgeBase,
        aiEnabled: input.aiEnabled,
      })
    );
  });
