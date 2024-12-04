import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const queryClient = postgres(process.env.DATABASE_URL, {
  max: 10, // Max number of connections
  idle_timeout: 20, // Max seconds a connection can be idle
  connect_timeout: 10, // Max seconds to wait for a connection
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

testConnection();

export const db = drizzle(queryClient, {
  schema,
});
