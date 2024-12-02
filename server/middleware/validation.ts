import { Request, Response, NextFunction } from 'express';
import { ZodSchema, z } from 'zod';

interface ValidationCacheItem {
  result: boolean;
  errors?: Array<{ path: string; message: string }>;
  timestamp: number;
}

// Validation cache with LRU-like behavior
class ValidationCache {
  private cache: Map<string, ValidationCacheItem>;
  private readonly maxSize: number;
  private readonly ttl: number;

  constructor(maxSize = 100, ttlMs = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  get(key: string): ValidationCacheItem | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return item;
  }

  set(key: string, value: Omit<ValidationCacheItem, 'timestamp'>) {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, { ...value, timestamp: Date.now() });
  }
}

const validationCache = new ValidationCache();

// Enhanced validation middleware with caching
export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = {
        body: req.body,
        query: req.query,
        params: req.params,
      };

      // Generate cache key based on schema and payload
      const cacheKey = JSON.stringify({
        schema: schema._def.typeName,
        payload
      });

      // Check cache
      const cached = validationCache.get(cacheKey);
      if (cached) {
        if (!cached.result) {
          return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: cached.errors
          });
        }
        return next();
      }

      // Validate if not in cache
      await schema.parseAsync(payload);
      validationCache.set(cacheKey, { result: true });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));

        // Cache the validation error
        validationCache.set(JSON.stringify({
          schema: schema._def.typeName,
          payload: {
            body: req.body,
            query: req.query,
            params: req.params,
          }
        }), {
          result: false,
          errors
        });

        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors
        });
      }
      next(error);
    }
  };
};

// Common validation schemas
export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Invalid ID format')
  })
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional()
  })
});

// Project validation schemas
export const createProjectSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    category: z.string().min(1, 'Category is required'),
    year: z.string().regex(/^\d{4}$/, 'Invalid year format'),
    location: z.string().min(1, 'Location is required')
  })
});

export const updateProjectSchema = createProjectSchema.deepPartial();

// Service validation schemas
export const createServiceSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().min(1, 'Description is required'),
    category: z.string().min(1, 'Category is required'),
    features: z.string().transform(str => {
      try {
        return JSON.parse(str);
      } catch {
        return [];
      }
    }).optional()
  })
});

export const updateServiceSchema = createServiceSchema.deepPartial();
