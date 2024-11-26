import { sql } from "drizzle-orm";
import { pgTable, integer, timestamp } from "drizzle-orm/pg-core";

export async function up(db) {
  await db.schema.alterTable("projects").addColumn("imageOrder", "integer[]");
  await db.schema.alterTable("services").addColumn("imageOrder", "integer[]");
}

export async function down(db) {
  await db.schema.alterTable("projects").dropColumn("imageOrder");
  await db.schema.alterTable("services").dropColumn("imageOrder");
}
