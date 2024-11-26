import { sql } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function up() {
  const hashedPassword = await hashPassword('DF_Restauri_2024!');
  
  return sql`
    INSERT INTO users (username, password, is_admin)
    VALUES ('admin', ${hashedPassword}, true)
    ON CONFLICT (username) DO NOTHING;
  `;
}

export async function down() {
  return sql`
    DELETE FROM users WHERE username = 'admin';
  `;
}
