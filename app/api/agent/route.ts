import { NextRequest } from 'next/server';
import { runOrchestrator } from '@/lib/agents/orchestrator';
import type { AgentEvent, AgentRequestBody } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

function formatSSE(event: AgentEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: NextRequest) {
  let body: AgentRequestBody;
  try {
    body = (await req.json()) as AgentRequestBody;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { query, session_id, user_id } = body;
  if (!query || !session_id || !user_id) {
    return new Response('Missing required fields: query, session_id, user_id', { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: AgentEvent) => {
        try {
          controller.enqueue(encoder.encode(formatSSE(event)));
        } catch {
          // client disconnected
        }
      };

      try {
        await runOrchestrator({ query, session_id, user_id, emit });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Orchestration failed';
        emit({ event: 'error', message, recoverable: false });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
