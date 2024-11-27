import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

const FALLBACK_DIR = path.join(process.cwd(), 'server', 'public', 'images', 'fallback');

async function generateFallbackImages() {
  try {
    // Ensure fallback directory exists
    await fs.mkdir(FALLBACK_DIR, { recursive: true });

    // Generate profile fallback
    await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 4,
        background: { r: 238, g: 238, b: 238, alpha: 1 }
      }
    })
    .composite([{
      input: Buffer.from(
        `<svg width="400" height="400">
          <rect width="400" height="400" fill="#EEEEEE"/>
          <text x="200" y="200" font-family="Arial" font-size="24" fill="#666666" text-anchor="middle" dominant-baseline="middle">
            No Profile Image
          </text>
        </svg>`
      ),
      top: 0,
      left: 0,
    }])
    .jpeg()
    .toFile(path.join(FALLBACK_DIR, 'profile-fallback.jpg'));

    // Generate project fallback
    await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 4,
        background: { r: 238, g: 238, b: 238, alpha: 1 }
      }
    })
    .composite([{
      input: Buffer.from(
        `<svg width="800" height="600">
          <rect width="800" height="600" fill="#EEEEEE"/>
          <text x="400" y="300" font-family="Arial" font-size="30" fill="#666666" text-anchor="middle" dominant-baseline="middle">
            No Image Available
          </text>
        </svg>`
      ),
      top: 0,
      left: 0,
    }])
    .jpeg()
    .toFile(path.join(FALLBACK_DIR, 'project-fallback.jpg'));

    console.log('Fallback images generated successfully');
  } catch (error) {
    console.error('Error generating fallback images:', error);
    process.exit(1);
  }
}

generateFallbackImages();
