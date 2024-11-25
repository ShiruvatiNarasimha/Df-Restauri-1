import type { Express, Request, Response, NextFunction } from "express";
import path from "path";
import multer from "multer";
import { eq } from "drizzle-orm";
import { convertToWebP, ensureCacheDirectory, isImagePath } from "./utils/imageProcessing";
import { db } from "@db/index";
import { projects, services, team } from "@db/schema";

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
  if (!req.path.startsWith('/images') || !isImagePath(req.path)) {
    return next();
  }

  try {
    const imagePath = path.join(process.cwd(), 'public', req.path);
    const webpPath = await convertToWebP(imagePath);
    res.redirect(webpPath);
  } catch (error) {
    console.error('WebP conversion error:', error);
    next();
  }
}

// Authentication middleware
interface AuthenticatedRequest extends Request {
  session?: {
    user?: {
      role?: string;
    };
  };
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.session?.user?.role || req.session.user.role !== 'admin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
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
      res.json(allProjects);
    } catch (error) {
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

  // Contact form route (preserved from original)
  app.post("/api/contact", (req, res) => {
    const { name, email, phone, message } = req.body;
    console.log("Contact form submission:", { name, email, phone, message });
    res.json({ success: true });
  });
}
