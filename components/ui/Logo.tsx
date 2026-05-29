'use client';

import { useId } from 'react';
import type { CSSProperties } from 'react';

/* ──────────────────────────────────────────────────────────────────────────
   Mnemos logomark — a continuous "memory loop" (lemniscate) with a core node.
   Meaning: memory that persists and never ends; the node is the stored core,
   the loop is recall across sessions. Original, gradient, scales to a favicon.
   ────────────────────────────────────────────────────────────────────────── */

const LOOP =
  'M20 20 C 18 10.5 7.5 10.5 7.5 20 C 7.5 29.5 18 29.5 20 20 C 22 10.5 32.5 10.5 32.5 20 C 32.5 29.5 22 29.5 20 20 Z';

interface LogoProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}

export function MnemosLogo({ size = 28, className = '', style, strokeWidth = 4.4 }: LogoProps) {
  const gid = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      style={style}
      aria-label="Mnemos"
      role="img"
    >
      <defs>
        <linearGradient id={`mn-${gid}`} x1="4" y1="6" x2="36" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#06b6d4" />
          <stop offset="0.52" stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path
        d={LOOP}
        stroke={`url(#mn-${gid})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="20" r="3.1" fill={`url(#mn-${gid})`} />
    </svg>
  );
}

/* Logo + wordmark lockup */
export function MnemosWordmark({ size = 26, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <MnemosLogo size={size} />
      <span className="font-bold tracking-tight" style={{ fontSize: size * 0.72 }}>
        Mnemos
      </span>
    </span>
  );
}
