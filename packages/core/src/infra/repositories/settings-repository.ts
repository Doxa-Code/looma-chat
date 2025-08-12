import { eq } from "drizzle-orm";
import { createDatabaseConnection } from "../database";
import { settings } from "../database/schemas";
import { Setting } from "@/domain/value-objects/setting";

export class SettingsRepository {
  async retrieveSettingsByWorkspaceId(workspaceId: string) {
    if (!workspaceId) return null;

    const db = createDatabaseConnection();

    const [setting] = await db
      .select({
        attendantName: settings.attendantName,
        businessName: settings.businessName,
        wabaId: settings.wabaId,
        locationAvailable: settings.locationAvailable,
        paymentMethods: settings.paymentMethods,
        vectorNamespace: settings.vectorNamespace,
        knowledgeBase: settings.knowledgeBase,
        aiEnabled: settings.aiEnabled,
      })
      .from(settings)
      .where(eq(settings.workspaceId, workspaceId));

    await db.$client.end();

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
        wabaId: input.wabaId,
        attendantName: input.attendantName,
        businessName: input.businessName,
        locationAvailable: input.locationAvailable,
        paymentMethods: input.paymentMethods,
        vectorNamespace: input.vectorNamespace,
        knowledgeBase: input.knowledgeBase,
        aiEnabled: input.aiEnabled,
        workspaceId: setting?.workspaceId || workspaceId,
      })
      .onConflictDoUpdate({
        set: {
          wabaId: input.wabaId,
          attendantName: input.attendantName,
          businessName: input.businessName,
          locationAvailable: input.locationAvailable,
          paymentMethods: input.paymentMethods,
          knowledgeBase: input.knowledgeBase,
          aiEnabled: input.aiEnabled,
          vectorNamespace: input.vectorNamespace,
        },
        target: settings.id,
      });

    await db.$client.end();
  }

  async retrieveWorkspaceIdByWabaId(wabaId: string) {
    const db = createDatabaseConnection();

    const [setting] = await db
      .select({ workspaceId: settings.workspaceId })
      .from(settings)
      .where(eq(settings.wabaId, wabaId));

    await db.$client.end();

    if (!setting) return null;

    return setting.workspaceId;
  }

  async retrieveSettingByWabaId(wabaId: string) {
    const db = createDatabaseConnection();

    const [setting] = await db
      .select({
        attendantName: settings.attendantName,
        businessName: settings.businessName,
        wabaId: settings.wabaId,
        locationAvailable: settings.locationAvailable,
        paymentMethods: settings.paymentMethods,
        vectorNamespace: settings.vectorNamespace,
        knowledgeBase: settings.knowledgeBase,
        aiEnabled: settings.aiEnabled,
      })
      .from(settings)
      .where(eq(settings.wabaId, wabaId));

    await db.$client.end();

    if (!setting) return null;

    return Setting.create(setting);
  }

  static instance() {
    return new SettingsRepository();
  }
}
