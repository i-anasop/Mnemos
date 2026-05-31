import { walrusStore, walrusFetchJSON } from './client';
import { embed } from '@/lib/embeddings/voyage';
import { searchVectors, addToIndex, emptyIndex } from '@/lib/embeddings/search';
import type { ScoredEntry } from '@/lib/embeddings/search';
import type { MemoryBlob, MemoryBlobType, MemoryType, VectorIndex, BlobMetadata } from '@/types';
import { DEFAULT_WORKSPACE_ID } from '@/lib/workspace';
import { promises as fs } from 'fs';
import path from 'path';

export type { ScoredEntry };

// Local pointer registry: maps userId → latestIndexBlobId
// The actual index data lives on Walrus; this file is just the lookup key.
const REGISTRY_PATH = path.join(process.cwd(), 'data', 'registry.json');

// In-memory index cache: userId → { index, blobId }
const indexCache = new Map<string, { index: VectorIndex; blobId: string | null }>();

async function readRegistry(): Promise<Record<string, string>> {
  try {
    const text = await fs.readFile(REGISTRY_PATH, 'utf-8');
    return JSON.parse(text) as Record<string, string>;
  } catch {
    return {};
  }
}

async function writeRegistry(userId: string, blobId: string): Promise<void> {
  try {
    const reg = await readRegistry();
    reg[userId] = blobId;
    await fs.mkdir(path.dirname(REGISTRY_PATH), { recursive: true });
    await fs.writeFile(REGISTRY_PATH, JSON.stringify(reg, null, 2), 'utf-8');
  } catch {
    // Non-fatal: index is still in memory and on Walrus
  }
}

async function loadIndex(userId: string): Promise<{ index: VectorIndex; blobId: string | null }> {
  if (indexCache.has(userId)) return indexCache.get(userId)!;

  // Rehydrate from Walrus using the local pointer registry
  const reg = await readRegistry();
  const indexBlobId = reg[userId];
  if (indexBlobId) {
    try {
      const index = await walrusFetchJSON<VectorIndex>(indexBlobId);
      const entry = { index, blobId: indexBlobId };
      indexCache.set(userId, entry);
      return entry;
    } catch {
      // Walrus fetch failed (transient) — fall through to empty
    }
  }

  const empty = { index: emptyIndex(userId), blobId: null };
  indexCache.set(userId, empty);
  return empty;
}

async function saveIndex(userId: string, index: VectorIndex): Promise<string> {
  const blobId = await walrusStore(JSON.stringify(index));
  indexCache.set(userId, { index, blobId });
  await writeRegistry(userId, blobId);
  return blobId;
}

export async function storeMemory(params: {
  content: Record<string, unknown>;
  type: MemoryBlobType;
  tags: string[];
  session_id: string;
  user_id: string;
  workspace_id?: string;
  // Memory-extraction metadata (what makes this a curated artifact, not raw chat)
  memory_type?: MemoryType;
  importance?: number;
  summary?: string;
}): Promise<string> {
  const { content, type, tags, session_id, user_id, memory_type, importance, summary } = params;
  const workspace_id = params.workspace_id ?? DEFAULT_WORKSPACE_ID;

  const blob: MemoryBlob = {
    schema_version: '1.0',
    type,
    workspace_id,
    session_id,
    user_id,
    created_at: new Date().toISOString(),
    tags,
    memory_type,
    importance,
    summary,
    content,
  };

  // Embed for semantic retrieval. Prefer the human summary (cleaner signal) and
  // fall back to the raw content payload. The vector is persisted inside the
  // VectorIndex (below), so we do NOT store a separate embedding blob — that
  // was an unused extra Walrus round-trip on every save.
  const embeddingText = (summary ? `${summary}\n` : '') + JSON.stringify(content).slice(0, 4000);
  const vector = await embed(embeddingText);

  // Store memory blob
  const blobId = await walrusStore(JSON.stringify(blob));

  const confidence = typeof content.confidence === 'number' ? content.confidence : importance;

  // Update and persist vector index with full retrieval metadata.
  const { index } = await loadIndex(user_id);
  const updated = addToIndex(index, {
    blob_id: blobId,
    vector,
    type,
    tags,
    created_at: blob.created_at,
    session_id,
    confidence,
    workspace_id,
    memory_type,
    importance,
    summary,
  });
  await saveIndex(user_id, updated);

  return blobId;
}

// Minimum cosine similarity for a memory to count as "relevant". Below this,
// a match is noise (e.g. "Hi" weakly correlating with stored research at ~0.1).
const MIN_RELEVANCE = Number(process.env.MNEMOS_MIN_RELEVANCE ?? 0.4);

export async function retrieveMemory(params: {
  query: string;
  user_id: string;
  top_k?: number;
  workspace_id?: string;
  min_relevance?: number;
}): Promise<{ blobs: MemoryBlob[]; blobIds: string[]; scored: ScoredEntry[] }> {
  const { query, user_id, top_k = 5 } = params;
  const workspace_id = params.workspace_id ?? DEFAULT_WORKSPACE_ID;
  const minRelevance = params.min_relevance ?? MIN_RELEVANCE;

  const { index } = await loadIndex(user_id);
  if (index.entries.length === 0) return { blobs: [], blobIds: [], scored: [] };

  const queryVector = await embed(query);
  const nearest = searchVectors(index, queryVector, top_k, minRelevance, workspace_id);
  if (nearest.length === 0) return { blobs: [], blobIds: [], scored: [] };

  const fetched = await Promise.all(
    nearest.map(async ({ entry }) => {
      try {
        return await walrusFetchJSON<MemoryBlob>(entry.blob_id);
      } catch {
        return null;
      }
    })
  );

  // Keep only successfully fetched blobs, preserving alignment with scored entries
  const valid = fetched.flatMap((b, i) => (b ? [{ blob: b, scored: nearest[i] }] : []));
  return {
    blobs: valid.map(v => v.blob),
    blobIds: valid.map(v => v.scored.entry.blob_id),
    scored: valid.map(v => v.scored),
  };
}

export async function getUserBlobMetadata(userId: string, workspaceId?: string): Promise<BlobMetadata[]> {
  const { index } = await loadIndex(userId);
  return index.entries
    .filter(entry =>
      !workspaceId || (entry.workspace_id ?? DEFAULT_WORKSPACE_ID) === workspaceId)
    .map(entry => ({
      blob_id: entry.blob_id,
      type: entry.type,
      workspace_id: entry.workspace_id ?? DEFAULT_WORKSPACE_ID,
      session_id: entry.session_id ?? '',
      created_at: entry.created_at,
      tags: entry.tags,
      memory_type: entry.memory_type,
      importance: entry.importance,
      summary: entry.summary,
    }));
}

export async function fetchMemoryBlob(blobId: string): Promise<MemoryBlob> {
  return walrusFetchJSON<MemoryBlob>(blobId);
}

export async function seedIndex(userId: string, indexBlobId: string): Promise<void> {
  try {
    const index = await walrusFetchJSON<VectorIndex>(indexBlobId);
    indexCache.set(userId, { index, blobId: indexBlobId });
    await writeRegistry(userId, indexBlobId);
  } catch {
    // ignore — start fresh
  }
}

export async function getRawIndexBlobId(userId: string): Promise<string | null> {
  const cached = indexCache.get(userId);
  return cached?.blobId ?? null;
}

export async function getRegistryState(): Promise<Record<string, string>> {
  return readRegistry();
}
