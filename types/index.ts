// ─── Memory Blob Types ───────────────────────────────────────────────────────

export type MemoryBlobType =
  | 'session_snapshot'
  | 'research_report'
  | 'synthesis_document'
  | 'embedding_index';

// Semantic category of a stored memory (independent of the structural blob type).
export type MemoryType =
  | 'decision'
  | 'architecture'
  | 'research'
  | 'preference'
  | 'plan'
  | 'insight'
  | 'summary'
  | 'constraint'
  | 'incident'
  | 'general';

export interface MemoryBlob {
  schema_version: '1.0';
  type: MemoryBlobType;
  workspace_id: string;
  session_id: string;
  user_id: string;
  created_at: string;
  tags: string[];
  embedding_id?: string;
  // Memory-extraction metadata (present on intelligently-stored memories)
  memory_type?: MemoryType;
  importance?: number;
  summary?: string;
  content: Record<string, unknown>;
}

export interface BlobMetadata {
  blob_id: string;
  type: MemoryBlobType;
  workspace_id: string;
  session_id: string;
  created_at: string;
  tags: string[];
  memory_type?: MemoryType;
  importance?: number;
  summary?: string;
  preview?: string;
}

// ─── Vector Index ────────────────────────────────────────────────────────────

export interface VectorEntry {
  blob_id: string;
  vector: number[];
  type: MemoryBlobType;
  tags: string[];
  created_at: string;
  session_id?: string;
  confidence?: number;
  workspace_id?: string;
  memory_type?: MemoryType;
  importance?: number;
  summary?: string;
}

export interface VectorIndex {
  user_id: string;
  entries: VectorEntry[];
  updated_at: string;
}

// ─── Agent Task/Report Types ─────────────────────────────────────────────────

export interface ResearchTask {
  question: string;
  context?: string;
  depth: 'shallow' | 'deep';
  session_id: string;
}

export interface Finding {
  claim: string;
  evidence: string;
  relevance: number;
}

export interface ResearchReport {
  question: string;
  findings: Finding[];
  confidence: number;
  reasoning_trace: string;
  timestamp: string;
  agent: 'researcher';
}

export interface Theme {
  label: string;
  supporting_findings: string[];
  strength: number;
}

export interface Contradiction {
  claim_a: string;
  claim_b: string;
  resolution?: string;
}

export interface SynthesisTask {
  current_reports: ResearchReport[];
  memory_reports: ResearchReport[];
  synthesis_goal: string;
  session_id: string;
}

export interface SynthesisDocument {
  synthesis_goal: string;
  themes: Theme[];
  knowledge_gaps: string[];
  contradictions: Contradiction[];
  confidence: number;
  confidence_delta: number;
  session_id: string;
  agent: 'synthesizer';
}

// ─── SSE Agent Events ────────────────────────────────────────────────────────

export interface MemoryRetrieval {
  blob_id: string;
  session_id: string;
  workspace_id: string;
  title: string;
  cosine_score: number;
  confidence: number;
  importance?: number;
  memory_type?: MemoryType;
  reason: string;
}

// Structured output of the memory-extraction / decision step.
export interface MemoryDecision {
  should_store: boolean;
  memory_type?: MemoryType;
  importance?: number;       // 0..1
  summary?: string;
  reason: string;
  tags?: string[];
}

// What kind of reply the engine produced.
export type ReplyMode = 'casual' | 'research';

export interface CasualAnswer {
  text: string;
}

export type AgentEvent =
  | { event: 'session_start';      session_id: string; workspace_id: string }
  | { event: 'memory_loaded';      count: number; session_id: string }
  | { event: 'memory_empty';       session_id: string }
  | { event: 'memory_selected';    retrievals: MemoryRetrieval[] }
  | { event: 'research_start';     question: string }
  | { event: 'research_complete';  confidence: number; findings_count: number }
  | { event: 'synthesis_start' }
  | { event: 'synthesis_complete'; confidence: number; confidence_delta: number; themes: string[] }
  | { event: 'memory_decision';    decision: MemoryDecision }
  | { event: 'memory_committing' }
  | { event: 'memory_committed';   blob_id: string; type: string; memory_type?: MemoryType; importance?: number }
  | { event: 'memory_skipped';     reason: string }
  | { event: 'walrus_warning';     message: string }
  | { event: 'casual_reply';       text: string }
  | { event: 'session_complete';   summary: string; duration_ms: number; blob_id?: string; synthesis?: SynthesisDocument; reply_mode: ReplyMode; casual?: CasualAnswer }
  | { event: 'error';              message: string; recoverable: boolean };

// ─── Session ─────────────────────────────────────────────────────────────────

export type WorkflowStatus = 'idle' | 'running' | 'complete' | 'error';

export interface Session {
  id: string;
  user_id: string;
  query: string;
  status: WorkflowStatus;
  created_at: string;
  blob_ids: string[];
  last_confidence?: number;
}

// ─── API Payloads ────────────────────────────────────────────────────────────

export interface AgentRequestBody {
  query: string;
  session_id: string;
  user_id: string;
  workspace_id?: string;
}

export interface MemoryResponseItem {
  metadata: BlobMetadata;
  content: Record<string, unknown>;
}
