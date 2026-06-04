'use client';

import { useEffect } from 'react';

export default function LandingInteractions() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const onPointerDown = (event: PointerEvent) => {
      if (reduceMotion) return;
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-ripple]')
        : null;
      if (!target) return;

      const box = target.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'tap-ripple';
      ripple.style.left = `${event.clientX - box.left}px`;
      ripple.style.top = `${event.clientY - box.top}px`;
      target.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 620);
    };

    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  return null;
}
