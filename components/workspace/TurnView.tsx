'use client';

import type { AgentEvent, SynthesisDocument } from '@/types';
import AnswerCard from '@/components/agent/AnswerCard';
import LiveStatus from '@/components/agent/LiveStatus';
import ProcessTrace from '@/components/agent/ProcessTrace';
import TypewriterText from '@/components/agent/TypewriterText';
import MessageActions from '@/components/agent/MessageActions';
import Icon from '@/components/ui/Icon';
import { MnemosLogo } from '@/components/ui/Logo';

export interface Turn {
  id: string;
  query: string;
  events: AgentEvent[];
  memoryCount: number;
  synthesis?: SynthesisDocument;
  casual?: string;
  stored?: boolean;
  blobId?: string;
  durationMs?: number;
  sessionId?: string;
  createdAt?: number;
  done: boolean;
}

/* One conversation turn: the user's message + Mnemos's reply.
   `animate` (latest turn only) enables the word-by-word typewriter. */
export default function TurnView({ turn, animate }: { turn: Turn; animate: boolean }) {
  const errorEvent = turn.events.find((e) => e.event === 'error');
  const errorMessage = errorEvent?.event === 'error' ? errorEvent.message : null;
  const working = !turn.done;

  return (
    <div className="mb-9">
      {/* user message */}
      <div className="mb-6 flex justify-end">
        <div className="bg-[var(--ink)] text-[var(--paper)] rounded-[1.3rem] rounded-tr-md px-4 py-3 max-w-[85%]">
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{turn.query}</p>
        </div>
      </div>

      {/* live status while working */}
      {working && !errorMessage && <LiveStatus events={turn.events} />}

      {/* finished reply */}
      {turn.done && (turn.synthesis || turn.casual) && (
        <div className="anim-fade-up">
          {turn.memoryCount > 0 && turn.synthesis && (
            <div className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
              <Icon name="sparkle" size={13} className="text-[#a855f7]" />
              Recalled {turn.memoryCount} memor{turn.memoryCount !== 1 ? 'ies' : 'y'} from Walrus
            </div>
          )}

          {turn.synthesis ? (
            <>
              <AnswerCard
                query={turn.query}
                synthesis={turn.synthesis}
                blobId={turn.blobId}
                durationMs={turn.durationMs}
                sessionId={turn.sessionId}
                createdAt={turn.createdAt}
                storeState={turn.stored === undefined ? 'saving' : turn.stored ? 'saved' : 'skipped'}
              />
              <details className="mt-5 group">
                <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
                  <Icon name="layers" size={13} />
                  How Mnemos answered
                  <span className="group-open:hidden">▾</span>
                  <span className="hidden group-open:inline">▴</span>
                </summary>
                <div className="mt-3.5">
                  <ProcessTrace events={turn.events} />
                </div>
              </details>
            </>
          ) : (
            <div className="flex gap-3 sm:gap-4">
              <span className="flex-shrink-0 mt-0.5 w-9 h-9 rounded-full border border-[var(--line)] bg-[var(--card)] flex items-center justify-center">
                <MnemosLogo size={20} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold mb-2">Mnemos</p>
                <div className="text-[17px] text-[var(--ink)] leading-[1.75] whitespace-pre-wrap">
                  {animate ? (
                    <TypewriterText text={turn.casual ?? ''} />
                  ) : (
                    turn.casual
                  )}
                </div>
                {/* saved indicator for conversational memories */}
                {turn.stored && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#16a34a] font-medium">
                    <Icon name="check" size={12} />
                    Saved to Walrus
                  </p>
                )}
                <MessageActions text={turn.casual ?? ''} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* error */}
      {turn.done && errorMessage && (
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
    </div>
  );
}
