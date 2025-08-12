import "dotenv/config";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Sql } from "postgres";

export const createDatabaseConnection = (): PostgresJsDatabase<
  Record<string, never>
> & {
  $client: Sql<{}>;
} => {
  return drizzle(process.env.DATABASE_URL ?? "");
};
