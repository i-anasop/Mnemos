import { NextRequest, NextResponse } from 'next/server';
import { embed } from '@/lib/embeddings/voyage';

export const runtime = 'nodejs';

// POST /api/embed
// Body: { text: string }
// Returns: { embedding: number[] }
export async function POST(req: NextRequest) {
  let body: { text: string };
  try {
    body = (await req.json()) as { text: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  try {
    const embedding = await embed(body.text);
    return NextResponse.json({ embedding, dimensions: embedding.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Embedding failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
