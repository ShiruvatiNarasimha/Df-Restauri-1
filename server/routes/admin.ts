import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { db } from "../../db";
import { teamMembers, projects } from "@db/schema";
import { isAdmin } from "../middleware/adminAuth";
import { eq } from "drizzle-orm";

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error("Tipo di file non supportato"));
      return;
    }
    cb(null, true);
  },
});

// Helper function to process and save images
async function processAndSaveImage(
  buffer: Buffer,
  filename: string,
  width: number,
  height: number
) {
  const publicDir = path.join(process.cwd(), "public");
  const uploadsDir = path.join(publicDir, "uploads");

  // Ensure directories exist
  await fs.mkdir(uploadsDir, { recursive: true });

  const processedImage = await sharp(buffer)
    .resize(width, height, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();

  const finalFilename = `${filename}.webp`;
  const filePath = path.join(uploadsDir, finalFilename);
  await fs.writeFile(filePath, processedImage);

  return `/uploads/${finalFilename}`;
}

// Team Members Routes
router.get("/team-members", isAdmin, async (_req, res) => {
  try {
    const members = await db.select().from(teamMembers);
    res.json(members);
  } catch (error) {
    res.status(500).send("Errore nel recupero dei membri del team");
  }
});

router.post("/team-members", isAdmin, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("Immagine avatar richiesta");
    }

    const filename = `team-${Date.now()}`;
    const avatarUrl = await processAndSaveImage(req.file.buffer, filename, 300, 300);

    const [member] = await db
      .insert(teamMembers)
      .values({
        name: req.body.name,
        role: req.body.role,
        avatar: avatarUrl,
        socialFacebook: req.body.socialFacebook,
        socialTwitter: req.body.socialTwitter,
        socialInstagram: req.body.socialInstagram,
      })
      .returning();

    res.json(member);
  } catch (error) {
    res.status(500).send("Errore nella creazione del membro del team");
  }
});

// Projects Routes
router.get("/projects", isAdmin, async (_req, res) => {
  try {
    const allProjects = await db.select().from(projects);
    res.json(allProjects);
  } catch (error) {
    res.status(500).send("Errore nel recupero dei progetti");
  }
});

router.post("/projects", isAdmin, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("Immagine progetto richiesta");
    }

    const filename = `project-${Date.now()}`;
    const imageUrl = await processAndSaveImage(req.file.buffer, filename, 800, 600);

    const [project] = await db
      .insert(projects)
      .values({
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        image: imageUrl,
        year: parseInt(req.body.year),
        location: req.body.location,
      })
      .returning();

    res.json(project);
  } catch (error) {
    res.status(500).send("Errore nella creazione del progetto");
  }
});

export default router;
