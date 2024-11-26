import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  avatar: text("avatar").notNull(),
  socialFacebook: text("social_facebook"),
  socialTwitter: text("social_twitter"),
  socialInstagram: text("social_instagram"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // restauro, costruzione, ristrutturazione
  image: text("image").notNull(),
  year: integer("year").notNull(),
  location: text("location").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schema definitions
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertTeamMemberSchema = createInsertSchema(teamMembers);
export const selectTeamMemberSchema = createSelectSchema(teamMembers);
export const insertProjectSchema = createInsertSchema(projects);
export const selectProjectSchema = createSelectSchema(projects);

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = z.infer<typeof selectTeamMemberSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = z.infer<typeof selectProjectSchema>;
