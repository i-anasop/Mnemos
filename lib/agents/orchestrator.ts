import { runResearcher } from './researcher';
import { runSynthesizer } from './synthesizer';
import { storeMemory, retrieveMemory } from '@/lib/walrus/memory';
import type { ScoredEntry } from '@/lib/walrus/memory';
import type { AgentEvent, MemoryBlob, MemoryRetrieval, ResearchReport, SynthesisDocument } from '@/types';

export type Emitter = (event: AgentEvent) => void;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extracts the human-readable title from a memory blob.
 * Used in the memory_selected SSE event so the UI can label each retrieval.
 */
function extractBlobTitle(blob: MemoryBlob): string {
  if (blob.type === 'synthesis_document') {
    const doc = blob.content as Partial<SynthesisDocument>;
    if (doc.themes?.[0]?.label) return doc.themes[0].label;
    if (doc.synthesis_goal) return doc.synthesis_goal.replace(/^Synthesize findings on:\s*/i, '');
  }
  if (blob.type === 'research_report') {
    const report = blob.content as Partial<ResearchReport>;
    if (report.question) return report.question;
  }
  return blob.type;
}

/**
 * Generates a plain-English reason string for why this blob was selected.
 * Shown in the memory_selected event and visible in the agent feed UI.
 */
function buildRetrievalReason(score: number, blob: MemoryBlob): string {
  const parts: string[] = [];

  if (score >= 0.90)      parts.push('high semantic match');
  else if (score >= 0.75) parts.push('strong topic alignment');
  else if (score >= 0.60) parts.push('related findings');
  else                    parts.push('partial relevance');

  const daysSince = (Date.now() - new Date(blob.created_at).getTime()) / 86_400_000;
  if (daysSince < 1)       parts.push('from today');
  else if (daysSince < 7)  parts.push(`${Math.floor(daysSince)}d ago`);
  else if (daysSince < 30) parts.push(`${Math.floor(daysSince)}d old`);

  const conf = (blob.content as { confidence?: number }).confidence;
  if (typeof conf === 'number' && conf >= 0.85) {
    parts.push(`${(conf * 100).toFixed(0)}% confidence`);
  }

  return parts.join(' · ');
}

/**
 * Converts a memory blob into clean, structured text the researcher can use.
 *
 * Previously the orchestrator cast SynthesisDocument to ResearchReport, then
 * tried to access `.findings` which was always undefined, falling back to a
 * 300-char JSON fragment. This function extracts the actual useful fields.
 */
function extractMemoryContext(blob: MemoryBlob): string {
  const lines: string[] = [];

  if (blob.type === 'synthesis_document') {
    const doc = blob.content as Partial<SynthesisDocument>;

    const topic = doc.synthesis_goal?.replace(/^Synthesize findings on:\s*/i, '') ?? 'prior research';
    lines.push(`[Prior session: ${blob.session_id || 'unknown'} | confidence: ${typeof doc.confidence === 'number' ? `${(doc.confidence * 100).toFixed(0)}%` : 'unknown'}]`);
    lines.push(`Topic: ${topic}`);

    if (doc.themes?.length) {
      lines.push('Key conclusions:');
      for (const theme of doc.themes.slice(0, 4)) {
        lines.push(`- ${theme.label}`);
        for (const finding of (theme.supporting_findings ?? []).slice(0, 2)) {
          lines.push(`  · ${finding}`);
        }
      }
    }

    if (doc.knowledge_gaps?.length) {
      lines.push(`Open questions: ${doc.knowledge_gaps.slice(0, 3).join('; ')}`);
    }

    if (doc.contradictions?.length) {
      lines.push(`Contradictions noted: ${doc.contradictions.slice(0, 2).map(c => c.claim_a).join('; ')}`);
    }

    return lines.join('\n');
  }

  if (blob.type === 'research_report') {
    const report = blob.content as Partial<ResearchReport>;

    lines.push(`[Prior research: ${blob.session_id || 'unknown'} | confidence: ${typeof report.confidence === 'number' ? `${(report.confidence * 100).toFixed(0)}%` : 'unknown'}]`);
    if (report.question) lines.push(`Question: ${report.question}`);

    if (report.findings?.length) {
      lines.push('Findings:');
      for (const f of report.findings.slice(0, 5)) {
        lines.push(`- ${f.claim}`);
      }
    }

    return lines.join('\n');
  }

  // Fallback for any future blob types
  return `[Prior memory: ${blob.type}]\n${JSON.stringify(blob.content).slice(0, 400)}`;
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export async function runOrchestrator(params: {
  query: string;
  session_id: string;
  user_id: string;
  emit: Emitter;
}): Promise<{ synthesis: SynthesisDocument; blob_id?: string }> {
  const { query, session_id, user_id, emit } = params;
  const start = Date.now();

  emit({ event: 'session_start', session_id });

  // ── Phase 1: Retrieve prior memory ────────────────────────────────────────
  let memoryBlobs: MemoryBlob[] = [];
  let memoryScoredEntries: ScoredEntry[] = [];

  try {
    const { blobs, blobIds, scored } = await retrieveMemory({ query, user_id, top_k: 5 });

    if (blobs.length > 0) {
      memoryBlobs = blobs;
      memoryScoredEntries = scored;

      emit({ event: 'memory_loaded', count: blobs.length, session_id });

      // Emit per-blob retrieval explanation (P3)
      const retrievals: MemoryRetrieval[] = blobs.map((blob, i) => ({
        blob_id: blobIds[i],
        session_id: blob.session_id,
        title: extractBlobTitle(blob),
        cosine_score: memoryScoredEntries[i].score,
        confidence: (blob.content as { confidence?: number }).confidence ?? 0,
        reason: buildRetrievalReason(memoryScoredEntries[i].score, blob),
      }));
      emit({ event: 'memory_selected', retrievals });
    } else {
      emit({ event: 'memory_empty', session_id });
    }
  } catch {
    emit({ event: 'walrus_warning', message: 'Memory retrieval failed — starting fresh' });
  }

  // ── Phase 2: Research ─────────────────────────────────────────────────────
  emit({ event: 'research_start', question: query });

  // Build structured context from retrieved blobs (P1 fix)
  const memoryContext =
    memoryBlobs.length > 0
      ? memoryBlobs.slice(0, 3).map(extractMemoryContext).join('\n\n---\n\n')
      : undefined;

  const report = await runResearcher({
    question: query,
    context: memoryContext,
    depth: 'deep',
    session_id,
  });

  emit({
    event: 'research_complete',
    confidence: report.confidence,
    findings_count: report.findings.length,
  });

  // ── Phase 3: Synthesize ───────────────────────────────────────────────────
  emit({ event: 'synthesis_start' });

  // Pass memory blobs as their actual content — the synthesizer uses them as
  // JSON context for comparison, not as typed ResearchReport structs
  const memoryReports = memoryBlobs.map(b => b.content as unknown as ResearchReport);

  const synthesis = await runSynthesizer({
    current_reports: [report],
    memory_reports: memoryReports,
    synthesis_goal: `Synthesize findings on: ${query}`,
    session_id,
  });

  emit({
    event: 'synthesis_complete',
    confidence: synthesis.confidence,
    confidence_delta: synthesis.confidence_delta,
    themes: synthesis.themes.map(t => t.label),
  });

  // ── Phase 4: Persist to Walrus ────────────────────────────────────────────
  let blob_id: string | undefined;
  emit({ event: 'memory_committing' });

  try {
    blob_id = await storeMemory({
      content: synthesis as unknown as Record<string, unknown>,
      type: 'synthesis_document',
      tags: [query.split(' ').slice(0, 3).join('-'), session_id],
      session_id,
      user_id,
    });
    emit({ event: 'memory_committed', blob_id, type: 'synthesis_document' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    emit({ event: 'walrus_warning', message: `Memory commit failed: ${msg}` });
  }

  const duration_ms = Date.now() - start;
  emit({
    event: 'session_complete',
    summary: `Synthesized ${synthesis.themes.length} themes from ${report.findings.length} findings. Confidence: ${(synthesis.confidence * 100).toFixed(0)}%.`,
    duration_ms,
    blob_id,
  });

  return { synthesis, blob_id };
}
