import type { Express, Request, Response, NextFunction } from "express";
import path from "path";
import multer from "multer";
import { eq, sql } from "drizzle-orm";
import { promises as fs } from "fs";
import { convertToWebP, ensureCacheDirectory, isImagePath } from "./utils/imageProcessing";
import { db } from "@db/index";
import { team } from "@db/schema";
import jwt from "jsonwebtoken";

// Global error logging function for team API
const logTeamError = (context: string, error: unknown, additionalInfo: Record<string, unknown> = {}) => {
  console.error(`[TeamAPI] ${context}:`, {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error,
    ...additionalInfo
  });
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Configure multer for file uploads with enhanced error handling
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP are allowed'));
    }
  }
});

// Authentication middleware with enhanced error handling
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number; role: string };
    req.user = decoded;
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(401).json({ 
      message: error instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token',
      code: error instanceof jwt.TokenExpiredError ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
    });
  }
}

// WebP middleware with proper error handling
async function webpMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;

  res.send = function(body: any) {
    const handleSend = async () => {
      if (isImagePath(req.path)) {
        try {
          const webpPath = await convertToWebP(req.path);
          if (webpPath) {
            res.type('image/webp');
            return originalSend.call(res, webpPath);
          }
        } catch (error) {
          console.error('WebP conversion error:', error);
        }
      }
      return originalSend.call(res, body);
    };

    handleSend().catch(next);
    return res;
  };

  next();
}

// CORS middleware
function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const allowedOrigins = ['http://localhost:3000', 'http://0.0.0.0:3000'];
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}

export function registerRoutes(app: Express) {
  // Add middlewares
  app.use(corsMiddleware);
  app.use(webpMiddleware);

  // Health check endpoint
  app.get("/api/health", async (_req, res) => {
    try {
      await db.execute(sql`SELECT 1`);
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Database connection failed"
      });
    }
  });

  // Team API Routes with enhanced error handling and retries
  app.get("/api/team", async (_req, res) => {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const allTeamMembers = await db.select().from(team);
        return res.json(allTeamMembers);
      } catch (error) {
        logTeamError('Failed to fetch team members', error, { retryCount });
        
        if (retryCount === maxRetries - 1) {
          return res.status(500).json({ 
            message: "Error fetching team members",
            code: 'DB_FETCH_ERROR',
            details: error instanceof Error ? error.message : 'Unknown database error'
          });
        }

        retryCount++;
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000 + jitter));
      }
    }
  });

  // Create team member with improved validation
  app.post("/api/team", requireAuth, upload.single('image'), async (req: AuthenticatedRequest, res) => {
    try {
      const { name, role, bio, socialLinks } = req.body;
      
      // Enhanced validation
      if (!name?.trim() || !role?.trim() || !bio?.trim()) {
        return res.status(400).json({
          message: "Missing required fields",
          code: 'VALIDATION_ERROR'
        });
      }

      // Set default image path
      let imagePath = '/images/fallback/profile-fallback.jpg';
      
      // Process uploaded image
      if (req.file) {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        const originalPath = path.join(uploadDir, req.file.filename);
        
        try {
          // Ensure upload directory exists
          await fs.mkdir(uploadDir, { recursive: true });
          
          // Move uploaded file to uploads directory
          imagePath = `/uploads/${req.file.filename}`;
          
          // Convert to WebP with enhanced error handling
          try {
            const webpPath = await convertToWebP(imagePath);
            if (webpPath) {
              imagePath = webpPath;
              // Clean up original file after successful conversion
              await fs.unlink(originalPath).catch(err => 
                console.error('Error cleaning up original file:', err)
              );
            }
          } catch (error) {
            console.error('Error converting image to WebP:', error);
            // Keep original file if WebP conversion fails
          }
        } catch (error) {
          console.error('Error processing uploaded image:', error);
          return res.status(500).json({
            message: "Error processing image upload",
            code: 'IMAGE_PROCESSING_ERROR'
          });
        }
      }

      // Parse and validate social links with enhanced validation
      let parsedSocialLinks;
      try {
        // Handle both string and array inputs
        parsedSocialLinks = typeof socialLinks === 'string' 
          ? JSON.parse(socialLinks || '[]')
          : socialLinks || [];

        if (!Array.isArray(parsedSocialLinks)) {
          throw new Error('Social links must be an array');
        }
        
        // Validate each social link with URL validation and platform restrictions
        parsedSocialLinks = parsedSocialLinks.map((link: any) => {
          if (!link || typeof link !== 'object') {
            throw new Error('Invalid social link object');
          }

          if (!link.platform || !link.url || 
              typeof link.platform !== 'string' || 
              typeof link.url !== 'string') {
            throw new Error('Invalid social link format');
          }

          // Validate platform
          const validPlatforms = ['facebook', 'twitter', 'instagram', 'linkedin'];
          const platform = link.platform.toLowerCase();
          if (!validPlatforms.includes(platform)) {
            throw new Error(`Invalid platform: ${link.platform}. Must be one of: ${validPlatforms.join(', ')}`);
          }
          
          // Validate URL format and protocol
          try {
            const url = new URL(link.url);
            if (!['http:', 'https:'].includes(url.protocol)) {
              throw new Error('URL must use http or https protocol');
            }
          } catch (err) {
            // Type guard for Error instances
            const errorMessage = err instanceof Error 
              ? err.message 
              : 'Invalid URL format';
            
            throw new Error(`Invalid URL format for platform ${link.platform}: ${errorMessage}`);
          }
          
          return {
            platform,
            url: link.url.trim()
          };
        });
      } catch (error) {
        return res.status(400).json({
          message: error instanceof Error ? error.message : "Invalid social links format",
          code: 'VALIDATION_ERROR'
        });
      }

      // Create team member with validated data
      const newMember = await db.insert(team).values({
        name: name.trim(),
        role: role.trim(),
        bio: bio.trim(),
        image: imagePath,
        socialLinks: parsedSocialLinks
      }).returning();

      if (!newMember.length) {
        throw new Error('Failed to create team member record');
      }

      res.status(201).json(newMember[0]);
    } catch (error) {
      logTeamError('Failed to create team member', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Error creating team member",
        code: 'DB_INSERT_ERROR'
      });
    }
  });

  // Update team member with improved validation
  app.put("/api/team/:id", requireAuth, upload.single('image'), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { name, role, bio, socialLinks } = req.body;
      
      if (!name?.trim() || !role?.trim() || !bio?.trim()) {
        return res.status(400).json({
          message: "Missing required fields",
          code: 'VALIDATION_ERROR'
        });
      }

      const updateData: any = {
        name: name.trim(),
        role: role.trim(),
        bio: bio.trim()
      };

      if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
        
        // Convert uploaded image to WebP
        try {
          const webpPath = await convertToWebP(updateData.image);
          if (webpPath) {
            updateData.image = webpPath;
          }
        } catch (error) {
          console.error('Error converting image to WebP:', error);
        }
      }

      if (socialLinks) {
        try {
          const parsed = JSON.parse(socialLinks);
          if (!Array.isArray(parsed)) {
            throw new Error('Social links must be an array');
          }
          parsed.forEach((link: any) => {
            if (!link.platform || !link.url || typeof link.platform !== 'string' || typeof link.url !== 'string') {
              throw new Error('Invalid social link format');
            }
          });
          updateData.socialLinks = parsed;
        } catch (error) {
          return res.status(400).json({
            message: "Invalid social links format",
            code: 'VALIDATION_ERROR'
          });
        }
      }

      const updated = await db.update(team)
        .set(updateData)
        .where(eq(team.id, parseInt(id)))
        .returning();

      if (!updated.length) {
        return res.status(404).json({
          message: "Team member not found",
          code: 'NOT_FOUND'
        });
      }

      res.json(updated[0]);
    } catch (error) {
      logTeamError('Failed to update team member', error);
      res.status(500).json({ 
        message: "Error updating team member",
        code: 'DB_UPDATE_ERROR'
      });
    }
  });

  // Delete team member
  app.delete("/api/team/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const deleted = await db.delete(team)
        .where(eq(team.id, parseInt(id)))
        .returning();

      if (!deleted.length) {
        return res.status(404).json({
          message: "Team member not found",
          code: 'NOT_FOUND'
        });
      }

      res.json({ message: "Team member deleted successfully" });
    } catch (error) {
      logTeamError('Failed to delete team member', error);
      res.status(500).json({ 
        message: "Error deleting team member",
        code: 'DB_DELETE_ERROR'
      });
    }
  });
}
