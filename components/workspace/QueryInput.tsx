'use client';

import { useState, useRef, useEffect } from 'react';

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isRunning: boolean;
}

const PLACEHOLDER_QUERIES = [
  'What are the key risks of AI proliferation in critical infrastructure?',
  'How should organizations approach AI governance in 2026?',
  'What are the emerging patterns in multi-agent AI systems?',
  'Analyze the implications of decentralized AI memory systems',
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
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [query]);

  return (
    <div className="border border-[#1f1f1f] rounded-xl bg-[#111] focus-within:border-[#06b6d4]/40 transition-colors p-4">
      <textarea
        ref={textareaRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isRunning}
        rows={2}
        className="w-full bg-transparent text-sm text-[#f0f0f0] placeholder-[#333] resize-none outline-none leading-relaxed disabled:opacity-50"
      />
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1a1a1a]">
        <span className="text-[10px] text-[#444] font-mono">
          {isRunning ? (
            <span className="text-[#06b6d4]">● Running…</span>
          ) : (
            '⌘↵ to submit'
          )}
        </span>
        <button
          onClick={handleSubmit}
          disabled={!query.trim() || isRunning}
          className="px-5 py-1.5 rounded-md bg-[#06b6d4] text-black text-xs font-semibold hover:bg-[#0891b2] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {isRunning ? 'Running…' : 'Research →'}
        </button>
      </div>
    </div>
  );
}
