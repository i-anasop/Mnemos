import type { VectorEntry, VectorIndex } from '@/types';
import { DEFAULT_WORKSPACE_ID } from '@/lib/workspace';

export interface ScoredEntry {
  entry: VectorEntry;
  score: number;  // raw cosine similarity (used as the "match" the UI shows)
  rank: number;   // composite ranking score (relevance + importance + recency + confidence)
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function recencyScore(iso: string): number {
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  // 1.0 today → ~0.5 at one week → decays gently after.
  return 1 / (1 + days / 7);
}

export function searchVectors(
  index: VectorIndex,
  queryVector: number[],
  topK = 5,
  minScore = 0,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
): ScoredEntry[] {
  if (index.entries.length === 0) return [];

  const scored: ScoredEntry[] = index.entries
    // Scope to the active workspace (entries written before workspaces default in).
    .filter(e => (e.workspace_id ?? DEFAULT_WORKSPACE_ID) === workspaceId)
    .map(entry => {
      const score = cosine(queryVector, entry.vector);
      const importance = entry.importance ?? 0.5;
      const confidence = entry.confidence ?? 0.5;
      const recency = recencyScore(entry.created_at);
      // Relevance dominates; importance/confidence/recency refine the order.
      const rank = score * 0.6 + importance * 0.2 + confidence * 0.1 + recency * 0.1;
      return { entry, score, rank };
    });

  // Filter on raw relevance (noise gate), then order by the composite rank.
  return scored
    .filter(s => s.score >= minScore)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, topK);
}

export function addToIndex(index: VectorIndex, entry: VectorEntry): VectorIndex {
  const existing = index.entries.findIndex(e => e.blob_id === entry.blob_id);
  const entries =
    existing >= 0
      ? [...index.entries.slice(0, existing), entry, ...index.entries.slice(existing + 1)]
      : [...index.entries, entry];

  return { ...index, entries, updated_at: new Date().toISOString() };
}

export function emptyIndex(userId: string): VectorIndex {
  return { user_id: userId, entries: [], updated_at: new Date().toISOString() };
}
