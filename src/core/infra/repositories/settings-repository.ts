import { eq } from "drizzle-orm";
import { createConnection } from "../database";
import { settings } from "../database/schemas";
import { Setting } from "@/core/domain/value-objects/setting";

export class SettingsRepository {
  async retrieveSettingsByWorkspaceId(workspaceId: string) {
    const db = createConnection();

    const [setting] = await db
      .select({ wabaId: settings.wabaId })
      .from(settings)
      .where(eq(settings.workspaceId, workspaceId));

    await db.$client.end();

    if (!setting) return null;

    return Setting.create(setting);
  }

  async upsert(workspaceId: string, input: Setting) {
    const db = createConnection();

    const response = await db
      .select({
        id: settings.id,
        wabaId: settings.wabaId,
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
        workspaceId: setting?.workspaceId || workspaceId,
      })
      .onConflictDoUpdate({
        set: {
          wabaId: input.wabaId,
        },
        target: settings.id,
      });

    await db.$client.end();
  }

  async retrieveWorkspaceIdByWabaId(wabaId: string) {
    const db = createConnection();

    const [setting] = await db
      .select({ workspaceId: settings.workspaceId })
      .from(settings)
      .where(eq(settings.wabaId, wabaId));

    await db.$client.end();

    if (!setting) return null;

    return setting.workspaceId;
  }

  async retrieveSettingByWabaId(wabaId: string) {
    const db = createConnection();

    const [setting] = await db
      .select({ wabaId: settings.wabaId })
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
