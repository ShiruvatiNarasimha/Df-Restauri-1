import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { sql } from "drizzle-orm";
import { createServer } from "http";
import path from "path";

function log(message: string, level: 'info' | 'error' | 'warn' = 'info') {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const prefix = `${formattedTime} [express]`;
  switch (level) {
    case 'error':
      console.error(`${prefix} ERROR: ${message}`);
      break;
    case 'warn':
      console.warn(`${prefix} WARNING: ${message}`);
      break;
    default:
      console.log(`${prefix} ${message}`);
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`, 'error');
  log(error.stack || 'No stack trace available', 'error');
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      const level = res.statusCode >= 400 ? 'error' : 'info';
      log(logLine, level);
    }
  });

  next();
});

let server: any;

async function startServer() {
  try {
    log('Starting server initialization...', 'info');
    
    // Test database connection with retries
    let connected = false;
    let retries = 3;
    
    while (!connected && retries > 0) {
      try {
        const { db } = await import("@db/index");
        await db.execute(sql`SELECT 1`);
        log('Database connection successful', 'info');
        connected = true;
      } catch (dbError) {
        retries--;
        if (retries === 0) {
          log(`Database connection failed after all retries: ${dbError}`, 'error');
          throw dbError;
        }
        log(`Database connection attempt failed, retrying... (${retries} attempts left)`, 'warn');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }

    // Create server instance before registering routes
    server = createServer(app);

    // Register routes after server creation
    log('Registering routes...', 'info');
    await registerRoutes(app);
    log('Routes registered successfully', 'info');

    // Enhanced error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      log(`Error occurred: ${message}`, 'error');
      if (err.stack) {
        log(err.stack, 'error');
      }

      // Handle authentication errors
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: "Authentication failed",
          status: 401,
          timestamp: new Date().toISOString()
        });
      }

      // Handle specific error types
      if (err.code === 'ENOENT') {
        log(`File not found: ${err.path}`, 'error');
        return res.status(404).json({
          message: "Resource not found",
          status: 404,
          timestamp: new Date().toISOString()
        });
      }

      // Handle database connection errors
      if (err.code === 'ECONNREFUSED' || err.code === 'EPIPE') {
        log('Database connection failed', 'error');
        return res.status(503).json({
          message: "Service temporarily unavailable",
          status: 503,
          timestamp: new Date().toISOString()
        });
      }

      res.status(status).json({ 
        message,
        status,
        timestamp: new Date().toISOString(),
        path: _req.path,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    });

    // Configure static file serving with proper MIME types
    app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads'), {
      setHeaders: (res, path) => {
        if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
          res.setHeader('Content-Type', 'image/jpeg');
        } else if (path.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (path.endsWith('.webp')) {
          res.setHeader('Content-Type', 'image/webp');
        }
      }
    }));
    
    app.use('/images', express.static(path.join(process.cwd(), 'public', 'images'), {
      setHeaders: (res, path) => {
        if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
          res.setHeader('Content-Type', 'image/jpeg');
        } else if (path.endsWith('.png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (path.endsWith('.webp')) {
          res.setHeader('Content-Type', 'image/webp');
        }
      }
    }));
    
    if (process.env.NODE_ENV === 'production') {
      // Serve static files in production
      serveStatic(app);
    } else {
      // Use Vite in development
      await setupVite(app, server);
    }
    
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server started successfully on port ${PORT}`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        log(`Port ${PORT} is already in use`, 'error');
      } else {
        log(`Server error: ${error.message}`, 'error');
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown());
    process.on('SIGINT', () => gracefulShutdown());
  } catch (error) {
    log(`Failed to start server: ${error}`, 'error');
    process.exit(1);
  }
}

async function gracefulShutdown() {
  log('Received shutdown signal. Closing server...', 'warn');
  if (server) {
    server.close(() => {
      log('Server closed successfully', 'info');
      process.exit(0);
    });
    
    // Force close after 10s
    setTimeout(() => {
      log('Could not close connections in time, forcefully shutting down', 'error');
      process.exit(1);
    }, 10000);
  }
}

startServer();
