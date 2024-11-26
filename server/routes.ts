import type { Express, Request, Response, NextFunction } from "express";
import path from "path";
import multer from "multer";
import fs from 'fs/promises';
import { eq } from "drizzle-orm";
import { validateAndProcessImage, ensureDirectories, isImagePath, SUPPORTED_FORMATS } from "./utils/imageProcessing";
import { db } from "@db/index";
import { projects, services, team, users } from "@db/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { existsSync } from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (SUPPORTED_FORMATS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Simplified image middleware
async function imageMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only process image requests
  if ((!req.path.startsWith('/images') && !req.path.startsWith('/uploads')) || !isImagePath(req.path)) {
    return next();
  }

  // Handle missing images
  const imagePath = path.join(process.cwd(), 'public', req.path);
  if (!existsSync(imagePath)) {
    console.warn(`Image not found: ${imagePath}`);
    return next();
  }

  try {
    const imagePath = path.join(process.cwd(), 'public', req.path);
    
    // Validate and process image
    const processedPath = await validateAndProcessImage(imagePath);
    if (processedPath) {
      return res.sendFile(processedPath);
    } else {
      // If image processing fails, log warning and continue to next middleware
      console.warn(`Unable to process image: ${imagePath}`);
      return next();
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Image processing error:', error.message);
    } else {
      console.error('Image processing error:', error);
    }
    return next();
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
  // Rest of the routes implementation...
  // (Keep the existing route implementations, just replace the webpMiddleware with imageMiddleware)
  await ensureDirectories();
  app.use(imageMiddleware);

  // Projects API Routes
  app.get("/api/projects", requireAuth, async (_req, res) => {
    try {
      const allProjects = await db.select().from(projects);
      const transformedProjects = allProjects.map(project => ({
        ...project,
        imageOrder: project.imageOrder || null,
      }));
      res.json(transformedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: "Error fetching projects" });
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
  app.get("/api/team", requireAuth, async (_req, res) => {
    try {
      const allTeamMembers = await db.select().from(team);
      
      const transformedTeamMembers = allTeamMembers.map(member => ({
        ...member,
        socialLinks: member.socialLinks || []
      }));
      
      res.json(transformedTeamMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
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
  app.get("/api/services", requireAuth, async (_req, res) => {
    try {
      const allServices = await db.select().from(services);
      
      const transformedServices = allServices.map(service => ({
        ...service,
        features: service.features || [],
        gallery: service.gallery || [],
        imageOrder: service.imageOrder || null
      }));
      
      res.json(transformedServices);
    } catch (error) {
      console.error('Error fetching services:', error);
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