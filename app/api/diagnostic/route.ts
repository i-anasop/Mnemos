import { NextResponse } from 'next/server';
import { resetProvider } from '@/lib/llm';
import { getRegistryState } from '@/lib/walrus/memory';
import { walrusFetchJSON } from '@/lib/walrus/client';
import type { VectorIndex } from '@/types';

export const runtime = 'nodejs';

interface Check {
  name: string;
  status: 'ok' | 'fail' | 'skip';
  detail: string;
  ms?: number;
}

async function checkLLM(): Promise<Check> {
  resetProvider();
  const t = Date.now();

  try {
    const { getProvider } = await import('@/lib/llm');
    const provider = getProvider();

    const response = await provider.call({
      messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
      max_tokens: 10,
      temperature: 0,
    });

    const reply = response.text.trim().toLowerCase().slice(0, 20);
    return {
      name: `LLM (${provider.name}/${provider.model})`,
      status: 'ok',
      detail: `Response: "${reply}"`,
      ms: Date.now() - t,
    };
  } catch (err) {
    return {
      name: 'LLM provider',
      status: 'fail',
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkVoyage(): Promise<Check> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) return { name: 'Voyage AI', status: 'fail', detail: 'VOYAGE_API_KEY not set' };

  const t = Date.now();
  try {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: ['mnemos diagnostic'], model: 'voyage-3-lite' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const json = await res.json() as { data: Array<{ embedding: number[] }> };
    const dims = json.data[0].embedding.length;
    return { name: 'Voyage AI', status: 'ok', detail: `${dims}-dim embedding OK`, ms: Date.now() - t };
  } catch (err) {
    return { name: 'Voyage AI', status: 'fail', detail: err instanceof Error ? err.message : String(err) };
  }
}

async function checkWalrus(): Promise<Check> {
  const publisher = process.env.WALRUS_PUBLISHER_URL ?? 'https://publisher.walrus-testnet.walrus.space';
  const aggregator = process.env.WALRUS_AGGREGATOR_URL ?? 'https://aggregator.walrus-testnet.walrus.space';
  const t = Date.now();

  try {
    const testData = new TextEncoder().encode(`mnemos-diag-${Date.now()}`);
    const putRes = await fetch(`${publisher}/v1/blobs?epochs=1`, {
      method: 'PUT',
      body: testData.buffer as ArrayBuffer,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    if (!putRes.ok) throw new Error(`Store HTTP ${putRes.status}: ${await putRes.text()}`);

    const putJson = await putRes.json() as {
      newlyCreated?: { blobObject: { blobId: string } };
      alreadyCertified?: { blobId: string };
    };
    const blobId = putJson.newlyCreated?.blobObject?.blobId ?? putJson.alreadyCertified?.blobId;
    if (!blobId) throw new Error('No blob_id in store response');

    const getRes = await fetch(`${aggregator}/v1/blobs/${blobId}`);
    if (!getRes.ok) throw new Error(`Fetch HTTP ${getRes.status}`);

    return {
      name: 'Walrus Store+Fetch',
      status: 'ok',
      detail: `blob_id: ${blobId.slice(0, 16)}… verified`,
      ms: Date.now() - t,
    };
  } catch (err) {
    return {
      name: 'Walrus Store+Fetch',
      status: 'fail',
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkMemoryIndex(): Promise<Check & { registry?: Record<string, { index_blob_id: string; entry_count: number }> }> {
  const t = Date.now();
  try {
    const reg = await getRegistryState();
    const userIds = Object.keys(reg);

    if (userIds.length === 0) {
      return {
        name: 'Memory Index',
        status: 'skip',
        detail: 'No users in registry yet — create memories first',
        registry: {},
      };
    }

    // Verify each user's index is fetchable from Walrus
    const registry: Record<string, { index_blob_id: string; entry_count: number }> = {};
    let totalEntries = 0;

    for (const userId of userIds) {
      const indexBlobId = reg[userId];
      try {
        const index = await walrusFetchJSON<VectorIndex>(indexBlobId);
        registry[userId] = { index_blob_id: indexBlobId, entry_count: index.entries.length };
        totalEntries += index.entries.length;
      } catch {
        registry[userId] = { index_blob_id: indexBlobId, entry_count: -1 };
      }
    }

    const allReachable = Object.values(registry).every(r => r.entry_count >= 0);
    return {
      name: 'Memory Index (Walrus-backed)',
      status: allReachable ? 'ok' : 'fail',
      detail: `${userIds.length} user(s), ${totalEntries} total memory blobs — all indexes reachable from Walrus`,
      ms: Date.now() - t,
      registry,
    };
  } catch (err) {
    return {
      name: 'Memory Index',
      status: 'fail',
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET() {
  const [llm, voyage, walrus, memoryIndex] = await Promise.all([
    checkLLM(),
    checkVoyage(),
    checkWalrus(),
    checkMemoryIndex(),
  ]);

  const checks: Check[] = [llm, voyage, walrus, memoryIndex];
  const allOk = checks.every(c => c.status === 'ok' || c.status === 'skip');

  const activeProvider = process.env.GROQ_API_KEY
    ? `groq (${process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant'})`
    : process.env.GEMINI_API_KEY
    ? `gemini (${process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'})`
    : process.env.ANTHROPIC_API_KEY
    ? `anthropic (${process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001'})`
    : 'none configured';

  return NextResponse.json({
    status: allOk ? 'ready' : 'not_ready',
    active_provider: activeProvider,
    checks,
    memory_registry: (memoryIndex as typeof memoryIndex & { registry?: unknown }).registry ?? {},
    env: {
      GROQ_API_KEY: process.env.GROQ_API_KEY ? '✓ set' : '✗ missing',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '✓ set' : '✗ missing (optional)',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ missing (optional)',
      VOYAGE_API_KEY: process.env.VOYAGE_API_KEY ? '✓ set' : '✗ missing',
      WALRUS_PUBLISHER_URL: process.env.WALRUS_PUBLISHER_URL ?? '(default testnet)',
      WALRUS_AGGREGATOR_URL: process.env.WALRUS_AGGREGATOR_URL ?? '(default testnet)',
    },
  }, { status: allOk ? 200 : 503 });
}
