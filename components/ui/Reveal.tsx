'use client';

import { useRef, useEffect, useState, type CSSProperties } from 'react';

/* Reveals children with a 3D entrance once they scroll into view. */
export default function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style: CSSProperties = delay ? { transitionDelay: `${delay}s` } : {};

  return (
    <div ref={ref} className={`reveal3d ${shown ? 'in-view' : ''} ${className}`} style={style}>
      {children}
    </div>
  );
}
