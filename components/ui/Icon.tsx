'use client';

import type { CSSProperties } from 'react';

/* ──────────────────────────────────────────────────────────────────────────
   Mnemos icon set — professional line icons (Lucide-geometry, MIT-equivalent
   originals). Inherits currentColor. 24px grid, 2px stroke, round joins.
   ────────────────────────────────────────────────────────────────────────── */

export type IconName =
  | 'search'
  | 'sparkle'
  | 'layers'
  | 'database'
  | 'check'
  | 'commit'
  | 'shield'
  | 'brain'
  | 'clock'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'close'
  | 'flask'
  | 'merge'
  | 'bolt'
  | 'question'
  | 'memory'
  | 'infinity'
  | 'restart'
  | 'target'
  | 'lightbulb'
  | 'copy'
  | 'mic'
  | 'waveform'
  | 'plus'
  | 'globe';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}

const PATHS: Record<IconName, React.ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  sparkle: (
    <>
      <path d="M9.94 14.06A2 2 0 0 0 8.5 12.62L2.9 11.18a.5.5 0 0 1 0-.96L8.5 8.78A2 2 0 0 0 9.94 7.34l1.28-5.04a.5.5 0 0 1 .96 0l1.28 5.04a2 2 0 0 0 1.44 1.44l5.6 1.44a.5.5 0 0 1 0 .96l-5.6 1.44a2 2 0 0 0-1.44 1.44l-1.28 5.04a.5.5 0 0 1-.96 0z" />
      <path d="M20 3v4M22 5h-4" />
    </>
  ),
  layers: (
    <>
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m6.08 9.5-3.48 1.58a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83L17.92 9.5" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  commit: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M3 12h6M15 12h6" />
    </>
  ),
  shield: (
    <>
      <path d="M20 13c0 5-3.5 7.4-7.66 8.84a1 1 0 0 1-.67 0C7.5 20.4 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.8 17 5 19 5a1 1 0 0 1 1 1Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  brain: (
    <>
      <path d="M12 5a3 3 0 1 0-5.99.13 4 4 0 0 0-2.53 5.77 4 4 0 0 0 .56 6.59A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.99.13 4 4 0 0 1 2.53 5.77 4 4 0 0 1-.56 6.59A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
  'arrow-up-right': (
    <>
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </>
  ),
  close: <path d="M18 6 6 18M6 6l12 12" />,
  flask: (
    <>
      <path d="M14 2v6a2 2 0 0 0 .24.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.75-2.96l5.51-10.08A2 2 0 0 0 10 8V2" />
      <path d="M8.5 2h7M6.45 15h11.1" />
    </>
  ),
  merge: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M6 9v3a9 9 0 0 0 9 9" />
    </>
  ),
  bolt: (
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </>
  ),
  memory: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
    </>
  ),
  infinity: (
    <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z" />
  ),
  restart: (
    <>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5A5.5 5.5 0 1 0 7.5 11.5c.8.8 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6M10 22h4" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
    </>
  ),
  waveform: <path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4" />,
  plus: <path d="M12 5v14M5 12h14" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
};

export default function Icon({ name, size = 20, className = '', strokeWidth = 2, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
