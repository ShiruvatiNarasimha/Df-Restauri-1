import express, { type Express, type Request, type Response, type NextFunction } from "express";
import path from "path";
import { sql } from "drizzle-orm";
import { convertToWebP, ensureCacheDirectory, isImagePath } from "./utils/imageProcessing";

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

export async function registerRoutes(app: Express) {
  // Middleware for parsing JSON bodies
  app.use(express.json());
  
  // Ensure cache directory exists
  await ensureCacheDirectory();
  
  // Add WebP middleware
  app.use(webpMiddleware);
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

  // Admin API routes - Team Members
  app.get("/api/team-members", async (_req, res) => {
    try {
      const { db } = await import("@db/index");
      const { teamMembers } = await import("@db/schema");
      const result = await db.select().from(teamMembers);
      res.json(result);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/team-members", async (req, res) => {
    try {
      const { db } = await import("@db/index");
      const { teamMembers, insertTeamMemberSchema } = await import("@db/schema");
      const validatedData = insertTeamMemberSchema.parse(req.body);
      const result = await db.insert(teamMembers).values(validatedData).returning();
      res.json(result[0]);
    } catch (error) {
      console.error("Error creating team member:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/team-members/:id", async (req, res) => {
    try {
      const { db } = await import("@db/index");
      const { teamMembers, insertTeamMemberSchema } = await import("@db/schema");
      const { id } = req.params;
      const validatedData = insertTeamMemberSchema.partial().parse(req.body);
      const result = await db
        .update(teamMembers)
        .set(validatedData)
        .where(sql`${teamMembers.id} = ${id}`)
        .returning();
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Projects API endpoints
  app.get("/api/projects", async (_req, res) => {
    try {
      const { db } = await import("@db/index");
      const { projects } = await import("@db/schema");
      const result = await db.select().from(projects);
      res.json(result);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const { db } = await import("@db/index");
      const { projects, insertProjectSchema } = await import("@db/schema");
      const validatedData = insertProjectSchema.parse(req.body);
      const result = await db.insert(projects).values(validatedData).returning();
      res.json(result[0]);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const { db } = await import("@db/index");
      const { projects, insertProjectSchema } = await import("@db/schema");
      const { id } = req.params;
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const result = await db
        .update(projects)
        .set(validatedData)
        .where(sql`${projects.id} = ${id}`)
        .returning();
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Service Images API endpoints
  app.get("/api/service-images", async (_req, res) => {
    try {
      const { db } = await import("@db/index");
      const { serviceImages } = await import("@db/schema");
      const result = await db.select().from(serviceImages);
      res.json(result);
    } catch (error) {
      console.error("Error fetching service images:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/service-images", async (req, res) => {
    try {
      const { db } = await import("@db/index");
      const { serviceImages, insertServiceImageSchema } = await import("@db/schema");
      const validatedData = insertServiceImageSchema.parse(req.body);
      const result = await db.insert(serviceImages).values(validatedData).returning();
      res.json(result[0]);
    } catch (error) {
      console.error("Error creating service image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/service-images/:id", async (req, res) => {
    try {
      const { db } = await import("@db/index");
      const { serviceImages, insertServiceImageSchema } = await import("@db/schema");
      const { id } = req.params;
      const validatedData = insertServiceImageSchema.partial().parse(req.body);
      const result = await db
        .update(serviceImages)
        .set(validatedData)
        .where(sql`${serviceImages.id} = ${id}`)
        .returning();
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating service image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete endpoints
  app.delete("/api/team-members/:id", async (req, res) => {
    try {
      const { db } = await import("@db/index");
      const { teamMembers } = await import("@db/schema");
      const { id } = req.params;
      const result = await db
        .delete(teamMembers)
        .where(sql`${teamMembers.id} = ${id}`)
        .returning();
      res.json(result[0]);
    } catch (error) {
      console.error("Error deleting team member:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const { db } = await import("@db/index");
      const { projects } = await import("@db/schema");
      const { id } = req.params;
      const result = await db
        .delete(projects)
        .where(sql`${projects.id} = ${id}`)
        .returning();
      res.json(result[0]);
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/service-images/:id", async (req, res) => {
    try {
      const { db } = await import("@db/index");
      const { serviceImages } = await import("@db/schema");
      const { id } = req.params;
      const result = await db
        .delete(serviceImages)
        .where(sql`${serviceImages.id} = ${id}`)
        .returning();
      res.json(result[0]);
    } catch (error) {
      console.error("Error deleting service image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
