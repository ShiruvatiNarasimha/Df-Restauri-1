import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  throw new Error("DATABASE_URL is required in production mode");
}

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  out: "./migrations",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  ...(databaseUrl ? {
    dbCredentials: {
      url: databaseUrl,
    },
  } : {}),
});
