'use client';

import { useState, useEffect, useRef } from 'react';

const SECTIONS = [
  { id: 'hero', label: 'Top' },
  { id: 'how', label: 'How it works' },
  { id: 'proof', label: 'Proof' },
];

export default function SectionNav() {
  const [active, setActive] = useState('hero');
  const activeRef = useRef(active);
  const wheelLockedRef = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.snap-main');
    const observers = SECTIONS.map((s) => {
      const el = document.getElementById(s.id);
      if (!el) return null;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(s.id);
        },
        { root, threshold: 0.55 },
      );
      io.observe(el);
      return io;
    });
    return () => observers.forEach((io) => io?.disconnect());
  }, []);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.snap-main');
    const finePointer = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!root || !finePointer.matches || reducedMotion.matches) return;

    const scrollToSection = (direction: 1 | -1) => {
      const currentIndex = Math.max(0, SECTIONS.findIndex((s) => s.id === activeRef.current));
      const nextIndex = Math.min(SECTIONS.length - 1, Math.max(0, currentIndex + direction));
      if (nextIndex === currentIndex) return;

      const next = document.getElementById(SECTIONS[nextIndex].id);
      if (!next) return;

      wheelLockedRef.current = true;
      root.scrollTo({ top: next.offsetTop, behavior: 'smooth' });
      window.setTimeout(() => {
        wheelLockedRef.current = false;
      }, 760);
    };

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 18) return;
      event.preventDefault();
      if (wheelLockedRef.current) return;
      scrollToSection(event.deltaY > 0 ? 1 : -1);
    };

    root.addEventListener('wheel', onWheel, { passive: false });
    return () => root.removeEventListener('wheel', onWheel);
  }, []);

  const go = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="hidden lg:flex fixed right-7 top-1/2 -translate-y-1/2 z-40 flex-col items-end gap-3">
      {SECTIONS.map((s) => {
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            onClick={() => go(s.id)}
            aria-label={s.label}
            className="group relative flex items-center justify-end"
          >
            <span className="absolute right-7 px-2.5 py-1 rounded-lg bg-[#0e0e0e] text-white text-[11px] font-medium whitespace-nowrap opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none">
              {s.label}
            </span>
            <span
              className={`block rounded-full transition-all duration-300 ${
                isActive ? 'w-2.5 h-7 grad-bg' : 'w-2.5 h-2.5 bg-[#c2c0b5] group-hover:bg-[#0e0e0e]'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
