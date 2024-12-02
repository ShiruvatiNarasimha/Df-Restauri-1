import { BaseService } from './base.service';
import { projects } from '@db/schema';
import type { Project } from '@db/schema';
import { db } from '@db/index';
import { eq, sql, desc } from 'drizzle-orm';

export class ProjectService extends BaseService<Project> {
  constructor() {
    super(projects);
  }

  async updateImageOrder(id: number, imageOrder: { id: string; order: number }[]) {
    try {
      const [result] = await db.update(projects)
        .set({ imageOrder })
        .where(eq(projects.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error in ProjectService.updateImageOrder:', error);
      throw error;
    }
  }

  // Optimized bulk creation with validation
  async createMany(projectsData: Partial<Project>[]) {
    return this.create(projectsData);
  }

  // Optimized query for latest projects with efficient pagination
  async findLatest(limit = 10, offset = 0) {
    const cacheKey = `latest:${limit}:${offset}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const result = await db.select()
      .from(projects)
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset);

    this.setCache(cacheKey, result);
    return result;
  }

  // Optimized category-based query with count
  async findByCategory(category: string) {
    const cacheKey = `category:${category}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const result = await db.select({
      projects: projects,
      count: sql<number>`count(*) OVER()`
    })
    .from(projects)
    .where(eq(projects.category, category));

    this.setCache(cacheKey, result);
    return result;
  }
}

export const projectService = new ProjectService();
