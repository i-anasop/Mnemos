/* eslint-disable @next/next/no-img-element */
'use client';

/* ──────────────────────────────────────────────────────────────────────────
   Official ecosystem brand assets (served from /public/brand) + the Mnemos
   wordmark. Logos are the official Sui / Walrus brand-kit SVGs.
   ────────────────────────────────────────────────────────────────────────── */

export function SuiDroplet({ size = 22, variant = 'blue', className = '' }: { size?: number; variant?: 'blue' | 'black' | 'white'; className?: string }) {
  return (
    <img
      src={`/brand/sui-droplet-${variant}.svg`}
      alt="Sui"
      width={size}
      height={size}
      className={className}
      draggable={false}
    />
  );
}

export function WalrusLogotype({ height = 22, variant = 'black', className = '' }: { height?: number; variant?: 'black' | 'white'; className?: string }) {
  return (
    <img
      src={`/brand/walrus-logotype-${variant}.svg`}
      alt="Walrus"
      style={{ height }}
      className={className}
      draggable={false}
    />
  );
}

export function WalToken({ size = 22, variant = 'color', className = '' }: { size?: number; variant?: 'color' | 'white' | 'black'; className?: string }) {
  const src = variant === 'color' ? '/brand/wal-token-color.webp' : `/brand/wal-token-circle-white.svg`;
  return (
    <img
      src={variant === 'black' ? '/brand/wal-token-black.svg' : src}
      alt="WAL"
      width={size}
      height={size}
      className={className}
      draggable={false}
    />
  );
}

export { MnemosLogo as MnemosMark } from '@/components/ui/Logo';
