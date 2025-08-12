import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";

export const createConnection = () => drizzle(process.env.DATABASE_URL ?? "");
