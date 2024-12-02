import Redis from 'ioredis';
import { DatabaseError } from '@db/index';

export class CacheService {
  private static instance: CacheService;
  private client: Redis;
  private readonly defaultTTL = 300; // 5 minutes in seconds

  private fallbackCache: Map<string, { value: any; expires: number }>;
  private isRedisAvailable: boolean;

  private constructor() {
    this.fallbackCache = new Map();
    this.isRedisAvailable = false;

    // Only initialize Redis if host is provided
    if (process.env.REDIS_HOST) {
      this.initializeRedis();
    } else {
      console.log('Redis host not configured, using in-memory cache');
    }
  }

  private async initializeRedis() {
    try {
      // Only attempt Redis connection if environment variables are properly set
      const host = process.env.REDIS_HOST;
      const port = process.env.REDIS_PORT;
      
      if (!host || !port) {
        console.log('Redis configuration incomplete, using in-memory cache');
        this.isRedisAvailable = false;
        return;
      }

      this.client = new Redis({
        host,
        port: parseInt(port),
        maxRetriesPerRequest: 2,
        connectTimeout: 3000,
        enableOfflineQueue: false,
        retryStrategy(times) {
          if (times > 2) {
            return null; // Stop retrying after 2 attempts
          }
          return Math.min(times * 500, 2000); // Shorter delays
        }
      });

      // Promisify the connection check
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timeout'));
        }, 3000);

        this.client.once('ready', () => {
          clearTimeout(timeout);
          this.isRedisAvailable = true;
          console.log('Redis connection established successfully');
          resolve(true);
        });

        this.client.once('error', (error) => {
          clearTimeout(timeout);
          console.warn('Redis initialization failed:', error);
          this.isRedisAvailable = false;
          resolve(false); // Don't reject, just mark as unavailable
        });
      });

      // Set up ongoing event handlers
      this.client.on('error', (error) => {
        if (this.isRedisAvailable) {
          console.warn('Redis connection lost:', error);
          this.isRedisAvailable = false;
        }
      });

      this.client.on('ready', () => {
        if (!this.isRedisAvailable) {
          console.log('Redis connection restored');
          this.isRedisAvailable = true;
        }
      });

    } catch (error) {
      console.warn('Redis initialization error:', error);
      this.isRedisAvailable = false;
    }
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isRedisAvailable) {
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
      }
      
      // Fallback to in-memory cache
      const item = this.fallbackCache.get(key);
      if (!item) return null;
      
      if (item.expires < Date.now()) {
        this.fallbackCache.delete(key);
        return null;
      }
      
      return item.value;
    } catch (error) {
      console.warn('Cache get error:', error);
      return this.getFallback<T>(key);
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (this.isRedisAvailable) {
        await this.client.setex(key, ttl, serialized);
      }
      
      // Always update fallback cache
      this.fallbackCache.set(key, {
        value: value,
        expires: Date.now() + (ttl * 1000)
      });
      
      // Clean up expired items from fallback cache
      this.cleanFallbackCache();
    } catch (error) {
      console.warn('Cache set error:', error);
      this.setFallback(key, value, ttl);
    }
  }

  private getFallback<T>(key: string): T | null {
    const item = this.fallbackCache.get(key);
    if (!item || item.expires < Date.now()) {
      this.fallbackCache.delete(key);
      return null;
    }
    return item.value;
  }

  private setFallback(key: string, value: any, ttl: number): void {
    this.fallbackCache.set(key, {
      value,
      expires: Date.now() + (ttl * 1000)
    });
  }

  private cleanFallbackCache(): void {
    const now = Date.now();
    for (const [key, item] of this.fallbackCache.entries()) {
      if (item.expires < now) {
        this.fallbackCache.delete(key);
      }
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async clearPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      console.error('Cache clear pattern error:', error);
    }
  }

  async healthCheck(): Promise<boolean> {
    // If Redis is not configured, consider the cache healthy with fallback
    if (!process.env.REDIS_HOST) {
      return true;
    }

    try {
      if (!this.isRedisAvailable) {
        return true; // Fallback cache is always available
      }

      const pingResult = await Promise.race([
        this.client.ping(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis ping timeout')), 1000)
        )
      ]);

      return pingResult === 'PONG';
    } catch (error) {
      console.warn('Redis health check warning:', error);
      return true; // Still healthy due to fallback cache
    }
  }
}

export const cacheService = CacheService.getInstance();
