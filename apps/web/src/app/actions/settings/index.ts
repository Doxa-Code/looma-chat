"use server";
import { Setting } from "@looma/core/domain/value-objects/setting";
import { SettingsRepository } from "@looma/core/infra/repositories/settings-repository";
import z from "zod";
import { securityProcedure } from "../procedure";
import { MetaMessageDriver } from "@looma/core/infra/drivers/message-driver";

const settingsRepository = SettingsRepository.instance();
const messaging = MetaMessageDriver.instance();

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

export const listPhonesId = securityProcedure([
  "manage:settings",
  "update:settings",
]).handler(async ({ ctx }) => {
  const setting = await settingsRepository.retrieveSettingsByWorkspaceId(
    ctx.membership.workspaceId
  );
  if (!setting || !setting.wabaId) return [];
  return await messaging.listPhonesId(setting.wabaId);
});

export const updateSettings = securityProcedure([
  "manage:settings",
  "update:settings",
])
  .input(
    z.object({
      wabaId: z.string(),
      phoneId: z.string(),
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
        phoneId: input.phoneId,
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
