import type { VectorEntry, VectorIndex } from '@/types';

export interface ScoredEntry {
  entry: VectorEntry;
  score: number;
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

export function searchVectors(
  index: VectorIndex,
  queryVector: number[],
  topK = 5,
): ScoredEntry[] {
  if (index.entries.length === 0) return [];

  const scored: ScoredEntry[] = index.entries.map(entry => ({
    entry,
    score: cosine(queryVector, entry.vector),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
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
