import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import path from "path";
import * as fs from 'fs/promises';
import { execSync } from 'child_process';

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [express] ${message}`);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register routes before setting up Vite
  registerRoutes(app);
  const server = createServer(app);

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Server error:', err);
    res.status(status).json({ message });
  });

  // Setup Vite in development mode
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Ensure uploads and cache directories exist with proper permissions
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const cacheDir = path.join(process.cwd(), 'public', 'cache');
  
  try {
    // Create directories with proper permissions
    await fs.mkdir(uploadsDir, { recursive: true, mode: 0o755 });
    await fs.mkdir(cacheDir, { recursive: true, mode: 0o755 });
    
    // Verify write permissions with test files
    const testUploadFile = path.join(uploadsDir, '.write-test');
    const testCacheFile = path.join(cacheDir, '.write-test');
    
    await fs.writeFile(testUploadFile, '', { mode: 0o644 });
    await fs.writeFile(testCacheFile, '', { mode: 0o644 });
    
    // Clean up test files
    await fs.unlink(testUploadFile).catch(() => {});
    await fs.unlink(testCacheFile).catch(() => {});
    
    log('Directories created and verified successfully');
  } catch (error) {
    console.error('Error creating or verifying directories:', error);
    throw new Error('Failed to setup required directories');
  }

  // Server configuration
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  const HOST = process.env.HOST || "0.0.0.0";

  // Handle existing connections and start server
  if (process.env.NODE_ENV === 'development') {
    const { execSync } = await import('child_process');
    try {
      // Check if port is in use
      const command = process.platform === 'win32'
        ? `netstat -ano | findstr :${PORT}`
        : `lsof -i :${PORT} -t`;
      const output = execSync(command).toString();
      
      if (output) {
        // Port is in use, attempt to kill the process
        const pid = process.platform === 'win32'
          ? output.split('\n')[0].split(/\s+/)[5]
          : output.trim();

        if (pid) {
          process.platform === 'win32'
            ? execSync(`taskkill /F /PID ${pid}`)
            : execSync(`kill -9 ${pid}`);
          log(`Killed process ${pid} using port ${PORT}`);
        }
      }
    } catch (err) {
      log(`Port ${PORT} is available`);
    }
  }

  // Handle process termination
  const handleShutdown = (signal: string) => {
    log(`Received ${signal}. Gracefully shutting down...`);
    server.close(() => {
      log('Server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      log('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    handleShutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    handleShutdown('unhandledRejection');
  });

  // Start the server with improved error handling
  // Enhanced server startup with retries
  const startServer = async (retries = 3) => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const serverInstance = server.listen(PORT, HOST, () => {
            log(`Server started successfully on ${HOST}:${PORT}`);
            resolve();
          });

          serverInstance.on('error', (error: any) => {
            if (error.code === 'EADDRINUSE') {
              log(`Port ${PORT} is in use. Attempting cleanup...`);
              serverInstance.close();
              reject(new Error('PORT_IN_USE'));
            } else {
              console.error('Server error:', error);
              reject(error);
            }
          });
        });

        // If we get here, server started successfully
        return;
      } catch (error) {
        if (error.message === 'PORT_IN_USE' && attempt < retries - 1) {
          log(`Retrying server start in 1 second... (Attempt ${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw error;
      }
    }
  };

  try {
    await startServer();
  } catch (error) {
    console.error('Failed to start server after retries:', error);
    process.exit(1);
  }
})();
