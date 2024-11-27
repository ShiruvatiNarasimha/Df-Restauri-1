import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import path from "path";
import * as fs from 'fs/promises';

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
  registerRoutes(app);
  const server = createServer(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
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

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  const HOST = process.env.HOST || "0.0.0.0";

  const startServer = () => {
    try {
      server.listen(PORT, HOST, () => {
        log(`Server started successfully on ${HOST}:${PORT}`);
      });
    } catch (error) {
      log(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  };

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
      // If the command fails, it likely means the port is not in use
      log(`Port ${PORT} is available`);
    }
  }

  startServer();
})();
