const VOYAGE_API = 'https://api.voyageai.com/v1/embeddings';
const MODEL = 'voyage-3-lite';

export async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error('VOYAGE_API_KEY is not set');

  const res = await fetch(VOYAGE_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: [text], model: MODEL }),
  });

  if (!res.ok) throw new Error(`Voyage embed failed: ${res.status} ${await res.text()}`);
  const json = await res.json() as VoyageResponse;
  return json.data[0].embedding;
}

interface VoyageResponse {
  data: Array<{ embedding: number[] }>;
}
