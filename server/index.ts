import express from "express";
import authRoutes from "./routes/auth.routes";
import projectRoutes from "./routes/project.routes";
import serviceRoutes from "./routes/service.routes";
import teamRoutes from "./routes/team.routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import { db, checkDatabaseConnection } from "@db/index";
import { serviceRegistry } from "./services/registry";
import { setupRoutes } from "./routes";
import helmet from 'helmet';

// Import middleware
import { requestLogger } from './middleware/logging';
import { errorHandler, notFoundHandler } from './middleware/error';
import { compressionMiddleware, rateLimiter, cacheControl } from './middleware/performance';
import { memoryMonitor, timeoutMiddleware, healthCheck } from './middleware/monitoring';

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  console.log(`${formattedTime} [express] ${message}`);
}

// Initialize Express app and HTTP server
const app = express();
const server = createServer(app);

// Enhanced server configuration
const configureServer = () => {
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  server.on('error', (error: NodeJS.ErrnoException) => {
    console.error('Server error:', {
      error: error.message,
      code: error.code,
      syscall: error.syscall,
      timestamp: new Date().toISOString()
    });

    if (error.syscall !== 'listen') {
      throw error;
    }

    switch (error.code) {
      case 'EACCES':
        console.error('Port requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error('Port is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  server.on('listening', () => {
    const addr = server.address();
    const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;
    console.log(`Server listening on ${bind}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
};

configureServer();

// Graceful shutdown handling
const gracefulShutdown = () => {
  log('Received shutdown signal. Closing server...');
  server.close(async () => {
    log('Server closed. Closing database connection...');
    try {
      await db.end();
      log('Database connection closed. Exiting process.');
      process.exit(0);
    } catch (err) {
      log('Error closing database connection.');
      process.exit(1);
    }
  });
  
  setTimeout(() => {
    log('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 15000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Circuit breaker state
let isHealthy = true;
let lastError: Error | null = null;
const resetCircuitBreaker = () => {
  isHealthy = true;
  lastError = null;
};

// Essential security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Enhanced middleware configuration with security and performance optimizations
app.use(express.json({ 
  limit: '2mb',
  strict: true,
  verify: (req: any, res, buf) => {
    if (buf.length > 2 * 1024 * 1024) {
      throw new Error('Request entity too large');
    }
  }
}));
app.use(express.urlencoded({ 
  extended: false, 
  limit: '2mb',
  parameterLimit: 1000
}));

// Compression and caching optimizations
app.use(compressionMiddleware);
app.use(cacheControl);

// Security and monitoring middleware
app.use('/api/', rateLimiter);
app.use(requestLogger);
app.use(timeoutMiddleware);
app.use(memoryMonitor);

// Add request timeout
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(408).json({
      status: 'error',
      message: 'Request timeout',
      code: 'TIMEOUT_ERROR'
    });
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  if (!isHealthy) {
    return res.status(503).json({
      status: 'degraded',
      error: lastError?.message,
      timestamp: Date.now()
    });
  }
  return healthCheck(req, res);
});

// Enhanced dependency initialization using Service Registry
const initializeServices = async () => {
  const MAX_RETRIES = 3;
  const INITIALIZATION_TIMEOUT = 15000; // 15 seconds timeout
  let retries = 0;
  let lastError: Error | null = null;

  const attemptInitialization = async (): Promise<boolean> => {
    try {
      // Initialize with timeout
      const initPromise = Promise.race([
        (async () => {
          // Check database connection first
          const isConnected = await checkDatabaseConnection();
          if (!isConnected) {
            throw new Error('Database connection failed');
          }
          log('Database connection established');

          // Initialize core services first with reduced timeout
          await serviceRegistry.initialize({
            retryAttempts: 2,
            retryDelay: 500,
            timeout: 5000
          });

          log('Service registry initialized successfully');
          return true;
        })(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Initialization timed out')), INITIALIZATION_TIMEOUT)
        )
      ]);

      return await initPromise;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown initialization error');
      log(`Initialization attempt ${retries + 1}/${MAX_RETRIES} failed: ${lastError.message}`);
      
      // Log detailed diagnostics
      console.error('Initialization error details:', {
        attempt: retries + 1,
        timestamp: new Date().toISOString(),
        error: {
          name: lastError.name,
          message: lastError.message,
          stack: lastError.stack
        },
        memoryUsage: process.memoryUsage()
      });

      return false;
    }
  };

  const startTime = Date.now();
  while (retries < MAX_RETRIES) {
    const success = await attemptInitialization();
    if (success) {
      // Log successful initialization metrics
      const metrics = {
        totalAttempts: retries + 1,
        totalTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage()
      };
      log(`Initialization completed successfully: ${JSON.stringify(metrics)}`);
      return;
    }

    retries++;
    if (retries === MAX_RETRIES) {
      const metrics = {
        totalAttempts: retries,
        totalTime: Date.now() - startTime,
        lastError: lastError?.message,
        memoryUsage: process.memoryUsage()
      };
      log(`Starting in degraded mode due to initialization failures: ${JSON.stringify(metrics)}`);
      // Continue with reduced functionality instead of throwing
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, retries), 5000);
    log(`Retrying initialization in ${delay}ms (attempt ${retries + 1}/${MAX_RETRIES})...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
};

// Start application
(async () => {
  try {
    log('Starting application initialization...');
    await initializeServices();
    log('Services initialized successfully');

    // Setup API routes with optimized configuration
    setupRoutes(app);

    // Error handling middleware
    app.use(errorHandler);
    app.use(notFoundHandler);

    // Setup Vite or static serving
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, "0.0.0.0", () => {
      const addr = server.address();
      const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port}`;
      log(`Server running on ${bind}`);
      resetCircuitBreaker();
    });

  } catch (error) {
    isHealthy = false;
    lastError = error instanceof Error ? error : new Error('Unknown error');
    log(`Failed to initialize application: ${lastError.message}`);
    process.exit(1);
  }
})();