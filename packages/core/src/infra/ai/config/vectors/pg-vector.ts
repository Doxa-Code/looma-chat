import { PgVector } from "@mastra/pg";

export const pgVector = new PgVector({
  connectionString: process.env.DATABASE_URL ?? "",
  pgPoolOptions: {
    max: 10,
    idleTimeoutMillis: 30000,
  },
});
