import bcrypt from "bcrypt";
import { db } from "@db/index";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 12;
const DEFAULT_ADMIN = {
  username: "admin",
  // Complex password meeting our requirements:
  // At least 8 chars, uppercase, lowercase, number, special char
  password: "Admin@DF2024!",
  role: "admin"
} as const;

async function createDefaultAdmin() {
  try {
    // First check if admin user already exists
    const existingAdmin = await db.select()
      .from(users)
      .where(eq(users.username, DEFAULT_ADMIN.username))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log("Admin account already exists");
      return existingAdmin[0];
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, SALT_ROUNDS);
    
    const [admin] = await db.insert(users).values({
      username: DEFAULT_ADMIN.username,
      password: hashedPassword,
      role: DEFAULT_ADMIN.role
    }).returning();

    console.log("Admin account created successfully");
    return admin;
  } catch (error) {
    console.error("Error creating admin account:", error);
    throw error;
  }
}

// Execute the function
createDefaultAdmin().catch(console.error);
