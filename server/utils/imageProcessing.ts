import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

interface ImageSize {
  width: number;
  height?: number;
  suffix: string;
}

interface OptimizationOptions {
  quality?: number;
  sizes?: ImageSize[];
}

const CACHE_DIR = path.join(process.cwd(), 'public', 'cache');

// Predefined sizes for responsive images
const DEFAULT_SIZES: ImageSize[] = [
  { width: 320, suffix: 'sm' },
  { width: 640, suffix: 'md' },
  { width: 1024, suffix: 'lg' },
  { width: 1920, suffix: 'xl' }
];

const DEFAULT_OPTIONS: OptimizationOptions = {
  quality: 80,
  sizes: DEFAULT_SIZES
};

export async function ensureCacheDirectory() {
  try {
    await fs.access(CACHE_DIR);
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  }
}

async function generateCacheKey(imagePath: string, size?: ImageSize, format: string = 'webp'): Promise<string> {
  const ext = path.extname(imagePath);
  const basename = path.basename(imagePath, ext);
  const suffix = size ? `-${size.suffix}` : '';
  return `${basename}${suffix}.${format}`;
}

export async function optimizeImage(
  imagePath: string,
  options: OptimizationOptions = DEFAULT_OPTIONS
): Promise<{ original: string; sizes: Record<string, string>; metadata: sharp.Metadata }> {
  const { quality = 80, sizes = DEFAULT_SIZES } = options;
  const results: Record<string, string> = {};

  // Ensure the image exists
  try {
    await fs.access(imagePath);
  } catch {
    throw new Error(`Input file is missing: ${imagePath}`);
  }

  // Get original image metadata
  const imageMetadata = await sharp(imagePath).metadata();
  if (!imageMetadata.width || !imageMetadata.height) {
    throw new Error('Unable to read image dimensions');
  }

  // Process each size
  for (const size of sizes) {
    const cacheKey = await generateCacheKey(imagePath, size);
    const outputPath = path.join(CACHE_DIR, cacheKey);

    try {
      // Check if optimized version exists
      await fs.access(outputPath);
    } catch {
      // Calculate dimensions maintaining aspect ratio
      const aspectRatio = imageMetadata.width / imageMetadata.height;
      const resizeOptions = {
        width: size.width,
        height: size.height || Math.round(size.width / aspectRatio),
        fit: 'inside' as const,
        withoutEnlargement: true
      };

      // Generate optimized version
      await sharp(imagePath)
        .resize(resizeOptions)
        .webp({ 
          quality,
          effort: 6, // Higher compression effort
          lossless: false,
          nearLossless: false
        })
        .toFile(outputPath);
    }

    results[size.suffix] = `/cache/${cacheKey}`;
  }

  // Generate original size WebP version with optimization
  const originalCacheKey = await generateCacheKey(imagePath);
  const originalOutputPath = path.join(CACHE_DIR, originalCacheKey);

  try {
    await fs.access(originalOutputPath);
  } catch {
    await sharp(imagePath)
      .webp({ 
        quality,
        effort: 6,
        lossless: false,
        nearLossless: false
      })
      .toFile(originalOutputPath);
  }

  return {
    original: `/cache/${originalCacheKey}`,
    sizes: results,
    metadata: imageMetadata
  };
}

export async function convertToWebP(imagePath: string, quality: number = 80): Promise<string> {
  const cacheKey = await generateCacheKey(imagePath);
  const outputPath = path.join(CACHE_DIR, cacheKey);

  try {
    // Check if WebP version exists
    await fs.access(outputPath);
    return `/cache/${cacheKey}`;
  } catch {
    // Generate WebP version
    await sharp(imagePath)
      .webp({ quality })
      .toFile(outputPath);
    
    return `/cache/${cacheKey}`;
  }
}

export function isImagePath(filepath: string): boolean {
  const ext = path.extname(filepath).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
}
