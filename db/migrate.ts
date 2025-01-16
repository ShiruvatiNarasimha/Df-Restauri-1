import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./index";

async function main() {
  try {
    await migrate(db, {
      migrationsFolder: "drizzle",
    });
    console.log("Migration completed");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
