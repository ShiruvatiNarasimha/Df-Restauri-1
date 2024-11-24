import { db } from "../db";
import { users } from "../db/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdminUser(username: string, password: string) {
  const hashedPassword = await hashPassword(password);
  
  const [admin] = await db
    .insert(users)
    .values({
      username,
      password: hashedPassword,
      isAdmin: true,
    })
    .returning();

  console.log("Admin user created successfully:", {
    id: admin.id,
    username: admin.username,
    isAdmin: admin.isAdmin,
  });
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log("Usage: ts-node createAdmin.ts <username> <password>");
  process.exit(1);
}

const [username, password] = args;
createAdminUser(username, password).catch(console.error);
