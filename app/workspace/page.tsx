'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AgentFeed from '@/components/agent/AgentFeed';
import AnswerCard from '@/components/agent/AnswerCard';
import LiveStatus from '@/components/agent/LiveStatus';
import QueryInput from '@/components/workspace/QueryInput';
import MemoryDrawer from '@/components/workspace/MemoryDrawer';
import Icon from '@/components/ui/Icon';
import Sidebar from '@/components/workspace/Sidebar';
import { MnemosLogo } from '@/components/ui/Logo';
import type { AgentEvent, BlobMetadata, SynthesisDocument } from '@/types';

// Stable demo user ID — in production this comes from the connected Sui wallet
const DEMO_USER_ID = 'demo-user-mnemos';

const EXAMPLES = [
  'Key risks of AI in critical infrastructure',
  'How should organizations approach AI governance?',
  'Patterns in multi-agent AI systems',
  'Implications of decentralized AI memory',
];

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

  useEffect(() => {
    document.title = 'Workspace · Mnemos';
  }, []);

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

  const handleNew = useCallback(() => {
    if (isRunning) return;
    setEvents([]);
    setAnswer(null);
    setCurrentQuery('');
  }, [isRunning]);

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
  const errorEvent = events.find(e => e.event === 'error');
  const errorMessage = errorEvent?.event === 'error' ? errorEvent.message : null;

  return (
    <div className="h-screen flex bg-[var(--paper)] text-[var(--ink)] overflow-hidden">
      <Sidebar
        open={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(o => !o)}
        onNew={handleNew}
        onOpenMemory={() => setIsDrawerOpen(true)}
        memoryCount={blobs.length}
      />

      {/* ─── Main column ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {/* slim mobile top strip */}
        <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-[var(--line)] flex-shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} aria-label="Open menu" className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--muted)] hover:bg-[var(--card)]">
            <Icon name="layers" size={18} />
          </button>
          <span className="text-base font-bold tracking-tight">Mnemos</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 w-full">
            {!hasActivity ? (
              /* Empty state — centered greeting + big input */
              <div className="min-h-[74vh] flex flex-col items-center justify-center">
                <span className="mb-5 w-14 h-14 rounded-2xl bg-[var(--card)] border border-[var(--line)] flex items-center justify-center anim-float">
                  <MnemosLogo size={30} />
                </span>
                <h2 className="text-[2rem] sm:text-[2.6rem] font-semibold tracking-tight mb-9 text-center">
                  What should Mnemos <span className="grad-text">remember</span>?
                </h2>

                <div className="w-full">
                  <QueryInput onSubmit={handleQuery} isRunning={isRunning} large />
                </div>

                <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => handleQuery(ex)}
                      className="group inline-flex items-center gap-1.5 text-[12px] text-[var(--muted)] hover:text-[var(--ink)] bg-[var(--card)] border border-[var(--line)] hover:border-[var(--ink)] rounded-full px-3 py-1.5 transition-colors"
                    >
                      <Icon name="sparkle" size={12} className="text-[var(--faint)] group-hover:text-[#6366f1] transition-colors" />
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* User query bubble */}
                {currentQuery && (
                  <div className="mb-8 flex justify-end anim-fade-up">
                    <div className="bg-[var(--ink)] text-[var(--paper)] rounded-[1.3rem] rounded-tr-md px-4 py-3 max-w-[85%]">
                      <p className="text-[15px] leading-relaxed">{currentQuery}</p>
                    </div>
                  </div>
                )}

                {/* While working: one clean changing line */}
                {isRunning && <LiveStatus events={events} />}

                {/* When done */}
                {!isRunning && answer && (
                  <div className="anim-fade-up">
                    {memoryCount > 0 && (
                      <div className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
                        <Icon name="sparkle" size={13} className="text-[#a855f7]" />
                        Recalled {memoryCount} memor{memoryCount !== 1 ? 'ies' : 'y'} from Walrus
                      </div>
                    )}

                    <AnswerCard
                      query={answer.query}
                      synthesis={answer.synthesis}
                      blobId={answer.blobId}
                      durationMs={answer.durationMs}
                      sessionId={answer.sessionId}
                      createdAt={answer.createdAt}
                    />

                    {/* Optional, collapsed-by-default process trace */}
                    <details className="mt-5 group">
                      <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
                        <Icon name="layers" size={13} />
                        How Mnemos answered
                        <span className="group-open:hidden">▾</span>
                        <span className="hidden group-open:inline">▴</span>
                      </summary>
                      <div className="mt-4 pl-1">
                        <AgentFeed events={events} isRunning={false} />
                      </div>
                    </details>
                  </div>
                )}

                {/* Error (no answer produced) */}
                {!isRunning && !answer && errorMessage && (
                  <div className="anim-fade-up bg-[var(--card)] border border-[#ef4444]/40 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon name="close" size={16} className="text-[#ef4444]" />
                      <p className="text-sm font-semibold text-[var(--ink)]">Couldn’t finish that one</p>
                    </div>
                    <p className="text-sm text-[var(--muted)] leading-relaxed">
                      {/rate|429|limit/i.test(errorMessage)
                        ? 'The model hit a rate limit. Give it a few seconds and try again.'
                        : errorMessage}
                    </p>
                  </div>
                )}
              </>
            )}

            <div ref={feedBottomRef} />
          </div>
        </div>

        {/* ─── Input dock (only once a conversation has started) ──────────── */}
        {hasActivity && (
          <div className="flex-shrink-0 bg-[var(--paper)]/95 backdrop-blur-md relative z-10">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-3 w-full">
              <QueryInput onSubmit={handleQuery} isRunning={isRunning} />
            </div>
          </div>
        )}
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
