import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

async function generatePlaceholder() {
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, width, height);

  // Add text
  ctx.fillStyle = '#6b7280';
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Placeholder Image', width/2, height/2);

  // Ensure directory exists
  const publicDir = path.join(process.cwd(), 'public', 'images');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Save the image
  const buffer = canvas.toBuffer('image/jpeg');
  fs.writeFileSync(path.join(publicDir, 'placeholder.jpg'), buffer);
  console.log('Placeholder image generated successfully');
}

generatePlaceholder().catch(console.error);
