import { performance } from 'perf_hooks';

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: string;
  success: boolean;
  error?: string | undefined;
  context?: {
    requestId?: string | undefined;
    userId?: string | undefined;
    path?: string | undefined;
    method?: string | undefined;
    errorType?: string | undefined;
    errorCode?: string | undefined;
    recoveryAttempted?: boolean | undefined;
  };
  resourceUsage?: {
    memory: NodeJS.MemoryUsage;
    cpu: number | undefined;
    heapUsed: number | undefined;
    heapTotal: number | undefined;
  };
  tracing?: {
    parentOperation?: string | undefined;
    childOperations?: string[] | undefined;
    depth?: number | undefined;
  };
}

interface ErrorMetric {
  type: string;
  timestamp: string;
  context: Record<string, unknown>;
  count: number;
  lastOccurrence: Date;
  recoveryAttempts: number;
  successfulRecoveries: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private errorMetrics: Map<string, ErrorMetric> = new Map();
  private readonly maxMetrics = 1000;
  private readonly errorThresholds = {
    critical: 5,
    warning: 3,
    maxConsecutiveErrors: 3,
    recoveryWindow: 300000 // 5 minutes in milliseconds
  };

  private checkErrorThreshold(operation: string): void {
    const recentErrors = this.metrics
      .filter(m => m.operation === operation && !m.success)
      .slice(-this.errorThresholds.maxConsecutiveErrors);
    
    if (recentErrors.length >= this.errorThresholds.maxConsecutiveErrors) {
      console.error('Critical error threshold reached:', {
        operation,
        errorCount: recentErrors.length,
        errors: recentErrors.map(m => m.error),
        timestamp: new Date().toISOString()
      });
    }
  }

  private constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  public startOperation(operation: string): () => void {
    const start = performance.now();
    return () => this.endOperation(operation, start);
  }

  private endOperation(
    operation: string,
    startTime: number,
    error?: Error,
    context: Record<string, any> = {}
  ) {
    const duration = performance.now() - startTime;
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date().toISOString(),
      success: !error,
      error: error?.message,
      context: {
        requestId: context.requestId,
        userId: context.userId,
        path: context.path,
        method: context.method
      },
      resourceUsage: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage ? process.cpuUsage().user / 1000000 : undefined,
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal
      }
    };

    this.metrics.push(metric);
    
    // Implement sliding window for metrics
    const windowSize = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    this.metrics = this.metrics.filter(m => 
      now - new Date(m.timestamp).getTime() < windowSize
    );

    // Enhanced slow operation detection with context
    if (duration > 500) {
      console.warn('Slow operation detected:', {
        operation,
        duration: `${duration.toFixed(2)}ms`,
        context: metric.context,
        resourceUsage: metric.resourceUsage,
        timestamp: metric.timestamp
      });
    }

    // Track error patterns
    if (error) {
      const errorMetrics = this.metrics
        .filter(m => m.operation === operation && !m.success)
        .slice(-5);
      
      if (errorMetrics.length >= 3) {
        console.error('Error pattern detected:', {
          operation,
          errorCount: errorMetrics.length,
          lastErrors: errorMetrics.map(m => m.error),
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  public getMetrics(operation?: string): PerformanceMetric[] {
    if (operation) {
      return this.metrics.filter(m => m.operation === operation);
    }
    return this.metrics;
  }

  public getAverageResponseTime(operation: string): number {
    const relevantMetrics = this.metrics.filter(m => m.operation === operation);
    if (relevantMetrics.length === 0) return 0;

    const total = relevantMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return total / relevantMetrics.length;
  }

  public getErrorRate(operation: string): number {
    const relevantMetrics = this.metrics.filter(m => m.operation === operation);
    if (relevantMetrics.length === 0) return 0;

    const errors = relevantMetrics.filter(m => !m.success).length;
    return (errors / relevantMetrics.length) * 100;
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
