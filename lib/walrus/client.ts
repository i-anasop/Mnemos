const PUBLISHER = process.env.WALRUS_PUBLISHER_URL ?? 'https://publisher.walrus-testnet.walrus.space';
const AGGREGATOR = process.env.WALRUS_AGGREGATOR_URL ?? 'https://aggregator.walrus-testnet.walrus.space';
const DEFAULT_EPOCHS = 52;

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise(r => setTimeout(r, 500 * 2 ** i));
    }
  }
  throw new Error('unreachable');
}

export async function walrusStore(data: string | Uint8Array, epochs = DEFAULT_EPOCHS): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const body: BodyInit = bytes.buffer as ArrayBuffer;
  return withRetry(async () => {
    const res = await fetch(`${PUBLISHER}/v1/blobs?epochs=${epochs}`, {
      method: 'PUT',
      body,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    if (!res.ok) throw new Error(`Walrus store failed: ${res.status} ${await res.text()}`);
    const json = await res.json() as WalrusStoreResponse;
    return json.newlyCreated?.blobObject?.blobId ?? json.alreadyCertified?.blobId ?? '';
  });
}

export async function walrusFetch(blobId: string): Promise<Uint8Array> {
  return withRetry(async () => {
    const res = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`);
    if (!res.ok) throw new Error(`Walrus fetch failed: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  });
}

export async function walrusFetchText(blobId: string): Promise<string> {
  const bytes = await walrusFetch(blobId);
  return new TextDecoder().decode(bytes);
}

export async function walrusFetchJSON<T>(blobId: string): Promise<T> {
  const text = await walrusFetchText(blobId);
  return JSON.parse(text) as T;
}

export function aggregatorUrl(blobId: string): string {
  return `${AGGREGATOR}/v1/blobs/${blobId}`;
}

// Walrus REST response shapes
interface WalrusStoreResponse {
  newlyCreated?: { blobObject: { blobId: string } };
  alreadyCertified?: { blobId: string };
}
