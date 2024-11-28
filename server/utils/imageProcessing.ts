import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { constants } from 'fs';

const CACHE_DIR = path.join(process.cwd(), 'public', 'cache');
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const FALLBACK_IMAGE = path.join(process.cwd(), 'public', 'images', 'fallback', 'image-fallback.jpg');

// Enhanced error logging function
function logError(context: string, error: unknown, additionalInfo: Record<string, unknown> = {}) {
  console.error(`[ImageProcessing] ${context}:`, {
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error,
    timestamp: new Date().toISOString(),
    ...additionalInfo
  });
}

export async function ensureCacheDirectory() {
  try {
    // Ensure parent directories exist with proper permissions
    await fs.mkdir(path.dirname(CACHE_DIR), { recursive: true, mode: 0o755 });
    
    // Check if cache directory exists and is accessible
    try {
      await fs.access(CACHE_DIR, constants.R_OK | constants.W_OK);
      const stats = await fs.stat(CACHE_DIR);
      
      if (!stats.isDirectory()) {
        logError('Cache directory validation', new Error('Path exists but is not a directory'), {
          path: CACHE_DIR,
          type: stats.isFile() ? 'file' : 'other'
        });
        throw new Error('Cache path exists but is not a directory');
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as any).code === 'ENOENT') {
        // Create cache directory if it doesn't exist
        await fs.mkdir(CACHE_DIR, { recursive: true, mode: 0o755 });
      } else {
        logError('Cache directory access', error, { path: CACHE_DIR });
        throw new Error('Failed to access cache directory');
      }
    }
    
    // Always ensure proper permissions
    try {
      await fs.chmod(CACHE_DIR, 0o755);
    } catch (error) {
      logError('Cache directory permissions', error, { path: CACHE_DIR });
      throw new Error('Failed to set cache directory permissions');
    }
    
    // Verify we can write to the directory
    const testFile = path.join(CACHE_DIR, '.write-test');
    try {
      await fs.writeFile(testFile, '');
      await fs.unlink(testFile);
    } catch (error) {
      logError('Cache directory write test', error, { testFile });
      throw new Error('Failed to write to cache directory');
    }
  } catch (error) {
    logError('Cache directory setup', error, { dir: CACHE_DIR });
    throw new Error('Failed to setup cache directory: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

export async function validateImage(imagePath: string): Promise<void> {
  try {
    // Check if file exists
    try {
      await fs.access(imagePath, constants.R_OK);
    } catch (error) {
      logError('Image file access', error, { path: imagePath });
      throw new Error(`Image file not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Check file size
    const stats = await fs.stat(imagePath);
    if (stats.size > MAX_IMAGE_SIZE) {
      const error = new Error(`Image size exceeds maximum allowed size of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
      logError('Image size validation', error, { 
        size: stats.size, 
        maxSize: MAX_IMAGE_SIZE,
        path: imagePath 
      });
      throw error;
    }

    // Validate image format using sharp
    try {
      const metadata = await sharp(imagePath).metadata();
      if (!metadata.format || !ALLOWED_MIME_TYPES.includes(`image/${metadata.format}`)) {
        const error = new Error(`Invalid image format: ${metadata.format || 'unknown'}`);
        logError('Image format validation', error, {
          format: metadata.format,
          allowedFormats: ALLOWED_MIME_TYPES,
          path: imagePath
        });
        throw error;
      }
    } catch (error) {
      logError('Sharp metadata extraction', error, { path: imagePath });
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    try {
      await validateImage(imagePath);
    } catch (error) {
      logError('Image validation', error, { path: imagePath });
      // Return fallback image if validation fails
      return FALLBACK_IMAGE;
    }

    // Check if WebP version already exists and is valid
    try {
      await fs.access(webpPath, constants.R_OK);
      const webpStats = await fs.stat(webpPath);
      if (webpStats.size > 0) {
        // Verify the cached WebP is valid
        try {
          await sharp(webpPath).metadata();
          return `/cache/${webpFilename}`;
        } catch (error) {
          logError('Cached WebP validation', error, { path: webpPath });
          // If cached file is corrupt, delete it and proceed with conversion
          await fs.unlink(webpPath).catch(e => logError('Cached WebP deletion', e));
        }
      }
    } catch (error) {
      // WebP version doesn't exist or is invalid, proceed with conversion
      if (error instanceof Error && 'code' in error && (error as any).code !== 'ENOENT') {
        logError('WebP cache access', error, { path: webpPath });
      }
    }

    // Convert to WebP with enhanced error handling
    try {
      await sharp(imagePath)
        .webp({ 
          quality: 80,
          effort: 4,
          lossless: false
        })
        .toFile(webpPath);
      
      // Verify the converted file
      const stats = await fs.stat(webpPath);
      if (stats.size === 0) {
        throw new Error('Generated WebP file is empty');
      }
      
      return `/cache/${webpFilename}`;
    } catch (error) {
      logError('WebP conversion', error, { 
        input: imagePath,
        output: webpPath
      });
      // Clean up failed conversion attempt
      await fs.unlink(webpPath).catch(e => logError('Failed conversion cleanup', e));
      // Return original image path as fallback
      return imagePath;
    }
  } catch (error) {
    logError('WebP conversion process', error, {
      input: imagePath,
      output: webpPath
    });
    // Return original image path as fallback
    return imagePath;
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
