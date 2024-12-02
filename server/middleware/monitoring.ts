import { Request, Response, NextFunction } from 'express';

// Memory usage monitoring middleware with enhanced tracking
export const memoryMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime();
  const startMemory = process.memoryUsage();
  
  // Add memory usage info to response headers in development
  if (process.env.NODE_ENV === 'development') {
    res.set('X-Memory-Usage-Heap', `${Math.round(startMemory.heapUsed / 1024 / 1024)}MB`);
    res.set('X-Memory-Usage-RSS', `${Math.round(startMemory.rss / 1024 / 1024)}MB`);
  }
  
  res.on('finish', () => {
    const endMemory = process.memoryUsage();
    const memoryDiff = {
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      rss: endMemory.rss - startMemory.rss
    };
    
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000;
    
    // Log if memory usage is high or request is slow
    const heapUsedMB = endMemory.heapUsed / 1024 / 1024;
    if (heapUsedMB > 512 || duration > 1000) {
      console.warn(`[Performance Warning] Path: ${req.path}
        Duration: ${duration.toFixed(2)}ms
        Heap Usage: ${Math.round(heapUsedMB)}MB
        Memory Increase: ${Math.round(memoryDiff.heapUsed / 1024 / 1024)}MB`);
    }
    
    // Log warning if memory increase is significant
    if (memoryDiff.heapUsed > 50 * 1024 * 1024) { // 50MB
      console.warn(`[Memory Warning] Significant memory increase detected:
        Path: ${req.path}
        Memory Increase: ${Math.round(memoryDiff.heapUsed / 1024 / 1024)}MB
        Consider restarting the server if this occurs frequently.`);
    }
  });
  
  next();
};

// Request timeout middleware with dynamic timeout based on route
export const timeoutMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Longer timeout for file upload routes
  const timeout = req.path.includes('/upload') ? 120000 : 60000;
  
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      const errorMsg = `Request to ${req.path} timed out after ${timeout/1000}s`;
      console.error(`[Timeout] ${errorMsg}`);
      res.status(503).json({
        status: 'error',
        message: 'Request timeout',
        path: req.path,
        timeout: timeout/1000
      });
    }
  }, timeout);
  
  // Clear timeout when the response is sent
  res.on('finish', () => {
    clearTimeout(timeoutId);
  });
  
  next();
};

// Enhanced health check endpoint handler
export const healthCheck = (_req: Request, res: Response) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    cpuUsage: process.cpuUsage(),
    status: 'healthy',
    environment: process.env.NODE_ENV
  };
  
  res.json(health);
};
