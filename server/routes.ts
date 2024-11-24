import type { Express, Request, Response, NextFunction } from "express";
import path from "path";
import { convertToWebP, ensureCacheDirectory, isImagePath, optimizeImage } from "./utils/imageProcessing";
import { db } from "../db";
import { projects, caseHistories } from "../db/schema";
import { setupAuth } from "./auth";
import { eq } from "drizzle-orm";

// Authentication middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Non autenticato" });
}

// Admin middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ error: "Accesso non autorizzato" });
}
// Middleware to handle image optimization
async function imageOptimizationMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith('/images') || !isImagePath(req.path)) {
    return next();
  }

  try {
    const imagePath = path.join(process.cwd(), 'public', req.path);
    const size = req.query.size as string;
    
    if (size && ['sm', 'md', 'lg', 'xl'].includes(size)) {
      // If size is specified, return optimized version
      const optimized = await optimizeImage(imagePath);
      if (optimized.sizes[size]) {
        return res.redirect(optimized.sizes[size]);
      }
    }
    
    // Default to WebP conversion if no size specified
    const webpPath = await convertToWebP(imagePath);
    res.redirect(webpPath);
  } catch (error) {
    console.error('Image optimization error:', error);
    next();
  }
}

// Admin middleware
function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(401).send("Non autorizzato");
}

const DYNAMIC_CONTENT = {
  about: {
    storia: {
      title: "La Nostra Storia",
      content: "Da oltre vent'anni, DF Restauri è sinonimo di eccellenza nel mondo del restauro, delle pitture e delle decorazioni. Rappresenta la prosecuzione dell'attività nata nel 1992 in capo a De Faveri Luca. L'azienda ha saputo coniugare la maestria artigianale con le più moderne tecniche, offrendo soluzioni personalizzate per ogni esigenza dalle delicate operazioni di costruzione, ristrutturazione e restauro. DF è il partner ideale per chi desidera valorizzare i propri spazi con un tocco di esclusività. Grazie all'esperienza maturata nel corso degli anni, siamo in grado di garantire risultati impeccabili e duraturi, rispondendo alle richieste più esigenti del mercato dell'edilizia. Abbiamo saputo evolversi e adattarsi ai continui cambiamenti del mercato, mantenendo sempre al centro il cliente e la qualità dei lavori."
    },
    valori: {
      title: "Valori Aziendali",
      content: "Definizione dei principi e dei valori che guidano l'operato dell'azienda",
      items: [
        "Qualità senza compromessi",
        "Innovazione sostenibile",
        "Rispetto per la tradizione",
        "Attenzione al cliente"
      ]
    },
    mission: {
      title: "Mission",
      content: "Costruiamo il futuro, rispettando l'ambiente. Il nostro approccio all'edilizia è orientato alla sostenibilità e all'innovazione. Utilizziamo materiali eco-compatibili e tecnologie all'avanguardia per realizzare edifici efficienti dal punto di vista energetico e a basso impatto ambientale. Grazie ad una progettazione attenta e a una gestione efficiente delle risorse, siamo in grado di offrire soluzioni personalizzate e durature nel tempo."
    },
    vision: {
      title: "Vision",
      content: "Aspirare a diventare leader nel settore delle costruzioni sostenibili, creando un futuro dove l'eccellenza costruttiva si fonde con il rispetto per l'ambiente. Vogliamo essere riconosciuti come pionieri nell'innovazione edilizia sostenibile, mantenendo sempre vivo il legame con la tradizione e l'artigianato di qualità."
    }
  },
  case_studies: [
    {
      id: 1,
      title: "Restauro Palazzo Storico",
      description: "Recupero e valorizzazione di un edificio del XVIII secolo",
      image: "/images/case-studies/palazzo.jpg"
    },
    {
      id: 2,
      title: "Edificio Sostenibile",
      description: "Progetto di costruzione eco-compatibile",
      image: "/images/case-studies/eco.jpg"
    }
  ]
};

import multer from 'multer';
import fs from 'fs/promises';

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const dir = path.join('public/images', path.dirname(file.originalname));
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, path.basename(file.originalname));
  }
});

const upload = multer({ storage });
export async function registerRoutes(app: Express) {
  // Ensure cache directory exists
  await ensureCacheDirectory();

  // Admin project management endpoints
  app.get("/api/admin/projects", isAdmin, async (_req, res) => {
    try {
      const projectsList = await db.select().from(projects);
      res.json(projectsList);
    } catch (error) {
      res.status(500).json({ error: "Errore nel recupero dei progetti" });
    }
  });

  app.get("/api/admin/case-histories", isAdmin, async (_req, res) => {
    try {
      const historiesList = await db.select().from(caseHistories);
      res.json(historiesList);
    } catch (error) {
      res.status(500).json({ error: "Errore nel recupero delle case histories" });
    }
  });

  app.put("/api/admin/projects/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [updated] = await db
        .update(projects)
        .set({
          ...req.body,
          updatedAt: new Date()
        })
        .where(eq(projects.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Progetto non trovato" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Errore nell'aggiornamento del progetto" });
    }
  });
  
  // Setup authentication
  setupAuth(app);
  
  // Add image optimization middleware
  app.use(imageOptimizationMiddleware);
  
  // Endpoint for bulk image optimization
  app.post('/api/optimize-images', requireAdmin, async (req, res) => {
    try {
      const { paths } = req.body;
      if (!Array.isArray(paths)) {
        return res.status(400).json({ error: 'Invalid input. Expected array of image paths.' });
      }

      const results = await Promise.all(
        paths.map(async (imagePath) => {
          const fullPath = path.join(process.cwd(), 'public', imagePath);
          try {
            const optimized = await optimizeImage(fullPath);
            return {
              original: imagePath,
              optimized
            };
          } catch (error) {
            console.error(`Error optimizing ${imagePath}:`, error);
            return {
              original: imagePath,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })
      );

      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: 'Error processing images' });
    }
  });

  // Admin routes for managing Realizzazioni
  app.get("/api/admin/projects", isAdmin, async (_req, res) => {
    try {
      const allProjects = await db.select().from(projects);
      res.json(allProjects);
    } catch (error) {
      res.status(500).json({ error: "Errore nel recupero dei progetti" });
    }
  });

  app.post("/api/admin/projects", requireAdmin, async (req, res) => {
    try {
      const [project] = await db.insert(projects).values(req.body).returning();
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Errore nella creazione del progetto" });
    }
  });

  app.put("/api/admin/projects/:id", isAdmin, async (req, res) => {
    try {
      const [updated] = await db
        .update(projects)
        .set(req.body)
        .where(eq(projects.id, parseInt(req.params.id)))
        .returning();
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Errore nell'aggiornamento del progetto" });
    }
  });

  app.get("/api/admin/case-histories", isAdmin, async (_req, res) => {
    try {
      const allHistories = await db.select().from(caseHistories);
      res.json(allHistories);
    } catch (error) {
      res.status(500).json({ error: "Errore nel recupero delle case histories" });
    }
  });

  app.post("/api/admin/case-histories", requireAdmin, async (req, res) => {
    try {
      const [history] = await db.insert(caseHistories).values(req.body).returning();
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Errore nella creazione della case history" });
    }
  });

  app.put("/api/admin/case-histories/:id", requireAdmin, async (req, res) => {
    try {
      const [updated] = await db
        .update(caseHistories)
        .set(req.body)
        .where(eq(caseHistories.id, parseInt(req.params.id)))
        .returning();
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Errore nell'aggiornamento della case history" });
    }
  });
  app.post("/api/contact", (req, res) => {
    const { name, email, phone, message } = req.body;
    console.log("Contact form submission:", { name, email, phone, message });
    res.json({ success: true });
  });

  // Bulk image upload endpoint
  app.post('/api/upload-images', upload.array('images', 10), async (req, res) => {
    // Set proper content type header
    res.setHeader('Content-Type', 'application/json');

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false,
        totalFiles: 0,
        successfulFiles: 0,
        failedFiles: 0,
        files: [],
        errors: [{ name: 'upload', error: 'No files uploaded' }]
      });
    }

    try {
      const files = req.files as Express.Multer.File[];
      
      // Validate file types and sizes
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      
      const invalidFiles = files.filter(file => 
        !allowedTypes.includes(file.mimetype) || file.size > maxSize
      );
      
      if (invalidFiles.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid files detected',
          code: 'INVALID_FILES',
          details: invalidFiles.map(file => ({
            name: file.originalname,
            reason: !allowedTypes.includes(file.mimetype) ? 'Invalid file type' : 'File too large',
            type: file.mimetype,
            size: file.size
          }))
        });
      }

      // Process and optimize images
      const results = await Promise.all(files.map(async file => {
        try {
          const relativePath = file.path.replace('public/', '/');
          const optimized = await optimizeImage(file.path);
          
          // Validate metadata fields
          if (!optimized.metadata.width || !optimized.metadata.height || !optimized.metadata.format) {
            throw new Error(`Invalid metadata for ${file.originalname}: missing required fields`);
          }

          // Format response according to expected structure
          return {
            name: file.originalname,
            originalPath: relativePath,
            optimizedPath: optimized.original,
            responsiveSizes: optimized.sizes,
            metadata: {
              width: optimized.metadata.width,
              height: optimized.metadata.height,
              format: optimized.metadata.format,
              size: optimized.originalSize
            }
          };
        } catch (err) {
          console.error(`Error processing ${file.originalname}:`, err);
          return {
            name: file.originalname,
            error: err instanceof Error ? err.message : 'Failed to process image',
            failed: true
          };
        }
      }));

      const failedUploads = results.filter(result => 'failed' in result);
      const successfulUploads = results.filter(result => !('failed' in result));

      const response = {
        success: failedUploads.length === 0,
        files: successfulUploads.map(file => ({
          name: file.name,
          originalPath: file.originalPath,
          optimizedPath: file.optimizedPath,
          responsiveSizes: file.responsiveSizes,
          metadata: file.metadata
        })),
        totalFiles: files.length,
        successfulFiles: successfulUploads.length,
        failedFiles: failedUploads.length,
        errors: failedUploads.length > 0 ? failedUploads.map(file => ({
          name: file.name,
          error: file.error
        })) : undefined
      };

      res.json(response);
    } catch (error) {
      const uploadedFiles = Array.isArray(req.files) ? req.files : [];
      console.error('Upload error:', error);
      res.status(500).json({ 
        success: false,
        totalFiles: uploadedFiles.length,
        successfulFiles: 0,
        failedFiles: uploadedFiles.length,
        files: [],
        errors: [{
          name: 'system',
          error: error instanceof Error ? error.message : 'Unknown error occurred during processing'
        }]
      });
    }
  });
    app.get("/api/content/:section", (req, res) => {
    const { section } = req.params;
    const content = DYNAMIC_CONTENT[section as keyof typeof DYNAMIC_CONTENT];
    
    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }
    
    res.json(content);
  });

  app.get("/api/case-studies", (_req, res) => {
    res.json(DYNAMIC_CONTENT.case_studies);
  });
}
