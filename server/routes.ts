import type { Express, Request, Response, NextFunction } from "express";
import path from "path";
import multer from "multer";
import { eq } from "drizzle-orm";
import { convertToWebP, ensureCacheDirectory, isImagePath, getMimeType } from "./utils/imageProcessing";
import { constants } from 'fs';
import * as fs from 'fs/promises';

import { db } from "@db/index";
import { projects, services, team, users } from "@db/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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
    const fallbackPath = path.join(FALLBACK_DIR, 'image-fallback.jpg'); // Updated fallback path

    // Check if original image exists
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
      // If cache directory fails, serve original image
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
      // Serve original image if WebP is not supported
      res.setHeader('Content-Type', mimeType);
      res.setHeader('X-WebP-Support', 'false');
      return res.sendFile(imagePath);
    }

    // Try WebP conversion
    try {
      const webpPath = await convertToWebP(imagePath);
      if (webpPath === imagePath) {
        // Conversion failed and returned original path
        res.setHeader('Content-Type', mimeType);
        res.setHeader('X-WebP-Conversion', 'failed');
        return res.sendFile(imagePath);
      }
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('X-WebP-Conversion', 'success');
      return res.sendFile(path.join(process.cwd(), 'public', webpPath));
    } catch (conversionError) {
      logMiddlewareError('WebP conversion', conversionError, { imagePath });
      
      // Fallback to original image if conversion fails
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

  // Content API Routes
  app.get("/api/content/about", async (req, res) => {
    const requestId = req.headers['x-request-id'] as string || Date.now().toString(36) + Math.random().toString(36).substr(2);
    const retryCount = parseInt(req.headers['x-retry-count'] as string || '0');
    const startTime = Date.now();
    
    const logRequest = (level: string, message: string, extra: Record<string, any> = {}) => {
      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        requestId,
        path: '/api/content/about',
        clientIP: req.ip,
        userAgent: req.headers['user-agent'],
        message,
        duration,
        ...extra
      }));
    };

    try {
      logRequest('info', 'Fetching about content');
      
      // Enhanced logging with request context
      const requestContext = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        requestId,
        retryCount,
        clientInfo: {
          ip: req.ip,
          userAgent: req.headers['user-agent']
        },
        performance: {
          startTime: Date.now()
        }
      };
      
      logRequest('debug', 'Request context', requestContext);
      
      // Implement retry mechanism with exponential backoff
      const maxRetries = 3;
      const baseDelay = 1000; // 1 second
      let currentTry = 0;
      let lastError: Error | null = null;

      while (currentTry < maxRetries) {
        try {
          if (currentTry > 0) {
            const delay = baseDelay * Math.pow(2, currentTry - 1);
            logRequest('info', `Retry attempt ${currentTry + 1}, waiting ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          // In development, use a consistent delay for testing
          if (process.env.NODE_ENV === 'development') {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          const aboutContent = {
            storia: {
              title: "La Nostra Storia",
              content: "Da oltre vent'anni, DF Restauri è sinonimo di eccellenza nel mondo del restauro, delle pitture e delle decorazioni. Rappresenta la prosecuzione dell’attività nata nel 1992 in capo a De Faveri Luca. L'azienda ha saputo coniugare la maestria artigianale con le più moderne tecniche, offrendo soluzioni personalizzate per ogni esigenza dalle delicate operazioni di costruzione, ristrutturazione e restauro. DF è il partner ideale per chi desidera valorizzare i propri spazi con un tocco di esclusività. Grazie all'esperienza maturata nel corso degli anni, siamo in grado di garantire risultati impeccabili e duraturi, rispondendo alle richieste più esigenti del mercato dell'edilizia. Abbiamo saputo evolversi e adattarsi ai continui cambiamenti del mercato, mantenendo sempre al centro il cliente e la qualità dei lavori.",
              items: [
                "Tradizione dal 1992",
                "Eccellenza artigianale",
                "Innovazione continua",
                "Risultati garantiti"
              ],
              
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

          // Add response metadata
          const response = {
            data: aboutContent,
            meta: {
              requestId,
              timestamp: new Date().toISOString(),
              version: '1.0',
              cache: process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled'
            }
          };

          // Cache control headers
          const maxAge = process.env.NODE_ENV === 'production' ? 300 : 0;
          res.set('Cache-Control', `public, max-age=${maxAge}`);

          logRequest('info', 'Successfully fetched about content', {
            sections: Object.keys(aboutContent),
            cacheStatus: response.meta.cache
          });

          return res.json(response);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error occurred');
          logRequest('error', `Attempt ${currentTry + 1} failed`, {
            error: {
              name: lastError.name,
              message: lastError.message,
              stack: lastError.stack
            },
            retryCount: currentTry
          });
          
          currentTry++;
          if (currentTry === maxRetries) {
            throw lastError;
          }
        }
      }
    } catch (error) {
      const errorResponse = {
        status: 'error',
        requestId,
        timestamp: new Date().toISOString(),
        retries: retryCount,
        totalTime: Date.now() - startTime
      };

      logRequest('error', 'Error fetching about content', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });

      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          return res.status(404).json({
            ...errorResponse,
            message: "Contenuto non trovato",
            code: 'CONTENT_NOT_FOUND',
            suggestion: "Verifica che il contenuto sia stato pubblicato correttamente"
          });
        }
      }

      return res.status(500).json({
        ...errorResponse,
        message: "Si è verificato un errore durante il recupero dei contenuti",
        code: 'INTERNAL_SERVER_ERROR',
        suggestion: "Riprova tra qualche minuto. Se il problema persiste, contatta il supporto tecnico"
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