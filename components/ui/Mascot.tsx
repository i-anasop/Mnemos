/* eslint-disable @next/next/no-img-element */
'use client';

import type { CSSProperties } from 'react';

export type MascotPose = 'salute' | 'peace' | 'primary' | 'haulout';

interface MascotProps {
  pose?: MascotPose;
  className?: string;
  style?: CSSProperties;
  alt?: string;
  priority?: boolean;
}

/* Official Walrus mascot (optimized WebP in /public/brand/mascot). */
export default function Mascot({
  pose = 'salute',
  className = '',
  style,
  alt = 'Walrus mascot',
  priority = false,
}: MascotProps) {
  return (
    <img
      src={`/brand/mascot/mascot-${pose}.webp`}
      alt={alt}
      className={className}
      style={style}
      draggable={false}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
