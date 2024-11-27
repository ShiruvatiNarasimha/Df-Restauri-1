import type { Express, Request, Response, NextFunction } from "express";
import path from "path";
import multer from "multer";
import { eq, sql } from "drizzle-orm";
import { convertToWebP, ensureCacheDirectory, isImagePath, getMimeType } from "./utils/imageProcessing";
import { constants } from 'fs';
import * as fs from 'fs/promises';

import { db } from "@db/index";
import { projects, services, team, users } from "@db/schema";
import bcrypt from "bcrypt";
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
const FALLBACK_DIR = path.join(process.cwd(), 'public', 'images', 'fallback');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Middleware to handle WebP conversion
async function webpMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only process image requests
  if (!req.path.startsWith('/images') || !isImagePath(req.path)) {
    return next();
  }

  const logMiddlewareError = (context: string, error: unknown, additionalInfo: Record<string, unknown> = {}) => {
    console.error(`[WebPMiddleware] ${context}:`, {
      path: req.path,
      userAgent: req.headers['user-agent'],
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      timestamp: new Date().toISOString(),
      ...additionalInfo
    });
  };

  try {
    const imagePath = path.join(process.cwd(), 'public', req.path);
    const fallbackPath = path.join(FALLBACK_DIR, 'image-fallback.jpg');

    // Check if original image exists and is readable
    try {
      await fs.access(imagePath, constants.R_OK);
      const stats = await fs.stat(imagePath);
      if (stats.size === 0) {
        throw new Error('Image file is empty');
      }
    } catch (error) {
      logMiddlewareError('Image access', error, { imagePath });

      // Try to serve fallback image
      try {
        await fs.access(fallbackPath, constants.R_OK);
        const fallbackStats = await fs.stat(fallbackPath);
        if (fallbackStats.size === 0) {
          throw new Error('Fallback image is empty');
        }
        res.setHeader('Content-Type', getMimeType(fallbackPath));
        res.setHeader('X-Image-Fallback', 'true');
        return res.sendFile(fallbackPath);
      } catch (fallbackError) {
        logMiddlewareError('Fallback image access', fallbackError, { fallbackPath });
        return res.status(404).json({
          error: 'Image not found',
          details: 'Both original and fallback images are inaccessible'
        });
      }
    }

    // Ensure cache directory exists with proper permissions
    try {
      await ensureCacheDirectory();
    } catch (error) {
      logMiddlewareError('Cache directory', error);
      res.setHeader('Content-Type', getMimeType(imagePath));
      res.setHeader('X-Cache-Error', 'true');
      return res.sendFile(imagePath);
    }

    // Check if browser supports WebP
    const acceptHeader = req.headers.accept || '';
    const supportsWebP = acceptHeader.includes('image/webp');

    // Get image MIME type
    const mimeType = getMimeType(imagePath);
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      logMiddlewareError('Invalid MIME type', new Error(`Unsupported MIME type: ${mimeType}`), { mimeType });
      res.setHeader('Content-Type', getMimeType(fallbackPath));
      res.setHeader('X-Invalid-Type', 'true');
      return res.sendFile(fallbackPath);
    }

    if (!supportsWebP) {
      res.setHeader('Content-Type', mimeType);
      res.setHeader('X-WebP-Support', 'false');
      return res.sendFile(imagePath);
    }

    // Try WebP conversion
    try {
      const webpPath = await convertToWebP(imagePath);
      if (webpPath === imagePath) {
        res.setHeader('Content-Type', mimeType);
        res.setHeader('X-WebP-Conversion', 'failed');
        return res.sendFile(imagePath);
      }
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('X-WebP-Conversion', 'success');
      return res.sendFile(path.join(process.cwd(), 'public', webpPath));
    } catch (conversionError) {
      logMiddlewareError('WebP conversion', conversionError, { imagePath });
      res.setHeader('Content-Type', mimeType);
      res.setHeader('X-WebP-Error', 'true');
      return res.sendFile(imagePath);
    }
  } catch (error) {
    logMiddlewareError('General error', error);
    next(error);
  }
}

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number; role: string };
    req.user = decoded;
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// CORS middleware with proper headers and preflight handling
function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
}

// Request timeout middleware
function timeoutMiddleware(req: Request, res: Response, next: NextFunction) {
  const timeout = 30000; // 30 seconds timeout
  req.setTimeout(timeout, () => {
    res.status(408).json({
      message: "Request timeout",
      code: 'TIMEOUT_ERROR'
    });
  });
  next();
}

export async function registerRoutes(app: Express) {
  // Ensure cache directory exists
  await ensureCacheDirectory();
  
  // Add middlewares
  app.use(corsMiddleware);
  app.use(timeoutMiddleware);
  app.use(webpMiddleware);

  // Health check endpoint
  app.get("/api/health", async (_req, res) => {
    try {
      // Check database connection
      await db.execute(sql`SELECT 1`);
      
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: "connected",
        services: {
          api: "up",
          database: "up"
        }
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Database connection failed",
        services: {
          api: "up",
          database: "down"
        }
      });
    }
  });

  // Team API Routes
  app.get("/api/team", async (_req, res) => {
    try {
      // Validate database connection
      try {
        await db.execute(sql`SELECT 1`);
      } catch (dbError) {
        logTeamError('Database connection check failed', dbError);
        return res.status(503).json({
          message: "Database service unavailable",
          code: 'DB_CONN_ERROR'
        });
      }

      const allTeamMembers = await db.select().from(team);
      
      console.log('[TeamAPI] Successfully fetched team members:', {
        count: allTeamMembers.length,
        timestamp: new Date().toISOString()
      });

      res.json(allTeamMembers);
    } catch (error) {
      logTeamError('Failed to fetch team members', error, {
        endpoint: '/api/team',
        method: 'GET'
      });

      if (error instanceof Error) {
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ 
          message: "Error fetching team members",
          error: error.message,
          code: 'DB_FETCH_ERROR'
        });
      } else {
        res.status(500).json({ 
          message: "An unexpected error occurred while fetching team members",
          code: 'UNKNOWN_ERROR'
        });
      }
    }
  });

  app.post("/api/team", requireAuth, upload.single('image'), async (req, res) => {
    try {
      // Validate database connection first
      try {
        await db.execute(sql`SELECT 1`);
      } catch (dbError) {
        logTeamError('Database connection check failed', dbError);
        return res.status(503).json({
          message: "Database service unavailable",
          code: 'DB_CONN_ERROR'
        });
      }

      const { name, role, bio, socialLinks } = req.body;
      
      // Validate required fields
      if (!name?.trim() || !role?.trim() || !bio?.trim()) {
        return res.status(400).json({ 
          message: "Missing required fields",
          details: "Name, role, and bio are required and cannot be empty",
          code: 'VALIDATION_ERROR'
        });
      }

      // Validate field lengths
      if (name.length > 100 || role.length > 100 || bio.length > 500) {
        return res.status(400).json({
          message: "Field length exceeded",
          details: "Name and role must be under 100 characters, bio under 500 characters",
          code: 'VALIDATION_ERROR'
        });
      }

      // Validate social links
      let parsedSocialLinks;
      try {
        parsedSocialLinks = JSON.parse(socialLinks || '[]');
        if (!Array.isArray(parsedSocialLinks)) {
          throw new Error('Social links must be an array');
        }
        
        // Validate each social link
        for (const link of parsedSocialLinks) {
          if (!link.platform || !link.url || typeof link.url !== 'string') {
            throw new Error('Invalid social link format');
          }
          
          if (!['facebook', 'twitter', 'instagram', 'linkedin'].includes(link.platform.toLowerCase())) {
            throw new Error(`Unsupported platform: ${link.platform}`);
          }

          try {
            new URL(link.url);
          } catch {
            throw new Error(`Invalid URL for platform: ${link.platform}`);
          }
        }
      } catch (error) {
        return res.status(400).json({
          message: "Invalid social links format",
          error: error instanceof Error ? error.message : "Unknown error",
          code: 'VALIDATION_ERROR'
        });
      }

      // Validate image
      if (!req.file) {
        return res.status(400).json({
          message: "Image is required",
          code: 'VALIDATION_ERROR'
        });
      }

      const imagePath = `/uploads/${req.file.filename}`;
      
      // Use transaction for data persistence
      const newMember = await db.transaction(async (tx) => {
        try {
          const inserted = await tx.insert(team).values({
            name: name.trim(),
            role: role.trim(),
            bio: bio.trim(),
            image: imagePath,
            socialLinks: parsedSocialLinks
          }).returning();

          return inserted[0];
        } catch (txError) {
          logTeamError('Transaction failed', txError, { 
            operation: 'insert',
            data: { name, role }
          });
          throw txError;
        }
      });

      console.log('[TeamAPI] Successfully created team member:', {
        id: newMember.id,
        name: newMember.name,
        timestamp: new Date().toISOString()
      });

      res.json(newMember);
    } catch (error) {
      logTeamError('Failed to create team member', error, {
        endpoint: '/api/team',
        method: 'POST'
      });

      // Handle specific database constraints
      if (error instanceof Error) {
        if (error.message.includes('unique constraint')) {
          return res.status(409).json({
            message: "A team member with this information already exists",
            code: 'DUPLICATE_ERROR'
          });
        }

        res.status(500).json({ 
          message: "Error creating team member",
          error: error.message,
          code: 'DB_INSERT_ERROR'
        });
      } else {
        res.status(500).json({ 
          message: "An unexpected error occurred while creating team member",
          code: 'UNKNOWN_ERROR'
        });
      }
    }
  });

  app.put("/api/team/:id", requireAuth, upload.single('image'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, role, bio, socialLinks } = req.body;
      
      // Validate required fields
      if (!name?.trim() || !role?.trim() || !bio?.trim()) {
        return res.status(400).json({ 
          message: "Missing required fields",
          details: "Name, role, and bio are required and cannot be empty",
          code: 'VALIDATION_ERROR'
        });
      }

      // Validate social links
      let parsedSocialLinks;
      try {
        parsedSocialLinks = JSON.parse(socialLinks || '[]');
        if (!Array.isArray(parsedSocialLinks)) {
          throw new Error('Social links must be an array');
        }

        // Validate each social link
        for (const link of parsedSocialLinks) {
          if (!link.platform || !link.url || typeof link.url !== 'string') {
            throw new Error('Invalid social link format');
          }

          if (!['facebook', 'twitter', 'instagram', 'linkedin'].includes(link.platform.toLowerCase())) {
            throw new Error(`Unsupported platform: ${link.platform}`);
          }

          try {
            new URL(link.url);
          } catch {
            throw new Error(`Invalid URL for platform: ${link.platform}`);
          }
        }
      } catch (error) {
        return res.status(400).json({
          message: "Invalid social links format",
          error: error instanceof Error ? error.message : "Unknown error",
          code: 'VALIDATION_ERROR'
        });
      }

      const updateData: any = {
        name: name.trim(),
        role: role.trim(),
        bio: bio.trim(),
        socialLinks: parsedSocialLinks
      };

      if (req.file) {
        // Get the old image path before updating
        const oldMember = await db.select().from(team).where(eq(team.id, parseInt(id)));
        if (oldMember.length > 0 && oldMember[0].image) {
          const oldImagePath = path.join(process.cwd(), 'public', oldMember[0].image);
          // Clean up old image
          try {
            await fs.access(oldImagePath, constants.F_OK);
            await fs.unlink(oldImagePath);
          } catch (error) {
            logTeamError('Failed to delete old image', error, { oldImagePath });
          }
        }
        updateData.image = `/uploads/${req.file.filename}`;
      }

      const updatedMember = await db
        .update(team)
        .set(updateData)
        .where(eq(team.id, parseInt(id)))
        .returning();

      if (!updatedMember.length) {
        return res.status(404).json({ 
          message: "Membro del team non trovato",
          code: 'NOT_FOUND'
        });
      }

      res.json(updatedMember[0]);
    } catch (error) {
      logTeamError('Failed to update team member', error, {
        endpoint: '/api/team/:id',
        method: 'PUT'
      });

      res.status(500).json({ 
        message: "Errore nell'aggiornamento del membro del team",
        error: error instanceof Error ? error.message : "Unknown error",
        code: 'UPDATE_ERROR'
      });
    }
  });

  // Team API Routes
  app.get("/api/team", async (_req, res) => {
    try {
      const allTeamMembers = await db.select().from(team);
      res.json(allTeamMembers);
    } catch (error) {
      console.error('Database error while fetching team members:', error);
      res.status(500).json({ 
        message: "Error fetching team members",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/team", requireAuth, upload.single('image'), async (req, res) => {
    try {
      const { name, role, bio } = req.body;
      const socialLinks = JSON.parse(req.body.socialLinks || '[]');
      const imagePath = req.file ? `/uploads/${req.file.filename}` : '';
      
      const newMember = await db.insert(team).values({
        name,
        role,
        bio,
        image: imagePath,
        socialLinks
      }).returning();

      res.json(newMember[0]);
    } catch (error) {
      console.error('Error creating team member:', error);
      res.status(500).json({ 
        message: "Error creating team member",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.put("/api/team/:id", requireAuth, upload.single('image'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, role, bio } = req.body;
      const socialLinks = JSON.parse(req.body.socialLinks || '[]');
      
      const updateData: any = {
        name,
        role,
        bio,
        socialLinks,
        updatedAt: new Date()
      };

      if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
      }

      const updatedMember = await db
        .update(team)
        .set(updateData)
        .where(eq(team.id, parseInt(id)))
        .returning();

      if (!updatedMember.length) {
        return res.status(404).json({ message: "Team member not found" });
      }

      res.json(updatedMember[0]);
    } catch (error) {
      console.error('Error updating team member:', error);
      res.status(500).json({ 
        message: "Error updating team member",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  app.delete("/api/team/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      // Validate database connection
      try {
        await db.execute(sql`SELECT 1`);
      } catch (dbError) {
        logTeamError('Database connection check failed', dbError);
        return res.status(503).json({
          message: "Database service unavailable",
          code: 'DB_CONN_ERROR'
        });
      }

      // Get member details for image cleanup
      const memberToDelete = await db.select().from(team).where(eq(team.id, parseInt(id)));
      
      if (!memberToDelete.length) {
        return res.status(404).json({
          message: "Membro del team non trovato",
          code: 'NOT_FOUND'
        });
      }

      // Delete member from database using transaction
      const deleted = await db.transaction(async (tx) => {
        try {
          const deletedMember = await tx.delete(team)
            .where(eq(team.id, parseInt(id)))
            .returning();

          // Cleanup member's image if exists
          if (memberToDelete[0].image) {
            const imagePath = path.join(process.cwd(), 'public', memberToDelete[0].image);
            try {
              await fs.access(imagePath, constants.F_OK);
              await fs.unlink(imagePath);
              console.log(`[TeamAPI] Successfully deleted image: ${memberToDelete[0].image}`);
            } catch (error) {
              // Log error but don't fail the transaction if image cleanup fails
              logTeamError('Image cleanup failed', error, { 
                imagePath,
                memberId: id 
              });
            }
          }

          return deletedMember;
        } catch (txError) {
          logTeamError('Transaction failed', txError, { 
            operation: 'delete',
            memberId: id 
          });
          throw txError;
        }
      });

      if (!deleted.length) {
        throw new Error('Failed to delete team member');
      }

      res.json({
        message: "Membro del team eliminato con successo",
        code: 'SUCCESS',
        deletedMember: deleted[0]
      });

    } catch (error) {
      logTeamError('Failed to delete team member', error, {
        endpoint: '/api/team/:id',
        method: 'DELETE',
        params: { id: req.params.id }
      });

      if (error instanceof Error) {
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ 
          message: "Errore nell'eliminazione del membro del team",
          error: error.message,
          code: 'DB_DELETE_ERROR'
        });
      } else {
        res.status(500).json({ 
          message: "Si è verificato un errore imprevisto durante l'eliminazione",
          code: 'UNKNOWN_ERROR'
        });
      }
    }
  });

  // Projects API Routes
  app.get("/api/projects", async (_req, res) => {
    try {
      const allProjects = await db.select().from(projects);
      
      // Transform projects to handle null imageOrder
      const transformedProjects = allProjects.map(project => ({
        ...project,
        imageOrder: project.imageOrder || null,
      }));
      
      res.json(transformedProjects);
    } catch (error) {
      console.error('Database error while fetching projects:', error);
      
      // PostgreSQL specific error handling
      if (error && typeof error === 'object' && 'code' in error) {
        const pgError = error as { code: string; detail?: string; message: string };
        
        switch (pgError.code) {
          case '42703': // undefined_column
            res.status(500).json({
              message: "Database schema error",
              error: "Missing required column",
              detail: pgError.detail || pgError.message,
              code: 'SCHEMA_ERROR'
            });
            break;
          default:
            res.status(500).json({
              message: "Database error",
              error: pgError.message,
              code: 'DB_ERROR',
              detail: pgError.detail
            });
        }
      } else if (error instanceof Error) {
        res.status(500).json({ 
          message: "Error fetching projects",
          error: error.message,
          code: 'DB_FETCH_ERROR'
        });
      } else {
        res.status(500).json({ 
          message: "An unexpected error occurred",
          code: 'UNKNOWN_ERROR'
        });
      }
    }
  });

  app.post("/api/projects", requireAuth, upload.single('image'), async (req, res) => {
    try {
      const { title, description, category, year, location } = req.body;
      const imagePath = req.file ? `/uploads/${req.file.filename}` : '';
      
      const newProject = await db.insert(projects).values({
        title,
        description,
        category,
        image: imagePath,
        year: parseInt(year),
        location
      }).returning();

      res.json(newProject[0]);
    } catch (error) {
      res.status(500).json({ message: "Error creating project" });
    }
  });

  app.put("/api/projects/:id", requireAuth, upload.single('image'), async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, category, year, location } = req.body;
      const updateData: any = {
        title,
        description,
        category,
        year: parseInt(year),
        location
      };

      if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
      }

      const updatedProject = await db
        .update(projects)
        .set(updateData)
        .where(eq(projects.id, parseInt(id)))
        .returning();

      res.json(updatedProject[0]);
    } catch (error) {
      res.status(500).json({ message: "Error updating project" });
    }
  });

  // Services API Routes
  app.get("/api/services", async (_req, res) => {
    try {
      const allServices = await db.select().from(services);
      res.json(allServices);
    } catch (error) {
      res.status(500).json({ message: "Error fetching services" });
    }
  });

  app.post("/api/services", requireAuth, upload.single('image'), async (req, res) => {
    try {
      const { name, description, category, features } = req.body;
      const imagePath = req.file ? `/uploads/${req.file.filename}` : '';
      
      const newService = await db.insert(services).values({
        name,
        description,
        category,
        image: imagePath,
        features: JSON.parse(features || '[]')
      }).returning();

      res.json(newService[0]);
    } catch (error) {
      res.status(500).json({ message: "Error creating service" });
    }
  });

  app.put("/api/services/:id", requireAuth, upload.single('image'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, category, features } = req.body;
      const updateData: any = {
        name,
        description,
        category,
        features: JSON.parse(features || '[]')
      };

      if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
      }

      const updatedService = await db
        .update(services)
        .set(updateData)
        .where(eq(services.id, parseInt(id)))
        .returning();

      res.json(updatedService[0]);
    } catch (error) {
      res.status(500).json({ message: "Error updating service" });
    }
  });
  // Image ordering routes
  app.put("/api/projects/:id/image-order", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { imageOrder } = req.body as { imageOrder: { id: string; order: number }[] };
      
      if (!Array.isArray(imageOrder)) {
        return res.status(400).json({ message: "Invalid image order format" });
      }

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const updatedProject = await db
        .update(projects)
        .set({ imageOrder: imageOrder })
        .where(eq(projects.id, parseInt(id)))
        .returning();

      if (!updatedProject.length) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(updatedProject[0]);
    } catch (error) {
      res.status(500).json({ message: "Error updating image order" });
    }
  });

  app.put("/api/services/:id/image-order", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { imageOrder } = req.body as { imageOrder: { id: string; order: number }[] };
      
      if (!Array.isArray(imageOrder)) {
        return res.status(400).json({ message: "Invalid image order format" });
      }

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ message: "Invalid service ID" });
      }

      const updatedService = await db
        .update(services)
        .set({ imageOrder: imageOrder })
        .where(eq(services.id, parseInt(id)))
        .returning();

      if (!updatedService.length) {
        return res.status(404).json({ message: "Service not found" });
      }

      res.json(updatedService[0]);
    } catch (error) {
      res.status(500).json({ message: "Error updating image order" });
    }
  });

  // Content API Routes
  app.get("/api/content/about", async (_req, res) => {
    try {
      // Mock data structure matching the AboutContent interface
      const aboutContent = {
        storia: {
          title: "La Nostra Storia",
          content: "Da oltre vent'anni, DF Restauri è sinonimo di eccellenza nel mondo del restauro, delle pitture e delle decorazioni. Rappresenta la prosecuzione dell'attività nata nel 1992 in capo a De Faveri Luca. L'azienda ha saputo coniugare la maestria artigianale con le più moderne tecniche, offrendo soluzioni personalizzate per ogni esigenza dalle delicate operazioni di costruzione, ristrutturazione e restauro. DF è il partner ideale per chi desidera valorizzare i propri spazi con un tocco di esclusività. Grazie all'esperienza maturata nel corso degli anni, siamo in grado di garantire risultati impeccabili e duraturi, rispondendo alle richieste più esigenti del mercato dell'edilizia. Abbiamo saputo evolversi e adattarsi ai continui cambiamenti del mercato, mantenendo sempre al centro il cliente e la qualità dei lavori.",
          items: [
            "Qualità senza compromessi",
            "Innovazione sostenibile", 
            "Rispetto per la tradizione",
            "Attenzione al cliente"
          ]
        },
        valori: {
          title: "I Nostri Valori",
          content: "I nostri valori guidano ogni aspetto del nostro lavoro, dalla pianificazione all'esecuzione.",
          items: [
            "Eccellenza professionale",
            "Rispetto per la tradizione",
            "Innovazione tecnologica",
            "Sostenibilità ambientale"
          ]
        },
        mission: {
          title: "La Nostra Missione",
          content: "Preservare e valorizzare il patrimonio architettonico italiano attraverso interventi di restauro di alta qualità.",
          points: [
            "Utilizzare tecniche tradizionali e innovative",
            "Garantire la massima qualità in ogni progetto",
            "Formare continuamente il nostro team",
            "Rispettare l'ambiente e il territorio"
          ]
        },
        vision: {
          title: "La Nostra Visione",
          content: "Diventare un punto di riferimento nel settore del restauro architettonico, combinando tradizione e innovazione.",
          points: [
            "Espandere la nostra presenza nel territorio nazionale",
            "Investire in ricerca e sviluppo",
            "Promuovere la sostenibilità nel settore edile",
            "Valorizzare il patrimonio culturale italiano"
          ]
        }
      };

      res.json(aboutContent);
    } catch (error) {
      console.error('Error fetching about content:', error);
      res.status(500).json({ 
        message: "Si è verificato un errore durante il recupero dei contenuti",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Contact form route (preserved from original)
  app.post("/api/contact", (req, res) => {
    const { name, email, phone, message } = req.body;
    console.log("Contact form submission:", { name, email, phone, message });
    res.json({ success: true });
  });

  // Add this new login route
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({
          message: "Username e password sono obbligatori"
        });
      }

      // Find user in database
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          console.log(`Login attempt failed: user not found - ${username}`);
          return res.status(401).json({ 
            message: "Nome utente o password non validi" 
          });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          console.log(`Login attempt failed: invalid password for user - ${username}`);
          return res.status(401).json({ 
            message: "Nome utente o password non validi" 
          });
        }

        if (user.role !== 'admin') {
          console.log(`Login attempt failed: insufficient permissions - ${username}`);
          return res.status(403).json({
            message: "Accesso non autorizzato. Solo gli amministratori possono accedere."
          });
        }

        // Generate JWT token
        const token = jwt.sign(
          {
            id: user.id,
            username: user.username,
            role: user.role
          },
          process.env.JWT_SECRET!,
          { expiresIn: '1h' }
        );

        console.log(`Successful login for user: ${username}`);
        res.json({ token });
      } catch (dbError) {
        console.error('Database error during login:', dbError);
        throw new Error('Database error during user lookup');
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        message: "Si è verificato un errore durante l'accesso. Riprova più tardi." 
      });
    }
  });

  // Add refresh token route
  app.post("/api/auth/refresh", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const [userData] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      const token = jwt.sign(
        {
          id: userData.id,
          username: userData.username,
          role: userData.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      res.json({ token });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ message: 'Error refreshing token' });
    }
  });
}