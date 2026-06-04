import { runResearcher } from './researcher';
import { runSynthesizer } from './synthesizer';
import { runConversationalReply } from './responder';
import { triageMessage, decideMemory, decideMemoryFromMessage, decideProfileFact, isIntentWithoutValue, isProfileQuery, attemptedNameIntro, keywordTags } from './memory-extractor';
import { storeMemory, retrieveMemory } from '@/lib/walrus/memory';
import type { ScoredEntry } from '@/lib/walrus/memory';
import {
  loadProfile, persistProfileLocal, saveProfile, mergeProfile, emptyProfile,
  confirmProfileUpdate, answerProfileQuery, isEmptyProfile,
} from '@/lib/profile/store';
import { DEFAULT_WORKSPACE_ID, getWorkspace } from '@/lib/workspace';
import type { AgentEvent, MemoryBlob, MemoryRetrieval, ResearchReport, SynthesisDocument } from '@/types';

export type Emitter = (event: AgentEvent) => void;

/**
 * Stores a memory with one retry on transient Walrus failure.
 *
 * storeMemory is atomic from the caller's view — it only returns a blob_id
 * once the blob AND the index write succeed. If the first attempt throws, the
 * index was not updated, so retrying cannot create a duplicate memory.
 * Emits walrus_retrying before the second attempt; the caller emits
 * memory_committed on success or walrus_warning on final failure.
 */
async function storeWithRetry(
  params: Parameters<typeof storeMemory>[0],
  emit: Emitter,
): Promise<string> {
  try {
    return await storeMemory(params);
  } catch {
    emit({ event: 'walrus_retrying', attempt: 2 });
    await new Promise((r) => setTimeout(r, 800));
    return await storeMemory(params); // throws to caller if it fails again
  }
}

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

  // Confidence is surfaced as its own chip in the UI — don't duplicate it here.
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
  workspace_id?: string;
  emit: Emitter;
}): Promise<{ synthesis?: SynthesisDocument; blob_id?: string; casual?: string }> {
  const { query, session_id, user_id, emit } = params;
  const workspace_id = params.workspace_id ?? DEFAULT_WORKSPACE_ID;
  const start = Date.now();

  emit({ event: 'session_start', session_id, workspace_id });
  const workspaceLabel = getWorkspace(workspace_id).label;

  const triage = triageMessage(query);

  // ── Casual: greeting / acknowledgement → quick reply, no memory, no store ──
  if (triage.mode === 'casual') {
    const text = await runConversationalReply({ message: query, workspaceLabel, casual: true });
    emit({ event: 'casual_reply', text });
    emit({ event: 'memory_skipped', reason: triage.reason });
    emit({
      event: 'session_complete',
      summary: 'Casual reply.',
      duration_ms: Date.now() - start,
      reply_mode: 'casual',
      casual: { text },
    });
    return { casual: text };
  }

  // ── Conversational: normal chat / meta / follow-up / identity ─────────────
  if (triage.mode === 'conversational') {
    // The stable profile object is the ground truth for identity. It's loaded
    // from local-authoritative storage (no Walrus read), so recall is instant
    // and reliable — independent of vector search and testnet flakiness.
    const profile = await loadProfile(user_id, workspace_id).catch(() => null);

    // ── (a) Storing path: the message states durable profile facts ──────────
    const profileDecision = isIntentWithoutValue(query) ? null : decideProfileFact(query);
    if (profileDecision?.facts) {
      const facts = profileDecision.facts;

      // Merge + persist LOCALLY first (instant) so the next turn ("who am I?")
      // recalls it even before Walrus responds. This kills the recall race.
      const existing = profile ?? emptyProfile(user_id, workspace_id);
      let merged = mergeProfile(existing, facts);
      await persistProfileLocal(merged);

      // Deterministic confirmation — never an LLM, so it's always exactly right.
      const reply = confirmProfileUpdate(facts);
      emit({ event: 'memory_decision', decision: profileDecision });
      emit({ event: 'casual_reply', text: reply });
      emit({
        event: 'session_complete',
        summary: 'Profile updated.',
        duration_ms: Date.now() - start,
        reply_mode: 'casual',
        casual: { text: reply },
      });

      // Durable artifact + Walrus mirror, AFTER the answer is already on screen.
      emit({ event: 'memory_committing' });
      let artifactBlobId: string | undefined;
      try {
        artifactBlobId = await storeWithRetry({
          content: { statement: query, summary: profileDecision.summary, facts, confidence: profileDecision.importance },
          type: 'session_snapshot',
          tags: profileDecision.tags?.length ? profileDecision.tags : keywordTags(query),
          session_id, user_id, workspace_id,
          memory_type: 'profile_fact',
          importance: profileDecision.importance,
          summary: profileDecision.summary,
        }, emit);
      } catch {
        // Walrus artifact write failed — the profile is still saved locally.
      }
      merged = mergeProfile(merged, {}, artifactBlobId);
      const { walrusBlobId } = await saveProfile(merged);

      const proof = artifactBlobId ?? walrusBlobId;
      if (proof) {
        emit({ event: 'memory_committed', blob_id: proof, type: 'profile', memory_type: 'profile_fact', importance: profileDecision.importance });
      } else {
        emit({ event: 'walrus_warning', message: 'Saved to your profile (local) — Walrus sync pending on testnet.' });
      }
      return { casual: reply, blob_id: proof };
    }

    // ── (b) Recall path: identity/profile question → answer from the object ──
    if (isProfileQuery(query)) {
      const reply = answerProfileQuery(profile, query);
      if (!isEmptyProfile(profile)) emit({ event: 'memory_loaded', count: 1, session_id });
      else emit({ event: 'memory_empty', session_id });
      emit({ event: 'casual_reply', text: reply });
      emit({
        event: 'session_complete',
        summary: 'Identity recall.',
        duration_ms: Date.now() - start,
        reply_mode: 'casual',
        casual: { text: reply },
      });
      emit({ event: 'memory_skipped', reason: 'Recall question — retrieves profile, stores nothing.' });
      return { casual: reply };
    }

    // ── (b2) Invalid name attempt: "my name is user/me" → reject deterministically
    // (never let the LLM falsely claim it stored a placeholder name). ──────────
    if (attemptedNameIntro(query)) {
      const reply = "That doesn't look like a name I can store — what would you like me to call you?";
      emit({ event: 'casual_reply', text: reply });
      emit({
        event: 'session_complete',
        summary: 'Invalid name — not stored.',
        duration_ms: Date.now() - start,
        reply_mode: 'casual',
        casual: { text: reply },
      });
      emit({ event: 'memory_skipped', reason: 'Invalid/placeholder name — not stored.' });
      return { casual: reply };
    }

    // ── (c) General conversation: semantic memory + profile context → LLM ───
    let convoMemories: MemoryBlob[] = [];
    try {
      const { blobs, blobIds, scored } = await retrieveMemory({ query, user_id, top_k: 4, workspace_id, min_relevance: 0.22 });
      convoMemories = blobs;
      if (blobs.length > 0) {
        emit({ event: 'memory_loaded', count: blobs.length, session_id });
        const retrievals: MemoryRetrieval[] = blobs.map((blob, i) => ({
          blob_id: blobIds[i],
          session_id: blob.session_id,
          workspace_id: blob.workspace_id ?? workspace_id,
          title: extractBlobTitle(blob),
          cosine_score: scored[i].score,
          confidence: (blob.content as { confidence?: number }).confidence ?? blob.importance ?? 0,
          importance: blob.importance,
          memory_type: blob.memory_type,
          reason: buildRetrievalReason(scored[i].score, blob),
        }));
        emit({ event: 'memory_selected', retrievals });
      } else if (isEmptyProfile(profile)) {
        emit({ event: 'memory_empty', session_id });
      }
    } catch {
      emit({ event: 'walrus_warning', message: 'Memory retrieval failed — replying without it' });
    }

    const text = await runConversationalReply({ message: query, memories: convoMemories, profile, workspaceLabel });
    emit({ event: 'casual_reply', text });
    emit({
      event: 'session_complete',
      summary: 'Conversational reply.',
      duration_ms: Date.now() - start,
      reply_mode: 'casual',
      casual: { text },
    });

    // Assess the message for NON-profile durable knowledge (decisions, prefs…).
    const msgDecision = await decideMemoryFromMessage(query);
    emit({ event: 'memory_decision', decision: msgDecision });
    let convo_blob_id: string | undefined;
    if (msgDecision.should_store) {
      emit({ event: 'memory_committing' });
      try {
        convo_blob_id = await storeWithRetry({
          content: { statement: query, summary: msgDecision.summary, confidence: msgDecision.importance },
          type: 'session_snapshot',
          tags: msgDecision.tags?.length ? msgDecision.tags : keywordTags(query),
          session_id, user_id, workspace_id,
          memory_type: msgDecision.memory_type,
          importance: msgDecision.importance,
          summary: msgDecision.summary,
        }, emit);
        emit({ event: 'memory_committed', blob_id: convo_blob_id, type: 'session_snapshot', memory_type: msgDecision.memory_type, importance: msgDecision.importance });
      } catch (err) {
        emit({ event: 'walrus_warning', message: `Memory commit failed after retry: ${err instanceof Error ? err.message : 'error'}` });
      }
    } else {
      emit({ event: 'memory_skipped', reason: msgDecision.reason });
    }

    return { casual: text, blob_id: convo_blob_id };
  }

  // ── Research: full multi-agent pipeline ───────────────────────────────────
  // ── Phase 1: Retrieve prior memory (scoped to the active workspace) ───────
  let memoryBlobs: MemoryBlob[] = [];
  let memoryScoredEntries: ScoredEntry[] = [];

  try {
    const { blobs, blobIds, scored } = await retrieveMemory({ query, user_id, top_k: 5, workspace_id });

    if (blobs.length > 0) {
      memoryBlobs = blobs;
      memoryScoredEntries = scored;

      emit({ event: 'memory_loaded', count: blobs.length, session_id });

      const retrievals: MemoryRetrieval[] = blobs.map((blob, i) => ({
        blob_id: blobIds[i],
        session_id: blob.session_id,
        workspace_id: blob.workspace_id ?? workspace_id,
        title: extractBlobTitle(blob),
        cosine_score: memoryScoredEntries[i].score,
        confidence: (blob.content as { confidence?: number }).confidence ?? blob.importance ?? 0,
        importance: blob.importance,
        memory_type: blob.memory_type,
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

  const memoryReports = memoryBlobs.slice(0, 3).map(b => b.content as unknown as ResearchReport);

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

  // ── Phase 4: Memory decision — is this worth remembering? ─────────────────
  const decision = await decideMemory({ query, synthesis });
  emit({ event: 'memory_decision', decision });

  // Show the answer to the user *now*. Storage to Walrus (a few network
  // round-trips) then happens after, so the user never waits on it. The UI
  // renders the answer on session_complete and patches the Walrus receipt in
  // when memory_committed arrives.
  const duration_ms = Date.now() - start;
  emit({
    event: 'session_complete',
    summary: `Synthesized ${synthesis.themes.length} themes from ${report.findings.length} findings. Confidence: ${(synthesis.confidence * 100).toFixed(0)}%.`,
    duration_ms,
    synthesis,
    reply_mode: 'research',
  });

  // ── Phase 5: Persist (after the answer is already on screen) ──────────────
  let blob_id: string | undefined;
  if (decision.should_store) {
    emit({ event: 'memory_committing' });
    try {
      blob_id = await storeWithRetry({
        content: synthesis as unknown as Record<string, unknown>,
        type: 'synthesis_document',
        tags: decision.tags && decision.tags.length > 0 ? decision.tags : keywordTags(query),
        session_id,
        user_id,
        workspace_id,
        memory_type: decision.memory_type,
        importance: decision.importance,
        summary: decision.summary,
      }, emit);
      emit({
        event: 'memory_committed',
        blob_id,
        type: 'synthesis_document',
        memory_type: decision.memory_type,
        importance: decision.importance,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      emit({ event: 'walrus_warning', message: `Memory commit failed after retry: ${msg}` });
    }
  } else {
    emit({ event: 'memory_skipped', reason: decision.reason });
  }

  return { synthesis, blob_id };
}
