import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";

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

  // Serve the app on port 5000
  // this serves both the API and the client
  const PORT = 5000;
  
  // Handle server errors and graceful shutdown
  function handleServerError(error: Error & { code?: string }) {
    if (error.code === 'EADDRINUSE') {
      log(`Port ${PORT} is already in use. Please try a different port or stop the process using this port.`);
      process.exit(1);
    } else {
      log(`Failed to start server: ${error.message}`);
      throw error;
    }
  }

  // Set up graceful shutdown
  function shutdownGracefully() {
    log('Shutting down gracefully...');
    server.close(() => {
      log('Server closed');
      process.exit(0);
    });

    // Force shutdown after 10s if server hasn't closed
    setTimeout(() => {
      log('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  }

  // Handle process termination
  process.on('SIGTERM', shutdownGracefully);
  process.on('SIGINT', shutdownGracefully);

  server.listen(PORT, "0.0.0.0")
    .on('listening', () => {
      log(`serving on port ${PORT}`);
    })
    .on('error', handleServerError);
})();
