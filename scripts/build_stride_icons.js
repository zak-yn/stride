import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const OUT_DIR = path.resolve('public/icons');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const SRC_IMAGE = 'C:/Users/wonsh/.gemini/antigravity-ide/brain/f3e077b5-d898-4fa9-b904-5e9734b5cd7c/stride_pure_icon_1790990781504.jpg';

async function generate() {
  console.log('Building high-resolution Stride production app icons...');

  // 1. Extract the center emblem from inside the dark region
  // In the 1024x1024 original, the dark card is roughly at (130, 130) to (894, 894)
  // Let's sample the background color around the edges of the card
  const bgSlate = { r: 13, g: 15, b: 20 }; // #0D0F14 deep obsidian

  // Extract the card content tightly
  const card = await sharp(SRC_IMAGE)
    .extract({ left: 140, top: 140, width: 744, height: 744 })
    .toBuffer();

  // Create a master 1024x1024 canvas filled with #0D0F14
  // Place the card scaled slightly down (e.g. 880x880) so it has ideal 15% breathing room for Android adaptive safe-zone
  const emblemResized = await sharp(card)
    .resize(880, 880, { fit: 'contain', background: bgSlate })
    .toBuffer();

  const master1024 = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 3,
      background: bgSlate
    }
  })
  .composite([
    {
      input: emblemResized,
      left: 72,
      top: 72
    }
  ])
  .png({ quality: 100, compressionLevel: 9 })
  .toBuffer();

  // 2. Generate icon-512.png
  await sharp(master1024)
    .resize(512, 512, { kernel: 'lanczos3' })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'icon-512.png'));
  console.log('✓ Created public/icons/icon-512.png (512x512)');

  // 3. Generate icon-192.png
  await sharp(master1024)
    .resize(192, 192, { kernel: 'lanczos3' })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'icon-192.png'));
  console.log('✓ Created public/icons/icon-192.png (192x192)');

  // 4. Generate apple-touch-icon.png (180x180)
  await sharp(master1024)
    .resize(180, 180, { kernel: 'lanczos3' })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'apple-touch-icon.png'));
  console.log('✓ Created public/icons/apple-touch-icon.png (180x180)');

  // 5. Generate maskable icon with extra padding (safe-zone friendly: inner circle diameter = 80%)
  const maskableEmblem = await sharp(card)
    .resize(720, 720, { fit: 'contain', background: bgSlate })
    .toBuffer();

  const maskableMaster = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 3,
      background: bgSlate
    }
  })
  .png()
  .composite([
    {
      input: maskableEmblem,
      left: 152,
      top: 152
    }
  ])
  .toBuffer();

  await sharp(maskableMaster)
    .resize(512, 512, { kernel: 'lanczos3' })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'icon-maskable-512.png'));
  console.log('✓ Created public/icons/icon-maskable-512.png (512x512 Maskable)');

  // 6. Generate favicon 32x32 & 16x16
  await sharp(master1024)
    .resize(32, 32, { kernel: 'lanczos3' })
    .png({ quality: 100 })
    .toFile(path.join(OUT_DIR, 'favicon-32x32.png'));
  console.log('✓ Created public/icons/favicon-32x32.png (32x32)');

  await sharp(master1024)
    .resize(16, 16, { kernel: 'lanczos3' })
    .png({ quality: 100 })
    .toFile(path.join(OUT_DIR, 'favicon-16x16.png'));
  console.log('✓ Created public/icons/favicon-16x16.png (16x16)');

  // Copy favicon to root public/favicon.ico / public/favicon.png
  await sharp(master1024)
    .resize(48, 48, { kernel: 'lanczos3' })
    .png({ quality: 100 })
    .toFile(path.resolve('public/favicon.ico'));
  console.log('✓ Created public/favicon.ico');

  // 7. Generate iOS and Android Home Screen Simulation Previews
  // iOS Squircle mask preview (22.5% corner radius)
  const squircleSvg = Buffer.from(
    `<svg width="512" height="512"><rect width="512" height="512" rx="115" fill="#fff"/></svg>`
  );
  await sharp(path.join(OUT_DIR, 'icon-512.png'))
    .composite([{ input: squircleSvg, blend: 'dest-in' }])
    .png()
    .toFile(path.join(OUT_DIR, 'preview_ios_homescreen.png'));
  console.log('✓ Created preview_ios_homescreen.png');

  // Android Adaptive Circle mask preview (circle diameter 80%)
  const circleSvg = Buffer.from(
    `<svg width="512" height="512"><circle cx="256" cy="256" r="230" fill="#fff"/></svg>`
  );
  await sharp(path.join(OUT_DIR, 'icon-maskable-512.png'))
    .composite([{ input: circleSvg, blend: 'dest-in' }])
    .png()
    .toFile(path.join(OUT_DIR, 'preview_android_homescreen.png'));
  console.log('✓ Created preview_android_homescreen.png');
}

generate().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
