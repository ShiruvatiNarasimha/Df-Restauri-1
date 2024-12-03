import { z } from "zod";

export interface ServiceImage {
  id: string;
  serviceType: "restauro" | "costruzione" | "ristrutturazione";
  imageUrl: string;
  caption: string | null;
  displayOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export const serviceImageSchema = z.object({
  id: z.string(),
  serviceType: z.enum(["restauro", "costruzione", "ristrutturazione"]),
  imageUrl: z.string(),
  caption: z.string().nullable(),
  displayOrder: z.number(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type ServiceImageFormData = z.infer<typeof serviceImageSchema>;
