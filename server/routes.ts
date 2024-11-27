import type { Express, Request, Response, NextFunction } from "express";
import path from "path";
import multer from "multer";
import { eq } from "drizzle-orm";
import { convertToWebP, ensureCacheDirectory, isImagePath, getMimeType } from "./utils/imageProcessing";
import { db } from "@db/index";
import { projects, services, team, users } from "@db/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as fs from 'fs/promises';

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

  try {
    const imagePath = path.join(process.cwd(), 'public', req.path);
    const fallbackPath = path.join(process.cwd(), 'public', 'images', 'fallback', 'image-fallback.jpg');
    
    // Check if original image exists
    try {
      await fs.access(imagePath);
    } catch (error) {
      console.error('Image access error:', {
        path: imagePath,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: error instanceof Error && 'code' in error ? (error as any).code : undefined
      });

      // Try to serve fallback image
      try {
        await fs.access(fallbackPath);
        res.setHeader('Content-Type', getMimeType(fallbackPath));
        return res.sendFile(fallbackPath);
      } catch (fallbackError) {
        console.error('Fallback image not found:', fallbackError);
        return res.status(404).json({ error: 'Image not found' });
      }
    }

    // Ensure cache directory exists with proper permissions
    try {
      await ensureCacheDirectory();
    } catch (error) {
      console.error('Cache directory error:', error);
      // If cache directory fails, serve original image
      res.setHeader('Content-Type', getMimeType(imagePath));
      return res.sendFile(imagePath);
    }

    // Check if browser supports WebP
    const acceptHeader = req.headers.accept || '';
    const supportsWebP = acceptHeader.includes('image/webp');

    if (!supportsWebP) {
      // Serve original image if WebP is not supported
      res.setHeader('Content-Type', getMimeType(imagePath));
      return res.sendFile(imagePath);
    }

    // Try WebP conversion
    try {
      const webpPath = await convertToWebP(imagePath);
      res.setHeader('Content-Type', 'image/webp');
      return res.redirect(webpPath);
    } catch (conversionError) {
      console.error('WebP conversion failed:', {
        path: imagePath,
        error: conversionError instanceof Error ? conversionError.message : 'Unknown error',
        stack: conversionError instanceof Error ? conversionError.stack : undefined
      });
      
      // Fallback to original image if conversion fails
      console.log(`Falling back to original image: ${req.path}`);
      res.setHeader('Content-Type', getMimeType(imagePath));
      return res.sendFile(imagePath);
    }
  } catch (error) {
    console.error('WebP middleware error:', {
      path: req.path,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
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

export async function registerRoutes(app: Express) {
  // Ensure cache directory exists
  await ensureCacheDirectory();
  
  // Add WebP middleware
  app.use(webpMiddleware);

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

  // Team API Routes
  app.get("/api/team", async (_req, res) => {
    try {
      const allTeamMembers = await db.select().from(team);
      res.json(allTeamMembers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching team members" });
    }
  });

  app.post("/api/team", requireAuth, upload.single('image'), async (req, res) => {
    try {
      const { name, role, bio, socialLinks } = req.body;
      const imagePath = req.file ? `/uploads/${req.file.filename}` : '';
      
      const newMember = await db.insert(team).values({
        name,
        role,
        bio,
        image: imagePath,
        socialLinks: JSON.parse(socialLinks || '[]')
      }).returning();

      res.json(newMember[0]);
    } catch (error) {
      res.status(500).json({ message: "Error creating team member" });
    }
  });

  app.put("/api/team/:id", requireAuth, upload.single('image'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, role, bio, socialLinks } = req.body;
      const updateData: any = {
        name,
        role,
        bio,
        socialLinks: JSON.parse(socialLinks || '[]')
      };

      if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
      }

      const updatedMember = await db
        .update(team)
        .set(updateData)
        .where(eq(team.id, parseInt(id)))
        .returning();

      res.json(updatedMember[0]);
    } catch (error) {
      res.status(500).json({ message: "Error updating team member" });
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
