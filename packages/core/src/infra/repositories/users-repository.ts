import { and, eq } from "drizzle-orm";
import { createDatabaseConnection } from "../database";
import { memberships, sectors, users } from "../database/schemas";
import { User } from "../../domain/entities/user";
import { Sector } from "../../domain/value-objects/sector";
import { PolicyName } from "../../domain/services/authorization-service";

export class UsersRepository {
  async retrieveUserByEmail(email: string): Promise<User | null> {
    const db = createDatabaseConnection();

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        thumbnail: users.thumbnail,
        sector: sectors,
        type: users?.type,
      })
      .from(users)
      .leftJoin(sectors, eq(users.sectorId, sectors.id))
      .where(eq(users.email, email));

    if (!user) return null;

    return User.instance({
      id: user.id,
      name: user.name,
      thumbnail: user.thumbnail,
      email: user.email,
      sector: user.sector
        ? Sector.create(user.sector?.name, user.sector?.id)
        : null,
      type: user?.type,
    });
  }

  async retrieve(id: string): Promise<User | null> {
    if (!id) return null;

    const db = createDatabaseConnection();

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        thumbnail: users.thumbnail,
        sector: sectors,
        type: users?.type,
      })
      .from(users)
      .leftJoin(sectors, eq(users.sectorId, sectors.id))
      .where(eq(users.id, id));

    if (!user) return null;

    return User.instance({
      id: user.id,
      name: user.name,
      thumbnail: user.thumbnail,
      email: user.email,
      sector: user.sector
        ? Sector.create(user.sector?.name, user.sector?.id)
        : null,
      type: user?.type,
    });
  }

  async list(workspaceId: string) {
    if (!workspaceId) return [];
    const db = createDatabaseConnection();

    const response = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        sector: {
          id: sectors.id,
          name: sectors.name,
        },
        type: users?.type,
        permissions: memberships.permissions,
      })
      .from(memberships)
      .leftJoin(users, eq(users.id, memberships.userId))
      .leftJoin(sectors, eq(users.sectorId, sectors.id))
      .where(eq(memberships.workspaceId, workspaceId));

    return response as {
      id: string;
      name: string;
      email: string;
      sector: {
        id: string;
        name: string;
      };
      type: User.Type;
      permissions: PolicyName[];
    }[];
  }

  async upsert(user: User) {
    const db = createDatabaseConnection();

    await db
      .insert(users)
      .values({
        id: user.id,
        email: user.email,
        name: user.name,
        type: user?.type,
        sectorId: user.sector?.id ?? null,
      })
      .onConflictDoUpdate({
        set: {
          email: user.email,
          name: user.name,
          type: user?.type,
          sectorId: user.sector?.id ?? null,
        },
        target: users.id,
      });
  }

  async retrievePassword(userId: string) {
    const db = createDatabaseConnection();

    const [user] = await db
      .select({
        password: users.password,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) return null;

    return user.password;
  }

  async remove(userId: string) {
    const db = createDatabaseConnection();
    await db.transaction(async (tx) => {
      await tx.delete(memberships).where(eq(memberships.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });
  }

  async setPassword(userId: string, password: string) {
    const db = createDatabaseConnection();
    await db
      .insert(users)
      .values({
        id: userId,
        password,
      })
      .onConflictDoUpdate({
        set: { password },
        target: users.id,
      });
  }

  async retrieveLoomaUser(workspaceId: string) {
    const db = createDatabaseConnection();

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        thumbnail: users.thumbnail,
        sector: sectors,
        type: users?.type,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .leftJoin(sectors, eq(users.sectorId, sectors.id))
      .where(
        and(
          eq(users.email, "looma@doxacode.com.br"),
          eq(memberships.workspaceId, workspaceId)
        )
      );

    if (!user) return null;

    return User.instance({
      id: user.id,
      name: user.name,
      thumbnail: user.thumbnail,
      email: user.email,
      sector: user.sector
        ? Sector.create(user.sector?.name, user.sector?.id)
        : null,
      type: user?.type,
    });
  }

  static instance() {
    return new UsersRepository();
  }
}
