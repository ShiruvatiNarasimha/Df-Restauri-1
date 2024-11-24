import { z } from "zod";

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  avatar: string;
  facebookUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const teamMemberSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Nome richiesto"),
  role: z.string().min(1, "Ruolo richiesto"),
  avatar: z.string().min(1, "Avatar richiesto"),
  facebookUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type CreateTeamMember = Omit<TeamMember, "id" | "createdAt" | "updatedAt">;
export type UpdateTeamMember = Partial<CreateTeamMember>;
