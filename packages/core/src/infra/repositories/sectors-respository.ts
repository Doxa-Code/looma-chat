import { Sector, SectorRaw } from "@/domain/value-objects/sector";
import { eq } from "drizzle-orm";
import { createDatabaseConnection } from "../database";
import { sectors } from "../database/schemas";

export class SectorsRepository {
  async retrieve(sectorId?: string) {
    if (!sectorId) return null;
    const db = createDatabaseConnection();
    const [sector] = await db
      .select()
      .from(sectors)
      .where(eq(sectors.id, sectorId));
    await db.$client.end();

    if (!sector) return null;

    return Sector.create(sector.name, sector.id);
  }

  async list(workspaceId: string): Promise<SectorRaw[]> {
    const db = createDatabaseConnection();
    const response = await db
      .select()
      .from(sectors)
      .where(eq(sectors.workspaceId, workspaceId));
    await db.$client.end();

    return response.map((sector) => ({ id: sector.id, name: sector.name }));
  }

  async upsert(workspaceId: string, sector: Sector): Promise<void> {
    const db = createDatabaseConnection();
    await db
      .insert(sectors)
      .values({
        id: sector.id,
        name: sector.name,
        workspaceId,
      })
      .onConflictDoUpdate({
        set: {
          name: sector.name,
        },
        target: sectors.id,
      });
    await db.$client.end();
  }

  static instance() {
    return new SectorsRepository();
  }
}
