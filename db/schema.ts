import { pgTable, text, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  image: text("image").notNull(),
  year: integer("year").notNull(),
  location: text("location").notNull(),
  imageOrder: json("image_order").$type<{ id: string; order: number }[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const team = pgTable("team", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  bio: text("bio").notNull(),
  image: text("image").notNull(),
  socialLinks: json("social_links").$type<{ platform: string; url: string }[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  category: text("category").notNull(),
  features: json("features").$type<string[]>(),
  imageOrder: json("image_order").$type<{ id: string; order: number }[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schema validators
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertProjectSchema = createInsertSchema(projects);
export const selectProjectSchema = createSelectSchema(projects);
export const insertTeamSchema = createInsertSchema(team);
export const selectTeamSchema = createSelectSchema(team);
export const insertServiceSchema = createInsertSchema(services);
export const selectServiceSchema = createSelectSchema(services);

// Types
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Project = z.infer<typeof selectProjectSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type TeamMember = z.infer<typeof selectTeamSchema>;
export type InsertTeamMember = z.infer<typeof insertTeamSchema>;
export type Service = z.infer<typeof selectServiceSchema>;
export type InsertService = z.infer<typeof insertServiceSchema>;
