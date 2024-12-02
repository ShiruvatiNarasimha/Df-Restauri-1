import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { projects, services, team, users } from './schema';
import { performanceMonitor } from '../server/utils/monitoring';

// Custom database error types with enhanced detail
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly detail?: string,
    public readonly timestamp: string = new Date().toISOString()
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ConnectionError extends DatabaseError {
  constructor(
    message: string,
    public readonly attemptCount?: number,
    public readonly lastRetryTime?: string
  ) {
    super(message);
    this.name = 'ConnectionError';
  }
}

export class QueryError extends DatabaseError {
  constructor(
    message: string,
    code?: string,
    detail?: string,
    public readonly sql?: string
  ) {
    super(message, code, detail);
    this.name = 'QueryError';
  }
}

// Enhanced error handling with metrics and logging
const handleDatabaseError = (error: unknown, context?: string): never => {
  const endOperation = performanceMonitor.startOperation('handleDatabaseError');
  try {
    console.error('Database operation failed:', {
      timestamp: new Date().toISOString(),
      context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : 'Unknown error type',
    });
    
    if (error instanceof pkg.DatabaseError) {
      throw new QueryError(
        `Database query failed: ${error.message}`,
        error.code,
        error.detail,
        error['sql'] // Safe access to potential sql property
      );
    }
    
    if (error instanceof Error) {
      throw new DatabaseError(
        `Operation failed: ${error.message}`,
        undefined,
        error.stack
      );
    }
    
    throw new DatabaseError('Unknown database error occurred');
  } finally {
    endOperation();
  }
};

// Enhanced connection pool configuration with retry mechanism
class DatabasePool extends Pool {
  private retryAttempts: number = 0;
  private readonly maxRetries: number = 5;
  private readonly initialRetryDelay: number = 1000; // 1 second
  private isShuttingDown: boolean = false;

  constructor(config: pkg.PoolConfig) {
    super({
      ...config,
      max: 20, // Balanced for typical web application load
      min: 5, // Reduced minimum to save resources
      idleTimeoutMillis: 30000, // 30 seconds idle timeout
      connectionTimeoutMillis: 5000, // 5 seconds connection timeout
      maxUses: 7500, // Connection recycling after 7500 queries
      statement_timeout: 10000, // 10 seconds statement timeout
      query_timeout: 8000, // 8 seconds query timeout
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      application_name: 'df-restauri-api',
      ssl: process.env.NODE_ENV === 'production'
    });

    this.on('error', this.handlePoolError.bind(this));
    this.on('connect', this.handleNewConnection.bind(this));
    this.on('acquire', this.handleConnectionAcquire.bind(this));
    this.on('remove', this.handleConnectionRemove.bind(this));
  }

  private async handlePoolError(err: Error): Promise<void> {
    console.error('Pool error occurred:', {
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });

    if (!this.isShuttingDown && this.retryAttempts < this.maxRetries) {
      const delay = Math.min(
        this.initialRetryDelay * Math.pow(2, this.retryAttempts),
        30000 // Max 30 seconds delay
      );
      this.retryAttempts++;

      console.log(`Attempting reconnection (${this.retryAttempts}/${this.maxRetries}) after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        await this.connect();
        this.retryAttempts = 0; // Reset on successful connection
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
      }
    }
  }

  private handleNewConnection(client: pkg.PoolClient): void {
    console.log('New database connection established', {
      timestamp: new Date().toISOString(),
      poolSize: this.totalCount,
      idleConnections: this.idleCount
    });

    client.on('error', (err: Error) => {
      console.error('Client error:', {
        error: err.message,
        timestamp: new Date().toISOString()
      });
    });
  }

  private handleConnectionAcquire(client: pkg.PoolClient): void {
    performanceMonitor.startOperation('db-connection-acquire');
  }

  private handleConnectionRemove(client: pkg.PoolClient): void {
    console.log('Database connection removed from pool', {
      timestamp: new Date().toISOString(),
      poolSize: this.totalCount,
      idleConnections: this.idleCount
    });
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    console.log('Initiating database pool shutdown...');
    
    try {
      await this.end();
      console.log('Database pool shutdown completed successfully');
    } catch (error) {
      console.error('Error during database pool shutdown:', error);
      throw error;
    }
  }
}

const pool = new DatabasePool({
  connectionString: process.env.DATABASE_URL
});

// Enhanced pool monitoring with performance metrics
setInterval(() => {
  const metrics = {
    totalConnections: pool.totalCount,
    activeConnections: pool.totalCount - pool.idleCount,
    idleConnections: pool.idleCount,
    waitingRequests: pool.waitingCount,
    timestamp: new Date().toISOString(),
    retryAttempts: (pool as any).retryAttempts,
    averageQueryTime: performanceMonitor.getAverageResponseTime('db-query'),
    errorRate: performanceMonitor.getErrorRate('db-query')
  };

  console.log('Database pool metrics:', metrics);
  
  // Alert on potential issues
  if (pool.waitingCount > 5) {
    console.warn('High number of waiting connections detected');
  }
  if (pool.idleCount === 0 && pool.totalCount === (pool as any).options.max) {
    console.warn('Pool at maximum capacity with no idle connections');
  }
}, 60000);

// Initialize Drizzle with the connection pool
export const db = drizzle(pool, {
  schema: { projects, services, team, users },
});

// Improved error handling wrapper for database operations
export async function withErrorHandler<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    return handleDatabaseError(error);
  }
}

// Enhanced health check function with metrics
export async function checkDatabaseConnection(): Promise<boolean> {
  const startTime = Date.now();
  const metrics = {
    status: 'disconnected' as 'connected' | 'disconnected',
    responseTime: 0,
    timestamp: new Date().toISOString(),
    version: '',
    poolMetrics: {
      totalConnections: pool.totalCount,
      activeConnections: pool.activeCount,
      idleConnections: pool.idleCount,
      waitingRequests: pool.waitingCount,
    },
    lastError: null as string | null
  };

  try {
    const client = await pool.connect();
    try {
      // Comprehensive health checks
      const [
        pingResult,
        timeResult,
        versionResult,
        activeConnectionsResult
      ] = await Promise.all([
        client.query('SELECT 1'),
        client.query('SELECT NOW()'),
        client.query('SELECT version()'),
        client.query('SELECT count(*) FROM pg_stat_activity')
      ]);

      metrics.status = 'connected';
      metrics.timestamp = timeResult.rows[0].now;
      metrics.version = versionResult.rows[0].version;
      metrics.responseTime = Date.now() - startTime;

      // Log enhanced metrics
      console.log('Database health check:', {
        ...metrics,
        extendedMetrics: {
          activeConnections: activeConnectionsResult.rows[0].count,
          queryLatency: `${metrics.responseTime}ms`,
          uptimeSeconds: process.uptime()
        }
      });

      return true;
    } finally {
      client.release(true); // Force release in case of errors
    }
  } catch (error) {
    metrics.lastError = error instanceof Error ? error.message : 'Unknown error';
    metrics.responseTime = Date.now() - startTime;

    console.error('Database health check failed:', {
      ...metrics,
      error: metrics.lastError,
      stackTrace: error instanceof Error ? error.stack : undefined
    });

    return false;
  }
}

// Graceful shutdown helper
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await pool.end();
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
}
