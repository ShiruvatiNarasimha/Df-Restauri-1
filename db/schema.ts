import { pgTable, text, integer, timestamp, varchar, json, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table for admin authentication
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Team members table
export const teamMembers = pgTable("team_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  role: text("role").notNull(),
  bio: text("bio"),
  imageUrl: text("image_url"),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // e.g., 'restauro', 'costruzione', 'ristrutturazione'
  location: text("location"),
  completionDate: timestamp("completion_date"),
  coverImage: text("cover_image"),
  gallery: json("gallery").$type<string[]>().default([]).notNull(), // Array of image URLs
  client: text("client"),
  duration: text("duration"),
  techniques: json("techniques").$type<string[]>().default([]),
  details: text("details"),
  year: integer("year"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service images table
export const serviceImages = pgTable("service_images", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  serviceType: text("service_type").notNull(), // e.g., 'restauro', 'costruzione', 'ristrutturazione'
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertTeamMemberSchema = createInsertSchema(teamMembers);
export const selectTeamMemberSchema = createSelectSchema(teamMembers);

// Project schemas with custom gallery validation
export const insertProjectSchema = createInsertSchema(projects, {
  gallery: z.array(z.string()).default([]),
  techniques: z.array(z.string()).optional(),
});

export const selectProjectSchema = createSelectSchema(projects, {
  gallery: z.array(z.string()),
  techniques: z.array(z.string()).optional(),
});

export const insertServiceImageSchema = createInsertSchema(serviceImages);
export const selectServiceImageSchema = createSelectSchema(serviceImages);

// Export types
export type User = z.infer<typeof selectUserSchema>;
export type TeamMember = z.infer<typeof selectTeamMemberSchema>;
export type Project = z.infer<typeof selectProjectSchema>;
export type ServiceImage = z.infer<typeof selectServiceImageSchema>;
