import { Membership } from "@looma/core/domain/entities/membership";
import { PolicyName } from "@looma/core/domain/services/authorization-service";
import { and, eq } from "drizzle-orm";
import { createDatabaseConnection } from "../database";
import { memberships } from "../database/schemas";

export class MembershipsRepository {
  async upsert(membership: Membership) {
    const db = createDatabaseConnection();
    await db
      .insert(memberships)
      .values({
        id: membership.id,
        userId: membership.userId,
        workspaceId: membership.workspaceId,
        permissions: membership.permissions,
      })
      .onConflictDoUpdate({
        set: {
          userId: membership.userId,
          workspaceId: membership.workspaceId,
          permissions: membership.permissions,
        },
        target: memberships.id,
      });
    await db.$client.end();
  }
  async retrieveByUserIdAndWorkspaceId(userId: string, workspaceId: string) {
    if (!userId || !workspaceId) return null;

    const db = createDatabaseConnection();

    const [membership] = await db
      .select({
        id: memberships.id,
        workspaceId: memberships.workspaceId,
        userId: memberships.userId,
        permissions: memberships.permissions,
      })
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.workspaceId, workspaceId)
        )
      );

    await db.$client.end();

    if (!membership) return null;

    return Membership.instance({
      id: membership.id,
      permissions: membership.permissions as PolicyName[],
      userId: membership.userId,
      workspaceId: membership.workspaceId,
    });
  }

  async retrieveFirstByUserId(userId: string) {
    const db = createDatabaseConnection();

    const [membership] = await db
      .select({
        id: memberships.id,
        workspaceId: memberships.workspaceId,
        userId: memberships.userId,
        permissions: memberships.permissions,
      })
      .from(memberships)
      .where(eq(memberships.userId, userId));

    await db.$client.end();

    if (!membership) return null;

    return Membership.instance({
      id: membership.id,
      permissions: membership.permissions as PolicyName[],
      userId: membership.userId,
      workspaceId: membership.workspaceId,
    });
  }
  static instance() {
    return new MembershipsRepository();
  }
}
