import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";

function log(message: string, type: 'info' | 'error' | 'debug' = 'info') {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const color = type === 'error' ? '\x1b[31m' : type === 'debug' ? '\x1b[33m' : '\x1b[32m';
  console.log(`${color}${formattedTime} [express:${type}]\x1b[0m ${message}`);
}

// Check if port is available
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
      .listen(port, () => {
        server.close();
        resolve(true);
      })
      .on('error', () => {
        resolve(false);
      });
  });
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced request logging middleware
app.use(async (req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Capture JSON responses
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log request completion
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    
    if (res.statusCode >= 400) {
      log(logLine + (capturedJsonResponse ? ` :: ${JSON.stringify(capturedJsonResponse)}` : ''), 'error');
    } else if (path.startsWith("/api")) {
      log(logLine + (capturedJsonResponse ? ` :: ${JSON.stringify(capturedJsonResponse)}` : ''), 'info');
    } else {
      log(logLine, 'debug');
    }
  });

  next();
});

(async () => {
  try {
    // Only register routes if we have a database URL in production
    // or if we're in development mode
    if (process.env.DATABASE_URL || process.env.NODE_ENV === 'development') {
      registerRoutes(app);
    } else {
      log('Warning: DATABASE_URL not configured. Some features may be unavailable.');
    }

    const server = createServer(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Don't throw error in development mode for database-related issues
      if (process.env.NODE_ENV === 'development' && message.toLowerCase().includes('database')) {
        log(`Database Error: ${message}`);
        res.status(status).json({ message: 'Database not configured in development mode' });
      } else {
        res.status(status).json({ message });
        throw err;
      }
    });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  
  const startServer = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const portAvailable = await isPortAvailable(PORT);
        if (!portAvailable) {
          log(`Port ${PORT} is not available, attempting to clean up...`, 'debug');
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        server.listen(PORT, "0.0.0.0", () => {
          log(`Server started successfully on port ${PORT}`, 'info');
          log(`Mode: ${process.env.NODE_ENV}`, 'info');
          if (process.env.NODE_ENV === 'development') {
            log('Development server ready - waiting for file changes...', 'info');
          }
        });
        
        return true;
      } catch (err) {
        log(`Attempt ${i + 1}/${retries} failed: ${err.message}`, 'error');
        if (i === retries - 1) {
          log('Failed to start server after multiple attempts', 'error');
          process.exit(1);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return false;
  };

  await startServer();
})();
