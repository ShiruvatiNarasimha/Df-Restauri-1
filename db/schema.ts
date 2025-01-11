import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";
import type { InferModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  
