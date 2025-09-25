"use server";
import { SyncWaba } from "@looma/core/application/command/sync-waba";
import { Setting } from "@looma/core/domain/value-objects/setting";
import { MetaMessageDriver } from "@looma/core/infra/drivers/message-driver";
import { SettingsDatabaseRepository } from "@looma/core/infra/repositories/settings-repository";
import z from "zod";
import { securityProcedure } from "../procedure";

const settingsRepository = SettingsDatabaseRepository.instance();
const messaging = MetaMessageDriver.instance();

export const retrieveSettings = securityProcedure([
  "manage:settings",
  "view:settings",
])
  .input(z.object({ id: z.string().optional() }).optional())
  .handler(async ({ ctx, input }) => {
    const settings = await settingsRepository.retrieveSettingsByWorkspaceId(
      input?.id || ctx.membership.workspaceId
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

export const syncWaba = securityProcedure([
  "manage:settings",
  "update:settings",
])
  .input(
    z.object({
      code: z.string(),
    })
  )
  .onError(async (err) => {
    console.log(err);
  })
  .handler(async ({ ctx, input }) => {
    await SyncWaba.instance().execute({
      code: input.code,
      workspaceId: ctx.membership.workspaceId,
    });
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
      knowledgeBase: z.string(),
      aiEnabled: z.boolean(),
      queueURL: z.string(),
      openingHours: z.string(),
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
        knowledgeBase: input.knowledgeBase,
        aiEnabled: input.aiEnabled,
        queueURL: input.queueURL,
        openingHours: input.openingHours,
      })
    );
  });
