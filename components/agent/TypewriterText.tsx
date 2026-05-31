'use client';

import { useState, useEffect, useRef } from 'react';

/* Reveals text word-by-word, like a streaming chat reply. */
export default function TypewriterText({
  text,
  speed = 28,
  className = '',
  onDone,
}: {
  text: string;
  speed?: number;       // ms per word
  className?: string;
  onDone?: () => void;
}) {
  const words = text.split(/(\s+)/); // keep whitespace tokens
  const [count, setCount] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    setCount(0);
    doneRef.current = false;
  }, [text]);

  useEffect(() => {
    if (count >= words.length) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
      return;
    }
    const id = setTimeout(() => setCount((c) => c + 1), words[count]?.trim() === '' ? speed / 3 : speed);
    return () => clearTimeout(id);
  }, [count, words, speed, onDone]);

  const shown = words.slice(0, count).join('');
  const typing = count < words.length;

  return (
    <span className={className}>
      {shown}
      {typing && <span className="inline-block w-[2px] h-[1em] align-[-0.15em] bg-current opacity-70 animate-pulse ml-0.5" />}
    </span>
  );
}
