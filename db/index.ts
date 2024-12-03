import { drizzle } from "drizzle-orm/neon-serverless";
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

neonConfig.fetchConnectionCache = true;
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql as any, { schema });
