import { sql } from 'drizzle-orm';
import { pgTable, json } from 'drizzle-orm/pg-core';

export async function up(db: any) {
  await db.execute(sql`
    ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS image_order jsonb;
  `);
}

export async function down(db: any) {
  await db.execute(sql`
    ALTER TABLE projects
    DROP COLUMN IF EXISTS image_order;
  `);
}
