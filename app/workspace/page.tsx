'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import QueryInput from '@/components/workspace/QueryInput';
import Icon from '@/components/ui/Icon';
import Sidebar from '@/components/workspace/Sidebar';
import SuggestionChips from '@/components/workspace/SuggestionChips';
import MemoryDetail from '@/components/workspace/MemoryDetail';
import TurnView, { type Turn } from '@/components/workspace/TurnView';
import { MnemosLogo } from '@/components/ui/Logo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import type { AgentEvent, BlobMetadata, SynthesisDocument } from '@/types';

// Stable demo user ID — in production this comes from the connected Sui wallet.
// Fresh identity for clean manual testing.
const DEMO_USER_ID = 'manual-test-user';

interface BlobDetail {
  blob_id: string;
  synthesis?: SynthesisDocument;
  raw?: Record<string, unknown>;
  workspace_id?: string;
  memory_type?: string;
  importance?: number;
}

const WORKSPACE_ID = 'manual-test-workspace';

export default function WorkspacePage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [blobs, setBlobs] = useState<BlobMetadata[]>([]);
  const [selectedBlobId, setSelectedBlobId] = useState<string | null>(null);
  const [blobDetail, setBlobDetail] = useState<BlobDetail | null>(null);
  const [isBlobsLoading, setIsBlobsLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const feedBottomRef = useRef<HTMLDivElement>(null);

  // Open the sidebar by default on desktop; keep it closed (off-canvas) on phones.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      setIsSidebarOpen(true);
    }
  }, []);

  const refreshBlobs = useCallback(async () => {
    setIsBlobsLoading(true);
    try {
      const res = await fetch(`/api/memory?user_id=${DEMO_USER_ID}&workspace_id=${WORKSPACE_ID}`);
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
  }, [turns]);

  // On phones the sidebar is an overlay — close it after an action.
  const closeSidebarOnMobile = useCallback(() => {
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches) {
      setIsSidebarOpen(false);
    }
  }, []);

  const handleBlobSelect = useCallback(async (blobId: string) => {
    setSelectedBlobId(blobId);
    closeSidebarOnMobile();
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blob_id: blobId }),
      });
      const data = (await res.json()) as { content: Record<string, unknown>; metadata?: { workspace_id?: string; memory_type?: string; importance?: number } };
      setBlobDetail({
        blob_id: blobId,
        raw: data.content,
        synthesis: data.content as unknown as SynthesisDocument,
        workspace_id: data.metadata?.workspace_id,
        memory_type: data.metadata?.memory_type,
        importance: data.metadata?.importance,
      });
    } catch {
      setBlobDetail({ blob_id: blobId });
    }
  }, [closeSidebarOnMobile]);

  const handleBackToList = useCallback(() => {
    setSelectedBlobId(null);
    setBlobDetail(null);
  }, []);

  const handleNew = useCallback(() => {
    if (isRunning) return;
    setTurns([]);
  }, [isRunning]);

  const handleQuery = useCallback(async (query: string) => {
    if (isRunning) return;
    closeSidebarOnMobile();

    const sessionId = uuidv4();
    const turnId = sessionId;

    // Build recent conversation history (prior completed turns) for context, so
    // the engine understands follow-ups like "its aura" or "no, what do i do?".
    const history = turns
      .filter(t => t.done)
      .flatMap(t => {
        const reply = t.casual ?? (t.synthesis ? `[Answered: ${t.synthesis.synthesis_goal.replace(/^Synthesize findings on:\s*/i, '')}]` : '');
        const msgs: { role: 'user' | 'assistant'; content: string }[] = [{ role: 'user', content: t.query }];
        if (reply) msgs.push({ role: 'assistant', content: reply });
        return msgs;
      })
      .slice(-8);

    // Append a new turn (keeps the whole conversation on screen).
    setTurns(prev => [...prev, { id: turnId, query, events: [], memoryCount: 0, done: false }]);
    setIsRunning(true);

    const patch = (fn: (t: Turn) => Turn) =>
      setTurns(prev => prev.map(t => (t.id === turnId ? fn(t) : t)));

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, session_id: sessionId, user_id: DEMO_USER_ID, workspace_id: WORKSPACE_ID, history }),
      });

      if (!res.ok || !res.body) {
        patch(t => ({ ...t, events: [{ event: 'error', message: `Server error: ${res.status}`, recoverable: false }], done: true }));
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
            patch(t => ({ ...t, events: [...t.events, event] }));

            if (event.event === 'memory_loaded') {
              const c = event.count;
              patch(t => ({ ...t, memoryCount: c }));
            } else if (event.event === 'session_complete') {
              const isResearch = event.reply_mode === 'research';
              const synthesis = event.synthesis;
              const casual = event.casual?.text;
              const durationMs = event.duration_ms;
              patch(t => ({
                ...t,
                synthesis,
                casual,
                stored: isResearch ? undefined : undefined, // decision pending for both
                durationMs,
                sessionId,
                createdAt: Date.now(),
                done: true,
              }));
              setIsRunning(false);
            } else if (event.event === 'memory_committed') {
              const blobId = event.blob_id;
              patch(t => ({ ...t, stored: true, blobId }));
              void refreshBlobs();
            } else if (event.event === 'memory_skipped') {
              patch(t => ({ ...t, stored: false }));
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed';
      patch(t => ({ ...t, events: [...t.events, { event: 'error', message, recoverable: false }], done: true }));
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, refreshBlobs, closeSidebarOnMobile, turns]);

  const hasActivity = turns.length > 0;

  return (
    <div className="h-[100svh] flex bg-[var(--paper)] text-[var(--ink)] overflow-hidden">
      <Sidebar
        open={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(o => !o)}
        onNew={() => { handleNew(); setIsDrawerOpen(false); }}
        onOpenMemory={() => setIsDrawerOpen(true)}
        memoryCount={blobs.length}
        showMemory={isDrawerOpen}
        onCloseMemory={() => { setIsDrawerOpen(false); handleBackToList(); }}
        blobs={blobs}
        selectedBlobId={selectedBlobId}
        onSelectBlob={handleBlobSelect}
        isBlobsLoading={isBlobsLoading}
      />

      {/* ─── Main column ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {/* slim mobile top strip */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2.5 border-b border-[var(--line)] flex-shrink-0 bg-[var(--paper)]/90 backdrop-blur-md">
          <button onClick={() => setIsSidebarOpen(true)} aria-label="Open menu" className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--muted)] hover:bg-[var(--card)]">
            <Icon name="layers" size={18} />
          </button>
          <span className="flex items-center gap-2 font-bold tracking-tight">
            <MnemosLogo size={22} />
            Mnemos
          </span>
          <div className="ml-auto flex items-center gap-1">
            {hasActivity && (
              <button onClick={handleNew} aria-label="New session" className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--muted)] hover:bg-[var(--card)]">
                <Icon name="bolt" size={18} />
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {blobDetail ? (
            /* Memory detail — opens in the main area */
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 w-full">
              <MemoryDetail detail={blobDetail} onBack={handleBackToList} />
            </div>
          ) : !hasActivity ? (
            /* Empty state — wide centered greeting + big input */
            <div className="max-w-3xl mx-auto px-4 sm:px-6 w-full min-h-[72svh] flex flex-col items-center justify-center">
              <span className="mb-5 w-14 h-14 rounded-2xl bg-[var(--card)] border border-[var(--line)] flex items-center justify-center anim-float">
                <MnemosLogo size={30} />
              </span>
              <h2 className="text-[1.7rem] sm:text-[2.6rem] font-semibold tracking-tight mb-7 sm:mb-9 text-center leading-tight">
                What should Mnemos <span className="grad-text">remember</span>?
              </h2>

              <div className="w-full">
                <QueryInput onSubmit={handleQuery} isRunning={isRunning} large />
              </div>

              <SuggestionChips onSelect={handleQuery} />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full">
              {turns.map((turn, i) => (
                <TurnView key={turn.id} turn={turn} animate={i === turns.length - 1} />
              ))}
              <div ref={feedBottomRef} />
            </div>
          )}
        </div>

        {/* ─── Input dock (only once a conversation has started) ──────────── */}
        {hasActivity && (
          <div className="flex-shrink-0 bg-[var(--paper)]/95 backdrop-blur-md relative z-10">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-3 w-full">
              <QueryInput onSubmit={handleQuery} isRunning={isRunning} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
