'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/Icon';

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isRunning: boolean;
  large?: boolean;
}

const PLACEHOLDER_QUERIES = [
  'What are the key risks of AI in critical infrastructure?',
  'How should organizations approach AI governance in 2026?',
  'What are the emerging patterns in multi-agent AI systems?',
  'Analyze the implications of decentralized AI memory systems',
];

/* Minimal typing for the Web Speech API (not in lib.dom by default). */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export default function QueryInput({ onSubmit, isRunning, large = false }: QueryInputProps) {
  const [query, setQuery] = useState('');
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER_QUERIES[0]);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const idx = Math.floor(Math.random() * PLACEHOLDER_QUERIES.length);
    setPlaceholder(PLACEHOLDER_QUERIES[idx]);

    const W = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (Ctor) {
      setVoiceSupported(true);
      const rec = new Ctor();
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.continuous = false;
      rec.onresult = (e) => {
        let text = '';
        for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
        setQuery(text);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recognitionRef.current = rec;
    }
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

  const toggleVoice = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      try {
        rec.start();
        setListening(true);
        textareaRef.current?.focus();
      } catch {
        setListening(false);
      }
    }
  }, [listening]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const names = Array.from(e.target.files ?? []).map((f) => f.name);
    if (names.length) {
      setQuery((q) => `${q}${q ? '\n' : ''}Referencing: ${names.join(', ')}. `);
      textareaRef.current?.focus();
    }
    e.target.value = '';
  };

  // Auto-resize textarea with a comfortable floor so it never collapses to a
  // tiny single line after sending (consistent height in empty + docked states).
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const base = large ? 52 : 40;
    const max = large ? 200 : 140;
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight, base), max)}px`;
  }, [query, large]);

  return (
    <div
      className={`bg-[var(--card)] border rounded-[1.75rem] shadow-[0_10px_36px_-16px_rgba(0,0,0,0.22)] transition-colors flex flex-col ${
        listening ? 'border-[#6366f1]' : 'border-[var(--line)] focus-within:border-[var(--muted)]'
      } ${large ? 'px-5 pt-4 pb-3' : 'px-4 pt-4 pb-2.5'}`}
    >
      <textarea
        ref={textareaRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={listening ? 'Listening…' : large ? 'How can Mnemos help you today?' : placeholder}
        disabled={isRunning}
        rows={1}
        aria-label="Research query"
        className={`w-full bg-transparent text-[var(--ink)] placeholder-[var(--faint)] resize-none outline-none leading-relaxed disabled:opacity-50 ${
          large ? 'text-[16px]' : 'text-[15px]'
        }`}
      />

      <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFiles} />

      <div className="flex items-center justify-between mt-2">
        {/* left tools */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Attach a file"
            title="Attach a file"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors"
          >
            <Icon name="plus" size={19} />
          </button>
          <span className="hidden sm:flex items-center gap-1.5 ml-0.5 px-2.5 py-1 rounded-full text-[12px] font-medium text-[var(--muted)] bg-[var(--paper)] border border-[var(--line)]">
            <span className="w-1.5 h-1.5 rounded-full grad-bg" />
            Walrus memory
          </span>
        </div>

        {/* right tools */}
        <div className="flex items-center gap-1">
          {isRunning ? (
            <span className="flex items-center gap-1.5 mr-1 text-xs text-[#6366f1] font-medium">
              <span className="w-1.5 h-1.5 rounded-full grad-bg animate-pulse" />
              Thinking…
            </span>
          ) : (
            voiceSupported && (
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={listening ? 'Stop voice input' : 'Voice input'}
                title={listening ? 'Stop' : 'Voice input'}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  listening
                    ? 'bg-[#6366f1] text-white'
                    : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]'
                }`}
              >
                <Icon name="mic" size={18} className={listening ? 'animate-pulse' : ''} />
              </button>
            )
          )}
          <button
            onClick={handleSubmit}
            disabled={!query.trim() || isRunning}
            aria-label="Send"
            className={`rounded-full bg-[var(--ink)] text-[var(--paper)] flex items-center justify-center hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed transition-opacity ${
              large ? 'w-11 h-11' : 'w-9 h-9'
            }`}
          >
            <Icon name="arrow-up-right" size={large ? 18 : 16} className="-rotate-45" />
          </button>
        </div>
      </div>
    </div>
  );
}
