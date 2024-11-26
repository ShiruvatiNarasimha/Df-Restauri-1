import { sql } from "drizzle-orm";

export async function up(db) {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `.execute(db);
}

export async function down(db) {
  await sql`
    DROP TABLE IF EXISTS users;
  `.execute(db);
}
