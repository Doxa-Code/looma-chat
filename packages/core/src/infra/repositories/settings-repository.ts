import { and, eq } from "drizzle-orm";
import { createDatabaseConnection } from "../database";
import { settings } from "../database/schemas";
import { Setting } from "../../domain/value-objects/setting";

export class SettingsDatabaseRepository {
  async retrieveSettingsByWorkspaceId(workspaceId: string) {
    if (!workspaceId) return null;

    const db = createDatabaseConnection();

    const [setting] = await db
      .select({
        phoneId: settings.phoneId,
        attendantName: settings.attendantName,
        businessName: settings.businessName,
        wabaId: settings.wabaId,
        locationAvailable: settings.locationAvailable,
        paymentMethods: settings.paymentMethods,
        vectorNamespace: settings.vectorNamespace,
        knowledgeBase: settings.knowledgeBase,
        aiEnabled: settings.aiEnabled,
        queueURL: settings.queueURL,
        openingHours: settings.openingHours,
      })
      .from(settings)
      .where(eq(settings.workspaceId, workspaceId));

    if (!setting) return null;

    return Setting.create(setting);
  }

  async upsert(workspaceId: string, input: Setting) {
    const db = createDatabaseConnection();

    const response = await db
      .select({
        id: settings.id,
        workspaceId: settings.workspaceId,
      })
      .from(settings)
      .where(eq(settings.workspaceId, workspaceId));

    const setting = response?.[0];

    await db
      .insert(settings)
      .values({
        id: setting?.id || crypto.randomUUID().toString(),
        phoneId: input.phoneId,
        wabaId: input.wabaId,
        attendantName: input.attendantName,
        businessName: input.businessName,
        locationAvailable: input.locationAvailable,
        paymentMethods: input.paymentMethods,
        vectorNamespace: input.vectorNamespace,
        knowledgeBase: input.knowledgeBase,
        aiEnabled: input.aiEnabled,
        workspaceId: setting?.workspaceId || workspaceId,
        queueURL: input.queueURL,
        openingHours: input.openingHours,
      })
      .onConflictDoUpdate({
        set: {
          wabaId: input.wabaId,
          phoneId: input.phoneId,
          attendantName: input.attendantName,
          businessName: input.businessName,
          locationAvailable: input.locationAvailable,
          paymentMethods: input.paymentMethods,
          knowledgeBase: input.knowledgeBase,
          aiEnabled: input.aiEnabled,
          vectorNamespace: input.vectorNamespace,
          queueURL: input.queueURL,
          openingHours: input.openingHours,
        },
        target: settings.id,
      });
  }

  async retrieveSettingByWabaIdAndPhoneId(wabaId: string, phoneId: string) {
    const db = createDatabaseConnection();

    const [setting] = await db
      .select({
        attendantName: settings.attendantName,
        phoneId: settings.phoneId,
        businessName: settings.businessName,
        wabaId: settings.wabaId,
        locationAvailable: settings.locationAvailable,
        paymentMethods: settings.paymentMethods,
        vectorNamespace: settings.vectorNamespace,
        knowledgeBase: settings.knowledgeBase,
        aiEnabled: settings.aiEnabled,
        workspaceId: settings.workspaceId,
        queueURL: settings.queueURL,
        openingHours: settings.openingHours,
      })
      .from(settings)
      .where(and(eq(settings.wabaId, wabaId), eq(settings.phoneId, phoneId)));

    if (!setting) return null;

    return {
      setting: Setting.create(setting),
      workspaceId: setting.workspaceId,
    };
  }

  static instance() {
    return new SettingsDatabaseRepository();
  }
}
