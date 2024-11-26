import type { Express, Request, Response, NextFunction } from "express";
import path from "path";
import { convertToWebP, ensureCacheDirectory, isImagePath } from "./utils/imageProcessing";
import { setupAuth } from "./auth";
import adminRouter from "./routes/admin";

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

const DYNAMIC_CONTENT = {
  about: {
    storia: {
      title: "La Nostra Storia",
      content: "Da oltre vent'anni, DF Restauri è sinonimo di eccellenza nel mondo del restauro, delle pitture e delle decorazioni..."
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
      content: "Costruiamo il futuro, rispettando l'ambiente..."
    },
    vision: {
      title: "Vision",
      content: "Aspirare a diventare leader nel settore delle costruzioni sostenibili..."
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

export async function registerRoutes(app: Express) {
  // Ensure cache directory exists
  await ensureCacheDirectory();
  
  // Set up authentication
  setupAuth(app);
  
  // Add WebP middleware
  app.use(webpMiddleware);

  // Register admin routes
  app.use('/api/admin', adminRouter);

  // Content routes
  app.post("/api/contact", (req, res) => {
    const { name, email, phone, message } = req.body;
    console.log("Contact form submission:", { name, email, phone, message });
    res.json({ success: true });
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
