const VOYAGE_API = 'https://api.voyageai.com/v1/embeddings';
const MODEL = 'voyage-3-lite';

// Free-tier Voyage allows only 3 requests/minute. A burst of stores/retrievals
// trips a 429. Rather than fail the memory write outright, back off and retry a
// couple of times so the engine degrades gracefully under the rate limit.
const RETRY_DELAYS_MS = [4000, 12000, 20000];

export async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error('VOYAGE_API_KEY is not set');

  let lastErr = '';
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const res = await fetch(VOYAGE_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: [text], model: MODEL }),
    });

    if (res.ok) {
      const json = await res.json() as VoyageResponse;
      return json.data[0].embedding;
    }

    lastErr = `${res.status} ${await res.text()}`;
    // Only retry on rate-limit (429) or transient server errors (5xx).
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === RETRY_DELAYS_MS.length) break;
    await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
  }

  throw new Error(`Voyage embed failed: ${lastErr}`);
}

interface VoyageResponse {
  data: Array<{ embedding: number[] }>;
}
