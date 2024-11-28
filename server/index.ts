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
// Increase JSON payload limit and add timeout
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
// Add timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds timeout
  res.setTimeout(30000);
  next();
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

  // Server configuration with dynamic port allocation
  const BASE_PORT = process.env.PORT ? parseInt(process.env.PORT) : 5001;
  const MAX_PORT = BASE_PORT + 10; // Try up to 10 ports if base port is taken
  const HOST = process.env.HOST || "0.0.0.0";

  // Enhanced port checker with proper error handling
  const checkPort = async (port: number): Promise<boolean> => {
    try {
      const command = process.platform === 'win32'
        ? `netstat -ano | findstr :${port}`
        : `lsof -i :${port} -t`;
      const output = execSync(command).toString();
      return !output; // Port is available if no output
    } catch (err) {
      // If command fails, it usually means port is available
      return true;
    }
  };

  // Enhanced process cleanup with safety checks
  const cleanupPort = async (port: number): Promise<boolean> => {
    try {
      const command = process.platform === 'win32'
        ? `netstat -ano | findstr :${port}`
        : `lsof -i :${port} -t`;
      const output = execSync(command).toString();
      
      if (!output) {
        log(`No process found using port ${port}`);
        return true;
      }

      const pids = output.split('\n')
        .map(line => {
          if (process.platform === 'win32') {
            const parts = line.trim().split(/\s+/);
            return parts[parts.length - 1];
          }
          return line.trim();
        })
        .filter(Boolean);

      for (const pid of pids) {
        try {
          // Add safety check to prevent killing system processes
          const isNodeProcess = process.platform === 'win32'
            ? execSync(`tasklist /FI "PID eq ${pid}" /FO CSV`).toString().toLowerCase().includes('node')
            : execSync(`ps -p ${pid} -o comm=`).toString().toLowerCase().includes('node');

          if (isNodeProcess) {
            process.platform === 'win32'
              ? execSync(`taskkill /F /PID ${pid}`)
              : execSync(`kill -15 ${pid}`); // Use SIGTERM first
            log(`Successfully terminated process ${pid} using port ${port}`);
            
            // Wait a bit for the port to be released
            await new Promise(resolve => setTimeout(resolve, 1000));
            return await checkPort(port);
          } else {
            log(`Process ${pid} on port ${port} is not a Node.js process, skipping`);
          }
        } catch (err) {
          log(`Failed to terminate process ${pid}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    } catch (err) {
      log(`Error during port cleanup: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    return false;
  };

  // Find available port with retry mechanism
  const findAvailablePort = async (): Promise<number> => {
    for (let port = BASE_PORT; port <= MAX_PORT; port++) {
      log(`Checking port ${port}...`);
      if (await checkPort(port)) {
        return port;
      }
      
      log(`Port ${port} is in use, attempting cleanup...`);
      if (await cleanupPort(port)) {
        return port;
      }
      
      log(`Could not free port ${port}, trying next port...`);
    }
    throw new Error(`No available ports found in range ${BASE_PORT}-${MAX_PORT}`);
  };

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

  // Enhanced server startup with better error handling and connection tracking
  const startServer = async (retries = 3) => {
    const activeConnections = new Set();
    let currentPort: number;
    
    // Enhanced connection tracking
    const trackConnections = (serverInstance: any) => {
      serverInstance.on('connection', (conn: any) => {
        activeConnections.add(conn);
        conn.on('close', () => activeConnections.delete(conn));
        // Set reasonable timeouts
        conn.setTimeout(30000); // 30 seconds timeout
        conn.on('timeout', () => {
          log(`Connection timed out, destroying...`);
          conn.destroy();
        });
      });
    };

    // Improved cleanup with timeout and forced termination
    const cleanup = async (serverInstance?: any) => {
      return new Promise<void>((resolve) => {
        const timeoutId = setTimeout(() => {
          log('Cleanup timeout reached, forcing termination...');
          activeConnections.forEach((conn: any) => conn.destroy());
          if (serverInstance) serverInstance.close();
          resolve();
        }, 5000);

        if (activeConnections.size === 0) {
          clearTimeout(timeoutId);
          resolve();
          return;
        }

        log(`Cleaning up ${activeConnections.size} active connections...`);
        const cleanupPromises = Array.from(activeConnections).map((conn: any) => 
          new Promise<void>((resolveConn) => {
            conn.end(() => {
              conn.destroy();
              resolveConn();
            });
          })
        );

        Promise.all(cleanupPromises).then(() => {
          clearTimeout(timeoutId);
          resolve();
        });
      });
    };

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Find an available port
        currentPort = await findAvailablePort();
        
        // Create new server instance for each attempt
        const serverInstance = server.listen(currentPort, HOST);
        trackConnections(serverInstance);

        await new Promise<void>((resolve, reject) => {
          serverInstance.once('listening', () => {
            log(`Server started successfully on ${HOST}:${currentPort}`);
            // Store the port in an environment variable for other services
            process.env.SERVER_PORT = currentPort.toString();
            resolve();
          });

          serverInstance.once('error', async (error: any) => {
            log(`Server startup error on port ${currentPort}: ${error.message}`);
            await cleanup(serverInstance);
            serverInstance.close();
            reject(error);
          });

          // Set a timeout for the startup attempt
          setTimeout(() => {
            reject(new Error(`Server startup timed out on port ${currentPort}`));
          }, 10000);
        });

        // Setup graceful shutdown
        const shutdownHandler = async (signal: string) => {
          log(`Received ${signal}. Initiating graceful shutdown...`);
          await cleanup(serverInstance);
          serverInstance.close(() => {
            log('Server closed successfully');
            process.exit(0);
          });

          // Force shutdown after 10 seconds
          setTimeout(() => {
            log('Forced shutdown after timeout');
            process.exit(1);
          }, 10000);
        };

        process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
        process.on('SIGINT', () => shutdownHandler('SIGINT'));

        return; // Server started successfully
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log(`Attempt ${attempt + 1}/${retries} failed: ${errorMessage}`);

        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          log(`Retrying server start in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw new Error(`Failed to start server after ${retries} attempts: ${errorMessage}`);
        }
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
