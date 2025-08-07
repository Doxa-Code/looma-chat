import { and, eq } from "drizzle-orm";
import { createConnection } from "../database";
import { memberships, sectors, users } from "../database/schemas";
import { User } from "@/core/domain/entities/user";
import { Sector } from "@/core/domain/value-objects/sector";

export class UsersRepository {
  async retrieveUserByEmail(email: string): Promise<User | null> {
    const db = createConnection();

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        thumbnail: users.thumbnail,
        sector: sectors,
        type: users.type,
      })
      .from(users)
      .leftJoin(sectors, eq(users.sectorId, sectors.id))
      .where(eq(users.email, email));

    await db.$client.end();

    if (!user) return null;

    return User.instance({
      id: user.id,
      name: user.name,
      thumbnail: user.thumbnail,
      email: user.email,
      sector: user.sector
        ? Sector.create(user.sector?.name, user.sector?.id)
        : null,
      type: user.type,
    });
  }

  async retrieve(id: string): Promise<User | null> {
    if (!id) return null;

    const db = createConnection();

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        thumbnail: users.thumbnail,
        sector: sectors,
        type: users.type,
      })
      .from(users)
      .leftJoin(sectors, eq(users.sectorId, sectors.id))
      .where(eq(users.id, id));

    await db.$client.end();

    if (!user) return null;

    return User.instance({
      id: user.id,
      name: user.name,
      thumbnail: user.thumbnail,
      email: user.email,
      sector: user.sector
        ? Sector.create(user.sector?.name, user.sector?.id)
        : null,
      type: user.type,
    });
  }

  async list(workspaceId: string) {
    const db = createConnection();

    const response = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        sector: {
          id: sectors.id,
          name: sectors.name,
        },
        type: users.type,
        permissions: memberships.permissions,
      })
      .from(memberships)
      .leftJoin(users, eq(users.id, memberships.userId))
      .leftJoin(sectors, eq(users.sectorId, sectors.id))
      .where(eq(memberships.workspaceId, workspaceId));

    await db.$client.end();

    return response;
  }

  async upsert(user: User) {
    const db = createConnection();

    await db
      .insert(users)
      .values({
        id: user.id,
        email: user.email,
        name: user.name,
        type: user.type,
        sectorId: user.sector?.id ?? null,
      })
      .onConflictDoUpdate({
        set: {
          email: user.email,
          name: user.name,
          type: user.type,
          sectorId: user.sector?.id ?? null,
        },
        target: users.id,
      });

    await db.$client.end();
  }

  async retrievePassword(userId: string) {
    const db = createConnection();

    const [user] = await db
      .select({
        password: users.password,
      })
      .from(users)
      .where(eq(users.id, userId));

    await db.$client.end();

    if (!user) return null;

    return user.password;
  }

  async remove(userId: string) {
    const db = createConnection();
    await db.transaction(async (tx) => {
      await tx.delete(memberships).where(eq(memberships.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });
    await db.$client.end();
  }

  async setPassword(userId: string, password: string) {
    const db = createConnection();
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
    await db.$client.end();
  }

  async retrieveLoomaUser(workspaceId: string) {
    const db = createConnection();

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        thumbnail: users.thumbnail,
        sector: sectors,
        type: users.type,
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

    await db.$client.end();

    if (!user) return null;

    return User.instance({
      id: user.id,
      name: user.name,
      thumbnail: user.thumbnail,
      email: user.email,
      sector: user.sector
        ? Sector.create(user.sector?.name, user.sector?.id)
        : null,
      type: user.type,
    });
  }

  static instance() {
    return new UsersRepository();
  }
}
