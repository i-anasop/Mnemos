import { NextRequest, NextResponse } from 'next/server';
import { getUserBlobMetadata, fetchMemoryBlob } from '@/lib/walrus/memory';
import type { MemoryResponseItem } from '@/types';

export const runtime = 'nodejs';

// GET /api/memory?user_id=...
// Returns the list of memory blob metadata for a user
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id');
  const workspaceId = req.nextUrl.searchParams.get('workspace_id') ?? undefined;
  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  const metadata = await getUserBlobMetadata(userId, workspaceId);
  return NextResponse.json({ blobs: metadata });
}

// POST /api/memory/blob
// Returns full content of a specific blob
export async function POST(req: NextRequest) {
  let body: { blob_id: string };
  try {
    body = (await req.json()) as { blob_id: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { blob_id } = body;
  if (!blob_id) {
    return NextResponse.json({ error: 'blob_id is required' }, { status: 400 });
  }

  try {
    const blob = await fetchMemoryBlob(blob_id);
    const item: MemoryResponseItem = {
      metadata: {
        blob_id,
        type: blob.type,
        workspace_id: blob.workspace_id ?? 'mnemos-demo',
        session_id: blob.session_id,
        created_at: blob.created_at,
        tags: blob.tags,
        memory_type: blob.memory_type,
        importance: blob.importance,
        summary: blob.summary,
      },
      content: blob.content,
    };
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: 'Blob not found' }, { status: 404 });
  }
}
