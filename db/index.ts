import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import type { User, NewUser } from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const queryClient = postgres(process.env.DATABASE_URL, {
  max: 10,
  ssl: process.env.NODE_ENV === 'production',
  connect_timeout: 10,
});

// Test the connection by making a simple query
const testConnection = async () => {
  try {
    await queryClient`SELECT 1`;
    console.log("Database connection established successfully");
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  }
};

export const db = drizzle(queryClient, { schema });

// Export schema and types for use in other parts of the application
export { schema };
export type { User, NewUser };
