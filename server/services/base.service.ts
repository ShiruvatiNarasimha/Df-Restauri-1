import { db } from '@db/index';
import { eq, sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { performanceMonitor } from '../utils/monitoring';
import { cacheService } from './cache.service';

export interface BaseModel {
  id: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ServiceOptions {
  batchSize?: number;
  maxRetries?: number;
  baseDelay?: number;
  cacheTTL?: number;
}

export class BaseService<T extends BaseModel> {
  protected table: PgTable<T>;
  private readonly batchSize: number;
  private readonly cachePrefix: string;
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly cacheTTL: number;
  protected isInitialized: boolean;

  constructor(table: PgTable<T>, options: ServiceOptions = {}) {
    this.table = table;
    this.batchSize = options.batchSize ?? 100;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelay = options.baseDelay ?? 1000;
    this.cacheTTL = options.cacheTTL ?? 300; // 5 minutes default
    this.cachePrefix = `${table.name}:`;
    this.isInitialized = false;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Verify database connection and table access
      await db.select().from(this.table).limit(1);
      this.isInitialized = true;
    } catch (error) {
      console.error(`Failed to initialize ${this.constructor.name}:`, error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    await this.clearCache();
    this.isInitialized = false;
  }

  private requestQueue: Map<string, Promise<any>> = new Map();
  private healthMetrics = {
    totalRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastError: null as Error | null,
    lastErrorTime: 0,
  };

  protected async withRetry<R>(
    operation: () => Promise<R>,
    context: string
  ): Promise<R> {
    const operationKey = `${this.constructor.name}.${context}`;
    this.healthMetrics.totalRequests++;
    
    // Check if there's a pending operation
    const pending = this.requestQueue.get(operationKey);
    if (pending) {
      return pending as Promise<R>;
    }

    let lastError: Error | null = null;
    const startTime = Date.now();
    const retryOperation = async (): Promise<R> => {
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          const endOperation = performanceMonitor.startOperation(operationKey);
          
          try {
            const result = await operation();
            const duration = Date.now() - startTime;
            
            // Update health metrics
            this.updateHealthMetrics(duration);
            
            if (duration > 1000) {
              console.warn(`Long running operation detected:`, {
                service: this.constructor.name,
                operation: context,
                duration: `${duration}ms`,
                attempt,
                healthMetrics: this.getHealthMetrics()
              });
            }
            
            return result;
          } finally {
            endOperation();
            this.requestQueue.delete(operationKey);
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          const duration = Date.now() - startTime;
          
          this.updateHealthMetrics(duration, lastError);
          
          console.error(`Operation failed (attempt ${attempt}/${this.maxRetries}):`, {
            service: this.constructor.name,
            operation: context,
            error: lastError.message,
            stack: lastError.stack,
            duration: `${duration}ms`,
            healthMetrics: this.getHealthMetrics(),
            timestamp: new Date().toISOString()
          });

          if (attempt < this.maxRetries) {
            const delay = Math.min(
              this.baseDelay * Math.pow(2, attempt - 1),
              5000
            );
            await this.performRecovery(lastError, delay);
          }
        }
      }

      const finalDuration = Date.now() - startTime;
      console.error(`Operation failed permanently:`, {
        service: this.constructor.name,
        operation: context,
        totalDuration: `${finalDuration}ms`,
        attempts: this.maxRetries,
        finalError: lastError?.message,
        healthMetrics: this.getHealthMetrics()
      });

      this.requestQueue.delete(operationKey);
      throw lastError || new Error(`Operation failed after ${this.maxRetries} attempts`);
    };

    const operationPromise = retryOperation();
    this.requestQueue.set(operationKey, operationPromise);
    return operationPromise;
  }

  private updateHealthMetrics(duration: number, error?: Error): void {
    const { averageResponseTime, totalRequests } = this.healthMetrics;
    this.healthMetrics.averageResponseTime = 
      (averageResponseTime * totalRequests + duration) / (totalRequests + 1);
    
    if (error) {
      this.healthMetrics.failedRequests++;
      this.healthMetrics.lastError = error;
      this.healthMetrics.lastErrorTime = Date.now();
    }
  }

  private async performRecovery(error: Error, delay: number): Promise<void> {
    // Implement basic recovery strategies
    if (error.message.includes('connection')) {
      // For connection errors, attempt to reconnect
      try {
        await db.execute(sql`SELECT 1`);
      } catch (reconnectError) {
        console.warn('Database reconnection failed:', reconnectError);
      }
    }

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  protected getHealthMetrics() {
    const errorRate = (this.healthMetrics.failedRequests / this.healthMetrics.totalRequests) * 100;
    return {
      ...this.healthMetrics,
      errorRate: Number(errorRate.toFixed(2)),
      status: errorRate > 20 ? 'degraded' : 'healthy'
    };
  }

  protected async executeBatch<R>(
    items: any[],
    operation: (batch: any[]) => Promise<R[]>
  ): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      const batchResults = await operation(batch);
      results.push(...batchResults);
    }
    return results;
  }

  protected async getFromCache(key: string): Promise<T | null> {
    try {
      return await cacheService.get<T>(this.cachePrefix + key);
    } catch (error) {
      console.warn(`Cache get failed for key ${key}:`, error);
      return null;
    }
  }

  protected async setCache(key: string, data: T, ttl?: number): Promise<void> {
    try {
      await cacheService.set(this.cachePrefix + key, data, ttl);
    } catch (error) {
      console.warn(`Cache set failed for key ${key}:`, error);
    }
  }

  protected async clearCache(pattern?: string): Promise<void> {
    try {
      await cacheService.clearPattern(this.cachePrefix + (pattern || '*'));
    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
  }

  protected generateCacheKey(params: Record<string, any>): string {
    try {
      const filteredParams = Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      const sortedEntries = Object.entries(filteredParams)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => {
          if (typeof value === 'object') {
            return `${key}:${JSON.stringify(value, Object.keys(value).sort())}`;
          }
          return `${key}:${value}`;
        });

      const cacheKey = `${this.table.name}:${sortedEntries.join(':')}`;
      
      if (cacheKey.length > 250) {
        const hash = require('crypto')
          .createHash('md5')
          .update(cacheKey)
          .digest('hex');
        return `${this.table.name}:${hash}`;
      }
      
      return cacheKey;
    } catch (error) {
      console.warn('Cache key generation failed:', error);
      return `${this.table.name}:${Date.now()}`;
    }
  }

  async findAll(options?: { 
    where?: unknown; 
    limit?: number; 
    offset?: number;
    orderBy?: { column: string; direction: 'asc' | 'desc' };
    search?: { column: string; query: string };
    cache?: boolean;
    cacheTTL?: number;
    trackPerformance?: boolean;
  }): Promise<T[]> {
    const endOperation = options?.trackPerformance 
      ? performanceMonitor.startOperation(`${this.constructor.name}.findAll`)
      : undefined;

    try {
      return await this.withRetry(async () => {
        const useCache = options?.cache !== false;
        if (useCache) {
          const cacheKey = this.generateCacheKey({ 
            method: 'findAll', 
            ...options 
          });
          
          const cachedResult = await this.getFromCache(cacheKey);
          if (cachedResult) {
            console.log(`Cache hit for ${this.constructor.name}.findAll`);
            return cachedResult;
          }
        }

        let query = db.select().from(this.table);
        
        if (options?.where) {
          query = query.where(options.where);
        }

        if (options?.search) {
          const searchTerm = options.search.query.trim().toLowerCase();
          if (searchTerm) {
            query = query.where(
              sql`LOWER(${options.search.column}::text) LIKE ${`%${searchTerm}%`}`
            );
          }
        }
        
        if (options?.orderBy) {
          const { column, direction } = options.orderBy;
          query = query.orderBy(
            sql`${column} ${sql.raw(direction.toUpperCase())}`
          );
        }
        
        const limit = options?.limit || 50;
        const offset = options?.offset || 0;
        query = query.limit(limit).offset(offset);
        
        const result = await query;
        
        if (useCache) {
          const cacheKey = this.generateCacheKey({ 
            method: 'findAll', 
            ...options 
          });
          await this.setCache(cacheKey, result, options?.cacheTTL);
        }
        
        return result;
      }, 'findAll');
    } finally {
      if (endOperation) {
        endOperation();
      }
    }
  }

  async findById(id: number): Promise<T | null> {
    return this.withRetry(async () => {
      const cacheKey = `findById:${id}`;
      const cachedResult = await this.getFromCache(cacheKey);
      if (cachedResult) return cachedResult;

      const [result] = await db
        .select()
        .from(this.table)
        .where(eq(this.table.id, id))
        .limit(1);
      
      if (result) {
        await this.setCache(cacheKey, result);
      }
      return result || null;
    }, 'findById');
  }

  async create(data: Partial<T> | Partial<T>[]): Promise<T | T[]> {
    return this.withRetry(async () => {
      if (Array.isArray(data)) {
        const results = await this.executeBatch(data, async (batch) => {
          return db.insert(this.table)
            .values(batch)
            .returning();
        });
        await this.clearCache();
        return results;
      }
      
      const [result] = await db.insert(this.table)
        .values(data)
        .returning();
      await this.clearCache();
      return result;
    }, 'create');
  }

  async update(id: number, data: Partial<T>): Promise<T> {
    return this.withRetry(async () => {
      const [result] = await db.update(this.table)
        .set(data)
        .where(eq(this.table.id, id))
        .returning();
      
      await this.clearCache();
      return result;
    }, 'update');
  }
}
