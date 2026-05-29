import sharp from 'sharp';
import { mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

const SRC = 'D:/Claude Era/context/assets';
const OUT = 'D:/Claude Era/mnemos/public/brand';

const mascotDir = join(SRC, '04_Mascot-20260529T190713Z-3-001/04_Mascot');
const walrusLogo = join(SRC, '01_Walrus_Logotype-20260529T190713Z-3-001/01_Walrus_Logotype/SVG');
const suiDroplet = join(SRC, '01_Sui_Logo/01_Sui_Logo/Sui_Droplet/SVG');
const suiFull = join(SRC, '01_Sui_Logo/01_Sui_Logo/Sui_Full_Logo/SVG');
const walTokenSq = join(SRC, '03_WAL_Token_Icon-20260529T190715Z-3-001/03_WAL_Token_Icon/03.01_Walrus_Token_Square_Crop');
const walTokenCircle = join(SRC, '03_WAL_Token_Icon-20260529T190715Z-3-001/03_WAL_Token_Icon/03.02_Walrus_Token_Circle_Crop');

await mkdir(join(OUT, 'mascot'), { recursive: true });

// ── Mascots → optimized webp (transparent, max 1100px) ──────────────────────
const mascots = [
  ['Mascot_01_Primary.png', 'mascot-primary.webp'],
  ['Mascot_02_Salute.png', 'mascot-salute.webp'],
  ['Mascot_03_Peace.png', 'mascot-peace.webp'],
  ['Mascot_05_Haulout.png', 'mascot-haulout.webp'],
];

for (const [src, dst] of mascots) {
  const info = await sharp(join(mascotDir, src))
    .resize({ height: 1100, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90, effort: 5 })
    .toFile(join(OUT, 'mascot', dst));
  console.log(`mascot ${dst}: ${info.width}x${info.height} ${(info.size / 1024).toFixed(0)}KB`);
}

// ── Logos (SVG copies) ──────────────────────────────────────────────────────
const svgs = [
  [join(walrusLogo, 'Walrus_Logotype_Black.svg'), 'walrus-logotype-black.svg'],
  [join(walrusLogo, 'Walrus_Logotype_White.svg'), 'walrus-logotype-white.svg'],
  [join(suiDroplet, 'Logo_Sui_Droplet_Sui Blue.svg'), 'sui-droplet-blue.svg'],
  [join(suiDroplet, 'Logo_Sui_Droplet_Black.svg'), 'sui-droplet-black.svg'],
  [join(suiDroplet, 'Logo_Sui_Droplet_White.svg'), 'sui-droplet-white.svg'],
  [join(suiFull, 'Logo_Sui_Full_Black.svg'), 'sui-full-black.svg'],
  [join(suiFull, 'Logo_Sui_Full_White.svg'), 'sui-full-white.svg'],
  [join(walTokenSq, 'SVG/Walrus_Token_Black.svg'), 'wal-token-black.svg'],
  [join(walTokenCircle, 'SVG/Walrus_Token_Circle_White.svg'), 'wal-token-circle-white.svg'],
];
for (const [src, dst] of svgs) {
  await copyFile(src, join(OUT, dst));
  console.log(`svg  ${dst}`);
}

// ── WAL token full-color (PNG → webp) ───────────────────────────────────────
const tokenColor = await sharp(join(walTokenCircle, 'PNG/Walrus_Token_Circle_Full_Color.png'))
  .resize({ width: 256, height: 256, fit: 'inside' })
  .webp({ quality: 92 })
  .toFile(join(OUT, 'wal-token-color.webp'));
console.log(`token wal-token-color.webp: ${(tokenColor.size / 1024).toFixed(0)}KB`);

console.log('\n✓ assets prepared in public/brand');
