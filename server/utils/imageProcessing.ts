import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const CACHE_DIR = path.join(process.cwd(), 'public', 'cache');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');
export const SUPPORTED_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'gif'];

export async function ensureDirectories() {
  const dirs = [
    CACHE_DIR,
    UPLOADS_DIR,
    IMAGES_DIR,
    path.join(IMAGES_DIR, 'chi-siamo'),
    path.join(IMAGES_DIR, 'projects'),
    path.join(IMAGES_DIR, 'services'),
    path.join(IMAGES_DIR, 'team')
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true, mode: 0o755 });
      console.log(`Directory created/verified: ${dir}`);
    } catch (error) {
      console.warn(`Warning: Could not create directory ${dir}:`, error);
      // Continue execution even if directory creation fails
    }
  }
}

export async function validateAndProcessImage(imagePath: string): Promise<string> {
  const placeholderPath = path.join(IMAGES_DIR, 'placeholder.jpg');
  
  // If image doesn't exist or is invalid, return placeholder
  if (!imagePath || !existsSync(imagePath)) {
    return placeholderPath;
  }

  try {
    const stats = await fs.stat(imagePath);
    if (!stats.isFile() || stats.size === 0) {
      return placeholderPath;
    }

    // Validate image with sharp
    try {
      await sharp(imagePath).metadata();
      return imagePath;
    } catch (error) {
      console.warn(`Invalid image format for ${imagePath}, using placeholder`);
      return placeholderPath;
    }
  } catch (error) {
    console.warn(`Error accessing file ${imagePath}, using placeholder`);
    return placeholderPath;
  }
}

export function isImagePath(filepath: string): boolean {
  if (!filepath) return false;
  const ext = path.extname(filepath).toLowerCase().slice(1);
  return SUPPORTED_FORMATS.includes(ext);
}

export async function processUploadedImage(file: Express.Multer.File): Promise<string | null> {
  if (!file) return null;

  try {
    const processedPath = await validateAndProcessImage(file.path);
    return processedPath ? `/uploads/${path.basename(file.path)}` : null;
  } catch (error) {
    console.error(`Error processing uploaded image ${file.originalname}:`, error);
    return null;
  }
}