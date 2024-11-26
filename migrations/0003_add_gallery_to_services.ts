import { sql } from "drizzle-orm";

export async function up(db) {
  await db.schema.alterTable("services").addColumn("gallery", "json");
}

export async function down(db) {
  await db.schema.alterTable("services").dropColumn("gallery");
}
