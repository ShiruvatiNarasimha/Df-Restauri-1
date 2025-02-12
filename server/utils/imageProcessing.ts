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
    await fs.access(webpPath);
    return `/cache/${webpFilename}`;
  } catch {
    // Convert to WebP if it doesn't exist
    await sharp(imagePath)
      .webp({ quality: 80 })
      .toFile(webpPath);
    
    return `/cache/${webpFilename}`;
  }
}

export function isImagePath(filepath: string): boolean {
  const ext = path.extname(filepath).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
}
