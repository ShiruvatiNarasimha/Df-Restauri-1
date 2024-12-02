import { BaseService } from './base.service';
import { services } from '@db/schema';
import type { Service } from '@db/schema';
import { db } from '@db/index';
import { eq } from 'drizzle-orm';

export class ServiceManager extends BaseService<Service> {
  constructor() {
    super(services);
  }

  async updateImageOrder(id: number, imageOrder: { id: string; order: number }[]) {
    try {
      const [result] = await db.update(services)
        .set({ imageOrder })
        .where(eq(services.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error in ServiceManager.updateImageOrder:', error);
      throw error;
    }
  }

  async updateFeatures(id: number, features: string[]) {
    try {
      const [result] = await db.update(services)
        .set({ features })
        .where(eq(services.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error in ServiceManager.updateFeatures:', error);
      throw error;
    }
  }
}

export const serviceManager = new ServiceManager();
