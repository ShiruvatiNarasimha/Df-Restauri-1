import { BaseService } from './base.service';
import { team } from '@db/schema';
import type { TeamMember } from '@db/schema';
import { db } from '@db/index';
import { eq } from 'drizzle-orm';

export class TeamService extends BaseService<TeamMember> {
  constructor() {
    super(team);
  }

  async updateSocialLinks(id: number, socialLinks: { platform: string; url: string }[]) {
    try {
      const [result] = await db.update(team)
        .set({ socialLinks })
        .where(eq(team.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error in TeamService.updateSocialLinks:', error);
      throw error;
    }
  }
}

export const teamService = new TeamService();
