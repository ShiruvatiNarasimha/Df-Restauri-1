import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { constants } from 'fs';

const CACHE_DIR = path.join(process.cwd(), 'public', 'cache');
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function ensureCacheDirectory() {
  try {
    // Ensure parent directories exist
    await fs.mkdir(path.dirname(CACHE_DIR), { recursive: true, mode: 0o755 });
    
    try {
      await fs.access(CACHE_DIR, constants.R_OK | constants.W_OK);
    } catch {
      // Create cache directory if it doesn't exist
      await fs.mkdir(CACHE_DIR, { recursive: true, mode: 0o755 });
    }
    
    // Always ensure proper permissions
    await fs.chmod(CACHE_DIR, 0o755);
    
    // Verify we can write to the directory
    const testFile = path.join(CACHE_DIR, '.write-test');
    await fs.writeFile(testFile, '');
    await fs.unlink(testFile);
    
  } catch (error) {
    console.error('Cache directory error:', {
      dir: CACHE_DIR,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to setup cache directory');
  }
}

export async function validateImage(imagePath: string): Promise<void> {
  try {
    const stats = await fs.stat(imagePath);
    
    if (stats.size > MAX_IMAGE_SIZE) {
      throw new Error(`Image size exceeds maximum allowed size of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
    }

    // Validate image format using sharp
    const metadata = await sharp(imagePath).metadata();
    if (!metadata.format || !ALLOWED_MIME_TYPES.includes(`image/${metadata.format}`)) {
      throw new Error('Invalid image format');
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Image validation failed: ${error.message}`);
    }
    throw new Error('Image validation failed');
  }
}

export async function convertToWebP(imagePath: string): Promise<string> {
  const ext = path.extname(imagePath);
  const basename = path.basename(imagePath, ext);
  const webpFilename = `${basename}.webp`;
  const webpPath = path.join(CACHE_DIR, webpFilename);

  try {
    // Validate the input image
    await validateImage(imagePath);

    // Check if WebP version already exists and is valid
    try {
      await fs.access(webpPath, constants.R_OK);
      const webpStats = await fs.stat(webpPath);
      if (webpStats.size > 0) {
        return `/cache/${webpFilename}`;
      }
    } catch {
      // WebP version doesn't exist or is invalid, proceed with conversion
    }

    // Convert to WebP
    await sharp(imagePath)
      .webp({ 
        quality: 80,
        effort: 4 // Balance between compression speed and quality
      })
      .toFile(webpPath);
    
    return `/cache/${webpFilename}`;
  } catch (error) {
    console.error('WebP conversion error:', {
      input: imagePath,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

export function isImagePath(filepath: string): boolean {
  const ext = path.extname(filepath).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
}

export function getMimeType(filepath: string): string {
  const ext = path.extname(filepath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
