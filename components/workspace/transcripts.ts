'use client';

import type { Turn } from '@/components/workspace/TurnView';

/* Local UI transcript persistence — keeps each chat's visible conversation
   across switches/refresh. This is purely for UI continuity; meaningful memory
   still lives on Walrus via the engine. Keyed by user_id + workspace_id. */

const key = (userId: string, workspaceId: string) => `mnemos-transcript:${userId}:${workspaceId}`;
const MAX_TURNS = 60;

export function loadTranscript(userId: string, workspaceId: string): Turn[] {
  try {
    const raw = localStorage.getItem(key(userId, workspaceId));
    if (!raw) return [];
    const turns = JSON.parse(raw) as Turn[];
    // Never restore a half-finished turn as "running".
    return turns.map(t => ({ ...t, done: true }));
  } catch {
    return [];
  }
}

export function saveTranscript(userId: string, workspaceId: string, turns: Turn[]): void {
  try {
    localStorage.setItem(key(userId, workspaceId), JSON.stringify(turns.slice(-MAX_TURNS)));
  } catch {
    // quota / unavailable — non-fatal
  }
}

export function clearTranscript(userId: string, workspaceId: string): void {
  try {
    localStorage.removeItem(key(userId, workspaceId));
  } catch {
    // non-fatal
  }
}
