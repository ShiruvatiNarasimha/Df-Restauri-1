import { performanceMonitor } from './monitoring';

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
}

enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN
}

class CircuitBreaker {
  private state: CircuitState;
  private failureCount: number;
  private lastFailureTime: number;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private healthMetrics = {
    totalCalls: 0,
    failedCalls: 0,
    lastError: null as Error | null,
    averageResponseTime: 0,
    lastStateChange: Date.now()
  };

  constructor(config: CircuitBreakerConfig) {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.failureThreshold = config.failureThreshold;
    this.resetTimeout = config.resetTimeout;
  }

  private shouldReset(): boolean {
    const now = Date.now();
    return this.state === CircuitState.OPEN &&
           now - this.lastFailureTime >= this.resetTimeout;
  }

  private markSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.healthMetrics.lastStateChange = Date.now();
      console.log('Circuit breaker state changed to CLOSED');
    }
  }

  private markFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.healthMetrics.failedCalls++;
    this.healthMetrics.lastError = error;

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.healthMetrics.lastStateChange = Date.now();
      console.warn('Circuit breaker opened due to failures:', {
        failureCount: this.failureCount,
        lastError: error.message,
        healthMetrics: this.healthMetrics
      });
    }
  }

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.healthMetrics.lastStateChange = Date.now();
        console.log('Circuit breaker state changed to HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    const startTime = Date.now();
    const endOperation = performanceMonitor.startOperation('circuit-breaker.execute');

    try {
      const result = await operation();
      this.markSuccess();

      // Update metrics
      this.healthMetrics.totalCalls++;
      const duration = Date.now() - startTime;
      this.healthMetrics.averageResponseTime = 
        (this.healthMetrics.averageResponseTime * (this.healthMetrics.totalCalls - 1) + duration) / 
        this.healthMetrics.totalCalls;

      return result;
    } catch (error) {
      const actualError = error instanceof Error ? error : new Error(String(error));
      this.markFailure(actualError);
      throw actualError;
    } finally {
      endOperation();
    }
  }

  public getHealth() {
    return {
      state: CircuitState[this.state],
      failureCount: this.failureCount,
      metrics: {
        ...this.healthMetrics,
        errorRate: (this.healthMetrics.failedCalls / this.healthMetrics.totalCalls) * 100,
        uptime: Date.now() - this.healthMetrics.lastStateChange
      }
    };
  }
}

export const dbCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000 // 30 seconds
});
