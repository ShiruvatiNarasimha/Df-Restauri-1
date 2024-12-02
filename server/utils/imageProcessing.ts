import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

const CACHE_DIR = path.join(process.cwd(), 'public', 'cache');

export async function ensureCacheDirectory() {
  try {
    await fs.access(CACHE_DIR);
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  }
}

export async function convertToWebP(imagePath: string): Promise<string> {
  const ext = path.extname(imagePath);
  const basename = path.basename(imagePath, ext);
  const webpFilename = `${basename}.webp`;
  const webpPath = path.join(CACHE_DIR, webpFilename);

  try {
    // Check if WebP version already exists
    try {
      await fs.access(webpPath);
      return `/cache/${webpFilename}`;
    } catch {
      // Ensure source image exists
      await fs.access(imagePath);
      
      // Convert to WebP
      await sharp(imagePath)
        .webp({ quality: 80 })
        .toFile(webpPath);
      
      return `/cache/${webpFilename}`;
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to process image ${imagePath}: ${error.message}`);
    }
    throw new Error(`Failed to process image ${imagePath}: Unknown error`);
  }
}

export function isImagePath(filepath: string): boolean {
  const ext = path.extname(filepath).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
}
