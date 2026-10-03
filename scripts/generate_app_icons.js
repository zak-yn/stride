import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const OUT_DIR = path.resolve('public/icons');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Design 1: Obsidian Midnight Base with 3D Folded Gold Book-Stride 'S'
const svgDesignDark = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Canvas: Deep luxurious obsidian slate with subtle radial warmth -->
    <radialGradient id="bgGlow" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#1B1E28"/>
      <stop offset="60%" stop-color="#101217"/>
      <stop offset="100%" stop-color="#08090C"/>
    </radialGradient>

    <!-- Ambient Center Light behind Emblem -->
    <radialGradient id="centerAura" cx="50%" cy="50%" r="45%">
      <stop offset="0%" stop-color="#FFDE30" stop-opacity="0.18"/>
      <stop offset="50%" stop-color="#F59E0B" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <!-- Top Wing: Electric Luminous Yellow Gradient -->
    <linearGradient id="goldTop" x1="10%" y1="10%" x2="90%" y2="90%">
      <stop offset="0%" stop-color="#FFF580"/>
      <stop offset="35%" stop-color="#FFDE30"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>

    <!-- Bottom Wing: Deep Rich Amber Gold Gradient -->
    <linearGradient id="goldBottom" x1="10%" y1="10%" x2="90%" y2="90%">
      <stop offset="0%" stop-color="#FFCA1A"/>
      <stop offset="60%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>

    <!-- Center Fold Overlap Shading -->
    <linearGradient id="foldShade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#B45309" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#B45309" stop-opacity="0"/>
    </linearGradient>

    <!-- Subtle Hairline Ring for Edge Definition -->
    <linearGradient id="rimStroke" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.02"/>
    </linearGradient>

    <!-- High-End Multi-Layer Drop Shadow -->
    <filter id="premiumShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#000000" flood-opacity="0.75"/>
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#F59E0B" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Full Bleed Square Background (Android Maskable Safe) -->
  <rect width="1024" height="1024" fill="url(#bgGlow)"/>

  <!-- Subtle Inset Hairline Guide (Inside Safe Zone) -->
  <rect x="40" y="40" width="944" height="944" rx="200" fill="none" stroke="url(#rimStroke)" stroke-width="3"/>

  <!-- Radial Glow Behind Emblem -->
  <circle cx="512" cy="512" r="380" fill="url(#centerAura)"/>

  <!-- Main Stride Emblem: Clean, Architectural Monogram uniting Open Book + Dynamic Stride 'S' -->
  <g filter="url(#premiumShadow)">
    
    <!-- Top Arc / Upper Loop (Descending and curling inwards like a turning book page) -->
    <!-- Path geometry: Starts top-right, sweeps around top-left, curves down to center spine -->
    <path d="M 680 340 
             C 680 230, 580 180, 480 180 
             C 360 180, 270 260, 270 380 
             C 270 480, 360 530, 480 570 
             L 570 600 
             C 610 615, 650 640, 650 690 
             C 650 750, 590 800, 490 800 
             C 410 800, 340 760, 320 690" 
          fill="none" 
          stroke="url(#goldTop)" 
          stroke-width="116" 
          stroke-linecap="round" 
          stroke-linejoin="round"/>

    <!-- Inner Book Page Wing Layer (Creates the 3D 'book unfolding' effect) -->
    <path d="M 440 270 
             C 490 250, 540 255, 580 285 
             C 620 315, 615 370, 560 405 
             L 490 445" 
          fill="none" 
          stroke="#FFFDF0" 
          stroke-width="26" 
          stroke-linecap="round" 
          opacity="0.85"/>

    <!-- Left Book Spine / Bookmark Accent (Dynamic Chevron pointing Upward-Right = Progress/Stride) -->
    <path d="M 230 460 L 320 390 L 320 530 Z" 
          fill="url(#goldTop)" 
          opacity="0.95"/>

    <!-- Audio / Progress Momentum Dots (3 ascendants symbolizing microlearning stages) -->
    <circle cx="730" cy="340" r="28" fill="#FFF580"/>
    <circle cx="790" cy="270" r="18" fill="#FFDE30"/>
    <circle cx="830" cy="210" r="11" fill="#F59E0B"/>
  </g>
</svg>
`;

async function build() {
  console.log('Rendering high-res icon assets...');
  
  // Render master 1024x1024 SVG
  const masterBuffer = Buffer.from(svgDesignDark);
  
  // Generate icon-512.png
  await sharp(masterBuffer)
    .resize(512, 512, { kernel: 'lanczos3' })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'icon-512.png'));
  console.log('✓ Created public/icons/icon-512.png (512x512)');

  // Generate icon-192.png
  await sharp(masterBuffer)
    .resize(192, 192, { kernel: 'lanczos3' })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'icon-192.png'));
  console.log('✓ Created public/icons/icon-192.png (192x192)');

  // Generate apple-touch-icon.png (180x180)
  await sharp(masterBuffer)
    .resize(180, 180, { kernel: 'lanczos3' })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'apple-touch-icon.png'));
  console.log('✓ Created public/icons/apple-touch-icon.png (180x180)');

  // Generate favicon-32x32.png
  await sharp(masterBuffer)
    .resize(32, 32, { kernel: 'lanczos3' })
    .png({ quality: 100 })
    .toFile(path.join(OUT_DIR, 'favicon-32x32.png'));
  console.log('✓ Created public/icons/favicon-32x32.png (32x32)');

  // Also write SVG directly
  fs.writeFileSync(path.join(OUT_DIR, 'icon.svg'), svgDesignDark, 'utf8');
  console.log('✓ Created public/icons/icon.svg');
}

build().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
