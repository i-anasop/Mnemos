'use client';

import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/Icon';

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isRunning: boolean;
}

const PLACEHOLDER_QUERIES = [
  'What are the key risks of AI in critical infrastructure?',
  'How should organizations approach AI governance in 2026?',
  'What are the emerging patterns in multi-agent AI systems?',
  'Analyze the implications of decentralized AI memory',
];

export default function QueryInput({ onSubmit, isRunning }: QueryInputProps) {
  const [query, setQuery] = useState('');
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER_QUERIES[0]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const idx = Math.floor(Math.random() * PLACEHOLDER_QUERIES.length);
    setPlaceholder(PLACEHOLDER_QUERIES[idx]);
  }, []);

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed || isRunning) return;
    onSubmit(trimmed);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [query]);

  return (
    <div className="bg-white border border-[#e6e4dc] rounded-[1.6rem] shadow-[0_8px_30px_-14px_rgba(0,0,0,0.18)] focus-within:border-[#c2c0b5] transition-colors px-4 py-3">
      <textarea
        ref={textareaRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isRunning}
        rows={1}
        aria-label="Research query"
        className="w-full bg-transparent text-[15px] text-[#0e0e0e] placeholder-[#b3b1a8] resize-none outline-none leading-relaxed disabled:opacity-50"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-[#b3b1a8]">
          {isRunning ? (
            <span className="flex items-center gap-1.5 text-[#6366f1] font-medium">
              <span className="w-1.5 h-1.5 rounded-full grad-bg animate-pulse" />
              Thinking…
            </span>
          ) : (
            <span className="hidden sm:inline">↵ to send · ⇧↵ for a new line</span>
          )}
        </span>
        <button
          onClick={handleSubmit}
          disabled={!query.trim() || isRunning}
          aria-label="Send"
          className="w-9 h-9 rounded-full bg-[#0e0e0e] text-white flex items-center justify-center hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed transition-opacity"
        >
          <Icon name="arrow-up-right" size={16} className="text-white -rotate-45" />
        </button>
      </div>
    </div>
  );
}
