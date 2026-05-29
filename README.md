# Mnemos

**AI research orchestration with persistent, verifiable memory — powered by Walrus.**

Mnemos is a multi-agent research system where every session builds on prior knowledge. Memories are stored as blobs on [Walrus](https://walrus.xyz) (Sui's decentralized storage network), semantically indexed, and automatically rehydrated on startup. The agent gets smarter every session.

Built for [Sui Overflow 2026](https://suioverflow.com) — Walrus Track.

---

## How It Works

1. You submit a research question
2. The **Orchestrator** retrieves semantically similar prior memories from Walrus
3. The **Researcher** agent generates structured findings, informed by prior context
4. The **Synthesizer** agent cross-references new and prior findings, calculates a confidence delta
5. The synthesis is embedded (Voyage AI) and committed as a new blob on Walrus
6. The vector index is updated and persisted — memory survives server restarts

All memory data lives on Walrus testnet. The local `data/registry.json` is just a pointer (`userId → indexBlobId`) that tells the app where to find the index on startup.

---

## Quick Start

```bash
git clone <repo>
cd mnemos
npm install
cp .env.local.example .env.local
# fill in your keys (see below)
npm run dev
```

Open [http://localhost:3000/workspace](http://localhost:3000/workspace).

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Required | Where to get it |
|----------|----------|----------------|
| `GROQ_API_KEY` | Yes (free) | [console.groq.com](https://console.groq.com) |
| `VOYAGE_API_KEY` | Yes (free tier) | [dashboard.voyageai.com](https://dashboard.voyageai.com) |
| `WALRUS_PUBLISHER_URL` | Defaults to testnet | — |
| `WALRUS_AGGREGATOR_URL` | Defaults to testnet | — |
| `GEMINI_API_KEY` | Optional fallback | [aistudio.google.com](https://aistudio.google.com/apikey) |
| `ANTHROPIC_API_KEY` | Optional fallback | [console.anthropic.com](https://console.anthropic.com) |

LLM priority: **Groq → Gemini → Anthropic**. Only one is needed.

> **Note:** If using Gemini free tier, use a key from a project *without* billing enabled — billing zeroes out the free quota.

---

## Architecture

```
Browser (Next.js)
    │
    ├── /workspace          — 3-panel UI: Memory Explorer · Agent Feed · Blob Detail
    │
API Routes (Node.js runtime)
    │
    ├── POST /api/agent     — SSE stream, runs the full orchestration pipeline
    ├── GET  /api/memory    — Lists memory blob metadata for a user
    ├── POST /api/memory    — Fetches full blob content from Walrus
    ├── POST /api/embed     — Voyage AI embedding endpoint
    └── GET  /api/diagnostic — Health check: LLM + Voyage + Walrus + Memory Index
    │
Engine (lib/)
    ├── agents/
    │   ├── orchestrator.ts — 4-phase pipeline, SSE emitter, memory lifecycle
    │   ├── researcher.ts   — Structured JSON research reports (Zod-validated)
    │   └── synthesizer.ts  — Cross-session synthesis, confidence delta
    │
    ├── walrus/
    │   ├── client.ts       — REST wrapper: store, fetch, retry
    │   └── memory.ts       — MemoryStore: index cache, Walrus persistence, registry
    │
    ├── embeddings/
    │   ├── voyage.ts       — Voyage AI REST client (voyage-3-lite, 512-dim)
    │   └── search.ts       — Pure-JS cosine similarity, scored retrieval
    │
    ├── llm/
    │   ├── index.ts        — Provider factory (Groq → Gemini → Anthropic)
    │   ├── groq.ts         — Groq provider (llama-3.1-8b-instant)
    │   ├── gemini.ts       — Gemini provider (gemini-2.0-flash)
    │   └── anthropic.ts    — Anthropic provider (claude-haiku-4-5)
    │
    └── sui/
        └── registry.ts     — Sui registry stub (Phase 2)
```

---

## Memory Persistence

Memory survives server restarts. Here's why:

- Every `storeMemory` call writes the blob and an updated vector index to **Walrus**
- The index blob ID is saved locally to `data/registry.json` (gitignored)
- On startup, `loadIndex` reads the registry file, fetches the index from Walrus, and rehydrates the in-memory search cache
- **Proof**: hit `/api/diagnostic` after a cold restart — it fetches and verifies the index from Walrus before any query runs

---

## Walrus Integration

| What | Blob type | Written by |
|------|-----------|------------|
| Synthesis documents | JSON | `storeMemory` on every session |
| Embedding vectors | Binary `Float32Array` | `storeMemory` on every session |
| Vector index snapshots | JSON | `saveIndex` after every write |

All blobs are content-addressed. Blob IDs are visible in the Memory Explorer and link directly to the Walrus aggregator.

Testnet endpoints:
- Publisher: `https://publisher.walrus-testnet.walrus.space`
- Aggregator: `https://aggregator.walrus-testnet.walrus.space`

---

## API Reference

### `POST /api/agent`
Runs the full research workflow. Returns an SSE stream.

```json
{ "query": "string", "session_id": "string", "user_id": "string" }
```

SSE events: `session_start` · `memory_loaded` · `memory_selected` · `research_start` · `research_complete` · `synthesis_start` · `synthesis_complete` · `memory_committing` · `memory_committed` · `session_complete` · `error`

### `GET /api/memory?user_id=<id>`
Returns blob metadata list for a user.

### `POST /api/memory`
Fetches full blob content from Walrus.
```json
{ "blob_id": "string" }
```

### `GET /api/diagnostic`
Health check. Returns status of LLM, Voyage AI, Walrus, and the memory index.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Storage | Walrus testnet (decentralized blob storage) |
| Embeddings | Voyage AI `voyage-3-lite` (512-dim) |
| LLM | Groq / Gemini / Anthropic (provider abstraction) |
| Validation | Zod |
| Blockchain | Sui (registry stub, Phase 2) |

---

## Scripts

```bash
npm run dev       # Start development server (Turbopack)
npm run build     # Production build
npm run typecheck # TypeScript check (no emit)
npm run lint      # ESLint
```
