'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import AgentFeed from '@/components/agent/AgentFeed';
import MemoryExplorer from '@/components/memory/MemoryExplorer';
import QueryInput from '@/components/workspace/QueryInput';
import type { AgentEvent, BlobMetadata, SynthesisDocument } from '@/types';

// Stable demo user ID — in production this comes from the connected Sui wallet
const DEMO_USER_ID = 'demo-user-mnemos';

interface BlobDetail {
  blob_id: string;
  synthesis?: SynthesisDocument;
  raw?: Record<string, unknown>;
}

export default function WorkspacePage() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [blobs, setBlobs] = useState<BlobMetadata[]>([]);
  const [selectedBlobId, setSelectedBlobId] = useState<string | null>(null);
  const [blobDetail, setBlobDetail] = useState<BlobDetail | null>(null);
  const [isBlobsLoading, setIsBlobsLoading] = useState(false);
  const [lastSynthesis, setLastSynthesis] = useState<SynthesisDocument | null>(null);
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
  }, [events]);

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

  const handleQuery = useCallback(async (query: string) => {
    if (isRunning) return;

    const sessionId = uuidv4();
    sessionIdRef.current = sessionId;
    setEvents([]);
    setLastSynthesis(null);
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

  // Derive synthesis from last session_complete event
  useEffect(() => {
    const complete = [...events].reverse().find(e => e.event === 'synthesis_complete');
    if (complete && complete.event === 'synthesis_complete') {
      setLastSynthesis({
        synthesis_goal: '',
        themes: complete.themes.map(label => ({ label, supporting_findings: [], strength: complete.confidence })),
        knowledge_gaps: [],
        contradictions: [],
        confidence: complete.confidence,
        confidence_delta: complete.confidence_delta,
        session_id: sessionIdRef.current,
        agent: 'synthesizer',
      });
    }
  }, [events]);

  const lastMemoryLoaded = events.find(e => e.event === 'memory_loaded');
  const memoryCount = lastMemoryLoaded?.event === 'memory_loaded' ? lastMemoryLoaded.count : 0;

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/* Top bar */}
      <header className="border-b border-[#1f1f1f] px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs font-mono text-[#06b6d4] tracking-widest uppercase hover:opacity-70 transition-opacity">
            Mnemos
          </Link>
          <span className="text-[#1f1f1f]">|</span>
          <span className="text-xs text-[#555] font-mono">Research Workspace</span>
        </div>
        <div className="flex items-center gap-3">
          {memoryCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/20">
              <span className="w-1 h-1 rounded-full bg-[#06b6d4]" />
              <span className="text-[10px] font-mono text-[#06b6d4]">{memoryCount} memories loaded</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#1f1f1f]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#555]" />
            <span className="text-[10px] font-mono text-[#555]">{DEMO_USER_ID}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — Memory Explorer */}
        <aside className="w-64 border-r border-[#1f1f1f] flex flex-col flex-shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1f1f1f] flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#555] uppercase tracking-wider">Memory</span>
            <span className="text-[10px] font-mono text-[#333]">Walrus</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <MemoryExplorer
              blobs={blobs}
              selectedBlobId={selectedBlobId}
              onSelect={handleBlobSelect}
              isLoading={isBlobsLoading}
            />
          </div>
        </aside>

        {/* Main — Query + Agent Feed */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Query input */}
          <div className="p-5 border-b border-[#1f1f1f] flex-shrink-0">
            <QueryInput onSubmit={handleQuery} isRunning={isRunning} />
          </div>

          {/* Confidence bar (shown after synthesis) */}
          {lastSynthesis && (
            <div className="px-5 py-3 border-b border-[#1f1f1f] flex items-center gap-4 flex-shrink-0 bg-[#0d0d0d]">
              <span className="text-[10px] font-mono text-[#555] w-20 flex-shrink-0">Confidence</span>
              <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#06b6d4] rounded-full transition-all duration-700"
                  style={{ width: `${lastSynthesis.confidence * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-[#06b6d4] w-12 text-right">
                {(lastSynthesis.confidence * 100).toFixed(0)}%
              </span>
              {lastSynthesis.confidence_delta !== 0 && (
                <span className={`text-[10px] font-mono ${lastSynthesis.confidence_delta > 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {lastSynthesis.confidence_delta > 0 ? '+' : ''}{(lastSynthesis.confidence_delta * 100).toFixed(0)}%
                </span>
              )}
            </div>
          )}

          {/* Agent activity feed */}
          <div className="flex-1 overflow-y-auto">
            <AgentFeed events={events} isRunning={isRunning} />
            <div ref={feedBottomRef} />
          </div>
        </main>

        {/* Right panel — Blob detail */}
        <aside className="w-72 border-l border-[#1f1f1f] flex flex-col flex-shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1f1f1f]">
            <span className="text-[10px] font-mono text-[#555] uppercase tracking-wider">Blob Detail</span>
          </div>

          {blobDetail ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Blob ID */}
              <div>
                <p className="text-[9px] font-mono text-[#444] uppercase mb-1">Blob ID</p>
                <p className="text-[10px] font-mono text-[#06b6d4] break-all">{blobDetail.blob_id}</p>
              </div>

              {/* Walrus link */}
              <a
                href={`${process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ?? 'https://aggregator.walrus-testnet.walrus.space'}/v1/blobs/${blobDetail.blob_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[10px] font-mono text-[#555] hover:text-[#888] transition-colors underline underline-offset-2"
              >
                View on Walrus ↗
              </a>

              {/* Synthesis content */}
              {blobDetail.synthesis?.themes && (
                <div>
                  <p className="text-[9px] font-mono text-[#444] uppercase mb-2">Themes</p>
                  <div className="space-y-1.5">
                    {blobDetail.synthesis.themes.map((theme, i) => (
                      <div key={i} className="p-2 rounded bg-[#111] border border-[#1a1a1a]">
                        <p className="text-[10px] font-semibold text-[#06b6d4]">{theme.label}</p>
                        <div className="mt-1 h-0.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#06b6d4]/40 rounded-full"
                            style={{ width: `${(theme.strength ?? 0.5) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {blobDetail.synthesis?.knowledge_gaps && blobDetail.synthesis.knowledge_gaps.length > 0 && (
                <div>
                  <p className="text-[9px] font-mono text-[#444] uppercase mb-2">Knowledge Gaps</p>
                  <ul className="space-y-1">
                    {blobDetail.synthesis.knowledge_gaps.map((gap, i) => (
                      <li key={i} className="text-[10px] text-[#666] flex gap-2">
                        <span className="text-[#333] flex-shrink-0">·</span>
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw JSON */}
              <div>
                <p className="text-[9px] font-mono text-[#444] uppercase mb-1">Raw JSON</p>
                <pre className="text-[9px] font-mono text-[#444] bg-[#0d0d0d] p-3 rounded border border-[#1a1a1a] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                  {JSON.stringify(blobDetail.raw, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center px-4 text-center">
              <div>
                <div className="text-2xl text-[#1f1f1f] mb-2 font-mono">◎</div>
                <p className="text-xs text-[#333]">Select a memory blob to inspect</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
