'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import AgentFeed from '@/components/agent/AgentFeed';
import AnswerCard from '@/components/agent/AnswerCard';
import QueryInput from '@/components/workspace/QueryInput';
import MemoryDrawer from '@/components/workspace/MemoryDrawer';
import Icon from '@/components/ui/Icon';
import { MnemosMark } from '@/components/ui/Brand';
import type { AgentEvent, BlobMetadata, SynthesisDocument } from '@/types';

// Stable demo user ID — in production this comes from the connected Sui wallet
const DEMO_USER_ID = 'demo-user-mnemos';

interface BlobDetail {
  blob_id: string;
  synthesis?: SynthesisDocument;
  raw?: Record<string, unknown>;
}

interface Answer {
  query: string;
  synthesis: SynthesisDocument;
  blobId?: string;
  durationMs?: number;
  sessionId?: string;
  createdAt?: number;
}

export default function WorkspacePage() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [blobs, setBlobs] = useState<BlobMetadata[]>([]);
  const [selectedBlobId, setSelectedBlobId] = useState<string | null>(null);
  const [blobDetail, setBlobDetail] = useState<BlobDetail | null>(null);
  const [isBlobsLoading, setIsBlobsLoading] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const sessionIdRef = useRef<string>(uuidv4());
  const feedBottomRef = useRef<HTMLDivElement>(null);

  const refreshBlobs = useCallback(async () => {
    setIsBlobsLoading(true);
    try {
      const res = await fetch(`/api/memory?user_id=${DEMO_USER_ID}`);
      const data = (await res.json()) as { blobs: BlobMetadata[] };
      setBlobs(data.blobs.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch {
      // silently ignore
    } finally {
      setIsBlobsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshBlobs();
  }, [refreshBlobs]);

  // Auto-scroll feed to bottom
  useEffect(() => {
    feedBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events, answer]);

  const handleBlobSelect = useCallback(async (blobId: string) => {
    setSelectedBlobId(blobId);
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blob_id: blobId }),
      });
      const data = (await res.json()) as { content: Record<string, unknown> };
      setBlobDetail({ blob_id: blobId, raw: data.content, synthesis: data.content as unknown as SynthesisDocument });
    } catch {
      setBlobDetail({ blob_id: blobId });
    }
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedBlobId(null);
    setBlobDetail(null);
  }, []);

  const handleQuery = useCallback(async (query: string) => {
    if (isRunning) return;

    const sessionId = uuidv4();
    sessionIdRef.current = sessionId;
    setEvents([]);
    setAnswer(null);
    setCurrentQuery(query);
    setIsRunning(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, session_id: sessionId, user_id: DEMO_USER_ID }),
      });

      if (!res.ok || !res.body) {
        setEvents([{ event: 'error', message: `Server error: ${res.status}`, recoverable: false }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as AgentEvent;
            setEvents(prev => [...prev, event]);

            if (event.event === 'session_complete') {
              if (event.synthesis) {
                setAnswer({
                  query,
                  synthesis: event.synthesis,
                  blobId: event.blob_id,
                  durationMs: event.duration_ms,
                  sessionId,
                  createdAt: Date.now(),
                });
              }
              void refreshBlobs();
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setEvents(prev => [...prev, { event: 'error', message, recoverable: false }]);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, refreshBlobs]);

  const lastMemoryLoaded = events.find(e => e.event === 'memory_loaded');
  const memoryCount = lastMemoryLoaded?.event === 'memory_loaded' ? lastMemoryLoaded.count : 0;
  const hasActivity = currentQuery !== '' || events.length > 0;

  return (
    <div className="h-screen flex flex-col bg-[#f6f5f1] overflow-hidden">
      {/* ─── Top bar ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 sm:px-7 py-3.5 border-b border-[#e6e4dc] bg-[#f6f5f1]/80 backdrop-blur-md flex-shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <MnemosMark size={28} className="group-hover:scale-105 transition-transform" />
            <span className="text-base font-bold tracking-tight">Mnemos</span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 pill pill-ghost text-[11px] px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full grad-bg" />
            Powered by Walrus
          </span>
        </div>

        <button
          onClick={() => setIsDrawerOpen(true)}
          className="pill pill-ink text-sm px-4 py-2"
        >
          <Icon name="layers" size={15} className="text-white" />
          Memory
          {blobs.length > 0 && (
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] leading-none">
              {blobs.length}
            </span>
          )}
        </button>
      </header>

      {/* ─── Main centered column ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* single soft pastel wash near the bottom */}
        <div className="bloom-band bottom-24 h-48 opacity-70" />

        <div className="flex-1 overflow-y-auto relative z-10">
          <div className="max-w-2xl mx-auto px-5 py-8 w-full">
            {!hasActivity ? (
              /* Empty hero state — centered with whitespace */
              <div className="min-h-[58vh] flex items-center justify-center">
                <AgentFeed events={events} isRunning={isRunning} />
              </div>
            ) : (
              <>
                {/* User query bubble */}
                {currentQuery && (
                  <div className="mb-7 flex justify-end anim-fade-up">
                    <div className="bg-[#0e0e0e] text-white rounded-[1.4rem] rounded-tr-md px-5 py-3.5 max-w-[85%] shadow-float">
                      <p className="text-[15px] leading-relaxed">{currentQuery}</p>
                    </div>
                  </div>
                )}

                {/* Memory-recalled hint */}
                {memoryCount > 0 && (
                  <div className="mb-5 inline-flex items-center gap-2 pill text-xs px-3 py-1.5 grad-bg text-white anim-fade-up shadow-float">
                    <Icon name="search" size={13} className="text-white" />
                    {memoryCount} prior memor{memoryCount !== 1 ? 'ies' : 'y'} recalled from Walrus
                  </div>
                )}

                {/* Stage timeline */}
                <AgentFeed events={events} isRunning={isRunning} />

                {/* Answer */}
                {answer && !isRunning && (
                  <div className="mt-6">
                    <AnswerCard
                      query={answer.query}
                      synthesis={answer.synthesis}
                      blobId={answer.blobId}
                      durationMs={answer.durationMs}
                      sessionId={answer.sessionId}
                      createdAt={answer.createdAt}
                    />
                  </div>
                )}
              </>
            )}

            <div ref={feedBottomRef} />
          </div>
        </div>

        {/* ─── Input dock ────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-[#e6e4dc] bg-[#f6f5f1]/90 backdrop-blur-md relative z-10">
          <div className="max-w-2xl mx-auto px-5 py-4 w-full">
            <QueryInput onSubmit={handleQuery} isRunning={isRunning} />
            <p className="text-center text-[11px] text-[#9a9a93] mt-2.5">
              Mnemos recalls from Walrus · researches · stores new memory — verifiably.
            </p>
          </div>
        </div>
      </main>

      {/* ─── Memory drawer ───────────────────────────────────────────────── */}
      <MemoryDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        blobs={blobs}
        selectedBlobId={selectedBlobId}
        onSelect={handleBlobSelect}
        isLoading={isBlobsLoading}
        blobDetail={blobDetail}
        onBack={handleBackToList}
      />
    </div>
  );
}
