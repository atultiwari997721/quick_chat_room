const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="50%" stop-color="#ec4899" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <linearGradient id="bubbleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f8fafc" />
    </linearGradient>
    <linearGradient id="boltGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="55%" stop-color="#ec4899" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="dropShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#1e1b4b" flood-opacity="0.35" />
    </filter>
    <filter id="boltShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#4f46e5" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Background rounded squircle with signature gradient -->
  <rect width="512" height="512" rx="120" fill="url(#bgGradient)" />

  <!-- Subtle glow inner border -->
  <rect x="8" y="8" width="496" height="496" rx="114" fill="none" stroke="#ffffff" stroke-width="4" stroke-opacity="0.3" />

  <!-- Secondary decorative chat bubble behind -->
  <path d="M140 190 C140 135 185 90 240 90 L340 90 C395 90 440 135 440 190 C440 245 395 290 340 290 L330 290 L360 330 C365 336 360 345 352 342 L295 320 L240 320 C185 320 140 275 140 190 Z"
        fill="#ffffff" fill-opacity="0.22" />

  <!-- Main Chat Bubble with Drop Shadow -->
  <g filter="url(#dropShadow)">
    <path d="M96 240 C96 170 152 114 222 114 L306 114 C376 114 432 170 432 240 C432 310 376 366 306 366 L230 366 L158 418 C146 426 130 418 130 404 L130 364 C110 344 96 305 96 240 Z"
          fill="url(#bubbleGradient)" />
  </g>

  <!-- Dynamic Lightning Bolt (representing 'Quick') -->
  <g filter="url(#boltShadow)">
    <path d="M278 152 L188 274 C184 280 188 288 196 288 L252 288 L232 356 C229 366 242 372 248 364 L338 244 C342 238 338 230 330 230 L274 230 L294 160 C297 150 284 144 278 152 Z"
          fill="url(#boltGradient)" />
  </g>

  <!-- Sparkle dots for instant messaging vibe -->
  <circle cx="360" cy="170" r="8" fill="#ffffff" fill-opacity="0.85" />
  <circle cx="140" cy="150" r="6" fill="#ffffff" fill-opacity="0.65" />
  <circle cx="384" cy="290" r="5" fill="#ffffff" fill-opacity="0.75" />
</svg>`;

const maskableSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradientM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="50%" stop-color="#ec4899" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <linearGradient id="bubbleGradientM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f8fafc" />
    </linearGradient>
    <linearGradient id="boltGradientM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="55%" stop-color="#ec4899" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="dropShadowM" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#1e1b4b" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Full bleed background for Android adaptive/maskable icons -->
  <rect width="512" height="512" fill="url(#bgGradientM)" />

  <!-- Inner elements scaled into maskable safe zone (80% scale) -->
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <g filter="url(#dropShadowM)">
      <path d="M96 240 C96 170 152 114 222 114 L306 114 C376 114 432 170 432 240 C432 310 376 366 306 366 L230 366 L158 418 C146 426 130 418 130 404 L130 364 C110 344 96 305 96 240 Z"
            fill="url(#bubbleGradientM)" />
    </g>
    <path d="M278 152 L188 274 C184 280 188 288 196 288 L252 288 L232 356 C229 366 242 372 248 364 L338 244 C342 238 338 230 330 230 L274 230 L294 160 C297 150 284 144 278 152 Z"
          fill="url(#boltGradientM)" />
    <circle cx="360" cy="170" r="8" fill="#ffffff" fill-opacity="0.85" />
  </g>
</svg>`;

async function run() {
  const publicIconsDir = path.join(process.cwd(), 'public', 'icons');
  if (!fs.existsSync(publicIconsDir)) fs.mkdirSync(publicIconsDir, { recursive: true });

  const svgPath = path.join(publicIconsDir, 'icon.svg');
  fs.writeFileSync(svgPath, svgContent);

  // App icon.svg for Next.js tab favicon
  fs.writeFileSync(path.join(process.cwd(), 'src', 'app', 'icon.svg'), svgContent);

  // Generate 512x512 PNG
  await sharp(Buffer.from(svgContent)).resize(512, 512).png().toFile(path.join(publicIconsDir, 'icon-512.png'));
  console.log('Created icon-512.png');

  // Generate 192x192 PNG
  await sharp(Buffer.from(svgContent)).resize(192, 192).png().toFile(path.join(publicIconsDir, 'icon-192.png'));
  console.log('Created icon-192.png');

  // Generate 512x512 maskable PNG
  await sharp(Buffer.from(maskableSvgContent)).resize(512, 512).png().toFile(path.join(publicIconsDir, 'icon-maskable-512.png'));
  console.log('Created icon-maskable-512.png');

  // Apple touch icon 180x180
  await sharp(Buffer.from(svgContent)).resize(180, 180).png().toFile(path.join(publicIconsDir, 'apple-touch-icon.png'));
  await sharp(Buffer.from(svgContent)).resize(180, 180).png().toFile(path.join(process.cwd(), 'src', 'app', 'apple-icon.png'));
  console.log('Created apple-touch-icon.png');

  // Favicon.ico (32x32)
  await sharp(Buffer.from(svgContent)).resize(32, 32).png().toFile(path.join(process.cwd(), 'src', 'app', 'favicon.ico'));
  await sharp(Buffer.from(svgContent)).resize(32, 32).png().toFile(path.join(process.cwd(), 'public', 'favicon.ico'));
  console.log('Created favicon.ico in src/app and public');
}

run().catch(console.error);
