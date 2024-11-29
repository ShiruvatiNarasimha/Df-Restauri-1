import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import * as fs from 'fs/promises';
import path from 'path';

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
    console.error('Server error:', {
      status,
      message,
      timestamp: new Date().toISOString(),
      error: err instanceof Error ? {
        name: err.name,
        message: err.message,
        stack: err.stack
      } : err
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  // Create necessary directories with robust error handling
  const publicDir = path.join(process.cwd(), 'public');
  const cacheDir = path.join(publicDir, 'cache');
  const uploadsDir = path.join(publicDir, 'uploads');
  const fallbackDir = path.join(publicDir, 'images', 'fallback');
  const imagesDir = path.join(publicDir, 'images');

  const setupDirectories = async () => {
    const directories = [
      { path: publicDir, name: 'Public', required: true },
      { path: imagesDir, name: 'Images', required: true },
      { path: cacheDir, name: 'Cache', required: false },
      { path: uploadsDir, name: 'Uploads', required: true },
      { path: fallbackDir, name: 'Fallback', required: true }
    ];

    const createDirectory = async (dir: { path: string; name: string; required: boolean }) => {
      try {
        // Ensure parent directory exists first
        const parentDir = path.dirname(dir.path);
        await fs.mkdir(parentDir, { recursive: true, mode: 0o755 });
        
        // Create directory with permissions
        await fs.mkdir(dir.path, { recursive: true, mode: 0o755 });
        
        // Verify write permissions with multiple retries
        const testFile = path.join(dir.path, '.write-test');
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
          try {
            await fs.writeFile(testFile, 'test', { mode: 0o644 });
            await fs.unlink(testFile);
            break;
          } catch (writeError) {
            attempts++;
            if (attempts === maxAttempts) throw writeError;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between attempts
          }
        }
        
        log(`${dir.name} directory setup successful: ${dir.path}`);
        return true;
      } catch (error) {
        if (!dir.required) {
          log(`Warning: Optional ${dir.name} directory setup failed, continuing without it`);
          return false;
        }
        throw error;
      }
    };

    for (const dir of directories) {
      try {
        const success = await createDirectory(dir);
        if (!success && dir.required) {
          throw new Error(`Failed to setup required directory: ${dir.name}`);
        }
      } catch (error) {
        console.error(`Error setting up ${dir.name.toLowerCase()} directory:`, {
          directory: dir.path,
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : error,
          timestamp: new Date().toISOString()
        });
        
        if (dir.required) {
          throw new Error(`Failed to setup required ${dir.name.toLowerCase()} directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  };

  try {
    await setupDirectories();
    log('All directory structures created and verified successfully');
    
    log('Directory structure created and verified successfully');
  } catch (error) {
    console.error('Error setting up directory structure:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      directories: {
        public: publicDir,
        cache: cacheDir,
        uploads: uploadsDir
      },
      timestamp: new Date().toISOString()
    });
    // Continue execution but log the error
    log('Warning: Directory setup encountered issues, some features may be limited');
  }

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use port 5007 to avoid conflicts
  const PORT = process.env.PORT || 5007;
  server.listen({
    port: typeof PORT === 'string' ? parseInt(PORT, 10) : PORT,
    host: "0.0.0.0"
  }, () => {
    log(`serving on port ${PORT}`);
  }).on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      log(`Port ${PORT} is already in use. Please try a different port.`);
      process.exit(1);
    } else {
      log(`Error starting server: ${error.message}`);
      throw error;
    }
  });
})();
