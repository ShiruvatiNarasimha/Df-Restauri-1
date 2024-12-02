import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Configure compression middleware with optimized settings
export const compressionMiddleware = compression({
  level: 6, // Balanced compression level for better performance
  threshold: 1024, // Compress responses larger than 1KB
  memLevel: 8, // Optimize memory usage for compression
  windowBits: 15, // Maximum window size for better compression
  filter: (req: Request) => {
    const type = req.headers['content-type'] || '';
    const path = req.path;

    // Skip compression for already compressed formats
    if (
      type.includes('image/') || 
      type.includes('video/') || 
      type.includes('audio/') ||
      type.includes('application/zip') ||
      type.includes('application/pdf') ||
      path.endsWith('.gz') ||
      path.endsWith('.br')
    ) {
      return false;
    }

    // Always compress API responses and text-based formats
    if (
      path.startsWith('/api/') ||
      type.includes('text/') ||
      type.includes('application/json') ||
      type.includes('application/javascript') ||
      type.includes('application/xml') ||
      type.includes('application/x-www-form-urlencoded')
    ) {
      return true;
    }

    return compression.filter(req, {} as Response);
  }
});

// Configure dynamic rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: (req) => {
    // Allow more requests for static resources
    if (req.path.startsWith('/images/') || req.path.startsWith('/uploads/')) {
      return 300;
    }
    // Stricter limits for authentication endpoints
    if (req.path.includes('/auth/')) {
      return 20;
    }
    // Default limit for API endpoints
    return 100;
  },
  message: {
    status: 'error',
    message: 'Troppe richieste, riprova più tardi.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Enhanced cache control middleware with resource-specific strategies
export const cacheControl = (req: Request, res: Response, next: NextFunction) => {
  const path = req.path;
  const method = req.method;
  
  // Skip cache control for non-GET requests
  if (method !== 'GET') {
    res.set('Cache-Control', 'no-store');
    return next();
  }

  // Define cache strategies based on content type and path
  const cacheStrategies = {
    staticAssets: {
      match: (p: string) => 
        p.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/) ||
        p.startsWith('/images/') ||
        p.startsWith('/uploads/'),
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
        'Vary': 'Accept-Encoding',
        'ETag': 'true'
      }
    },
    scripts: {
      match: (p: string) => p.match(/\.(js|css|woff2|woff|ttf)$/),
      headers: {
        'Cache-Control': 'public, max-age=604800, must-revalidate', // 1 week
        'Vary': 'Accept-Encoding, Accept',
        'ETag': 'true'
      }
    },
    html: {
      match: (p: string) => p.match(/\.html$/) || p === '/',
      headers: {
        'Cache-Control': 'public, max-age=3600, must-revalidate', // 1 hour
        'Vary': 'Accept-Encoding, Accept-Language',
        'ETag': 'true'
      }
    },
    api: {
      match: (p: string) => p.startsWith('/api/'),
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }
  };

  // Apply cache strategy based on path
  for (const [_, strategy] of Object.entries(cacheStrategies)) {
    if (strategy.match(path)) {
      Object.entries(strategy.headers).forEach(([header, value]) => {
        res.set(header, value);
      });
      return next();
    }
  }

  // Default caching strategy
  res.set({
    'Cache-Control': 'public, max-age=3600', // 1 hour
    'Vary': 'Accept-Encoding',
    'ETag': 'true'
  });
  
  next();
};
