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
): Promise<{ original: string; sizes: Record<string, string> }> {
  const { quality = 80, sizes = DEFAULT_SIZES } = options;
  const results: Record<string, string> = {};

  // Ensure the image exists
  try {
    await fs.access(imagePath);
  } catch {
    throw new Error(`Input file is missing: ${imagePath}`);
  }

  // Process each size
  for (const size of sizes) {
    const cacheKey = await generateCacheKey(imagePath, size);
    const outputPath = path.join(CACHE_DIR, cacheKey);

    try {
      // Check if optimized version exists
      await fs.access(outputPath);
    } catch {
      // Generate optimized version
      await sharp(imagePath)
        .resize(size.width, size.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality })
        .toFile(outputPath);
    }

    results[size.suffix] = `/cache/${cacheKey}`;
  }

  // Generate original size WebP version
  const originalCacheKey = await generateCacheKey(imagePath);
  const originalOutputPath = path.join(CACHE_DIR, originalCacheKey);

  try {
    await fs.access(originalOutputPath);
  } catch {
    await sharp(imagePath)
      .webp({ quality })
      .toFile(originalOutputPath);
  }

  return {
    original: `/cache/${originalCacheKey}`,
    sizes: results
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
