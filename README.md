<div align="center">

<img src="public/brand/mnemos-logo.svg" width="96" alt="Mnemos logo" />

# Mnemos

**A persistent AI memory engine — durable, verifiable memory powered by Walrus.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)](https://typescriptlang.org)
[![Walrus](https://img.shields.io/badge/Storage-Walrus%20Testnet-00c2ff)](https://walrus.xyz)
[![Sui](https://img.shields.io/badge/Chain-Sui-6fbcf0?logo=sui)](https://sui.io)

*Built for [Sui Overflow 2026](https://suioverflow.com) — Walrus Track*

</div>

---

## What is Mnemos?

AI agents are stateless. Every session starts from zero — the user becomes the memory layer, re-explaining context over and over. **Mnemos fixes this.**

Mnemos is a multi-agent research system where every session builds on prior knowledge. Memories are stored as content-addressed blobs on [Walrus](https://walrus.xyz) (Sui's decentralized storage network), semantically indexed with vector embeddings, and automatically rehydrated on startup. **The agent gets smarter every session.**

### Key Properties

- **Persistent** — memory survives server restarts; the vector index lives on Walrus, not in RAM
- **Verifiable** — every memory blob has a public `blob_id` readable directly from the Walrus aggregator
- **Semantic** — retrieval is cosine similarity over Voyage AI embeddings, not keyword search
- **Explainable** — each retrieval emits a score and plain-English reason in the live agent feed
- **Portable** — memory is user-owned; no lock-in to a single session or server

---

## Architecture

<div align="center">
  <img src="docs/architecture.svg" width="860" alt="Mnemos architecture diagram" />
</div>

### Memory Persistence Model

```
storeMemory()
  ├── embed content          → Voyage AI (512-dim)
  ├── store memory blob      → Walrus (blob_id_A)
  ├── store embedding blob   → Walrus (blob_id_B)
  ├── update VectorIndex     → Walrus (blob_id_C)  ← latest index
  └── write registry         → data/registry.json  ← pointer to blob_id_C

On server restart:
  loadIndex()
  ├── read registry.json     → blob_id_C
  └── fetch VectorIndex      → Walrus aggregator ✓
```

---

## Agent Feed — Live SSE Events

| Event | Description |
|-------|-------------|
| `session_start` | New session opened |
| `memory_loaded` | N prior blobs retrieved from Walrus |
| `memory_selected` | Per-blob: cosine score, confidence, reason string |
| `research_start` | Researcher agent begins |
| `research_complete` | N findings, confidence score |
| `synthesis_start` | Synthesizer cross-referencing sessions |
| `synthesis_complete` | Themes, confidence delta vs. prior sessions |
| `memory_committing` | Writing to Walrus testnet |
| `memory_committed` | Blob ID confirmed on Walrus |
| `session_complete` | Duration, summary |

---

## Quick Start

**Prerequisites:** Node.js 18+, a free [Groq](https://console.groq.com) key, a free [Voyage AI](https://dashboard.voyageai.com) key.

```bash
git clone https://github.com/i-anasop/Engine.git
cd Engine
npm install
cp .env.local.example .env.local
# Add your GROQ_API_KEY and VOYAGE_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Copy `.env.local.example` → `.env.local` and fill in your keys.

| Variable | Required | Source |
|----------|----------|--------|
| `GROQ_API_KEY` | ✅ Yes — free | [console.groq.com](https://console.groq.com) |
| `VOYAGE_API_KEY` | ✅ Yes — free tier | [dashboard.voyageai.com](https://dashboard.voyageai.com) |
| `WALRUS_PUBLISHER_URL` | Defaults to testnet | — |
| `WALRUS_AGGREGATOR_URL` | Defaults to testnet | — |
| `GEMINI_API_KEY` | Optional fallback LLM | [aistudio.google.com](https://aistudio.google.com/apikey) |
| `ANTHROPIC_API_KEY` | Optional fallback LLM | [console.anthropic.com](https://console.anthropic.com) |

**LLM priority order:** Groq → Gemini → Anthropic. Only one is needed. Groq is free and fastest.

> **Gemini note:** Use a key from a project *without* billing enabled — billing zeroes the free quota.

---

## Project Structure

```
mnemos/
├── app/
│   ├── api/
│   │   ├── agent/        # SSE orchestration endpoint
│   │   ├── diagnostic/   # Health check: LLM + Voyage + Walrus + index
│   │   ├── embed/        # Voyage AI embedding endpoint
│   │   └── memory/       # Blob list + blob content fetch
│   ├── workspace/        # 3-panel research UI
│   └── page.tsx          # Landing page
├── components/
│   ├── agent/            # AgentFeed — live SSE event renderer
│   ├── memory/           # MemoryExplorer — blob list sidebar
│   └── workspace/        # QueryInput
├── lib/
│   ├── agents/
│   │   ├── orchestrator.ts   # 4-phase pipeline + SSE emitter
│   │   ├── researcher.ts     # Structured JSON reports (Zod-validated)
│   │   └── synthesizer.ts    # Cross-session synthesis + confidence delta
│   ├── embeddings/
│   │   ├── voyage.ts         # Voyage AI REST client
│   │   └── search.ts         # Pure-JS cosine similarity + scored retrieval
│   ├── llm/
│   │   ├── index.ts          # Provider factory (priority fallback)
│   │   ├── groq.ts           # Groq — llama-3.1-8b-instant
│   │   ├── gemini.ts         # Gemini — gemini-2.0-flash
│   │   └── anthropic.ts      # Anthropic — claude-haiku-4-5
│   ├── walrus/
│   │   ├── client.ts         # REST wrapper: store, fetch, retry
│   │   └── memory.ts         # MemoryStore: index, persistence, registry
│   └── sui/
│       └── registry.ts       # Sui registry stub (Phase 2)
└── types/
    └── index.ts              # All shared TypeScript interfaces
```

---

## API Reference

### `POST /api/agent`
Runs the full research + memory workflow. Returns a Server-Sent Events stream.

**Request**
```json
{ "query": "string", "session_id": "string", "user_id": "string" }
```

**Response** — SSE stream of `AgentEvent` objects (see types above).

---

### `GET /api/memory?user_id=<id>`
Returns blob metadata list for a user, rehydrated from Walrus on first call.

---

### `POST /api/memory`
Fetches full blob content from the Walrus aggregator.
```json
{ "blob_id": "string" }
```

---

### `GET /api/diagnostic`
Parallel health check — LLM response, Voyage embedding, Walrus store+fetch round-trip, and memory index entry count. Returns `200 ready` or `503 not_ready`.

---

## Walrus Integration

All persistent data lives on Walrus testnet. Nothing is stored in a database.

| Data | Format | Written by |
|------|--------|-----------|
| Synthesis documents | JSON blob | After every session |
| Embedding vectors | Binary `Float32Array` | Per memory stored |
| Vector index snapshots | JSON blob | After every write |

Blob IDs are content-addressed — identical content returns the same ID. Every blob is publicly readable via the aggregator URL shown in the Memory Explorer.

**Testnet endpoints:**
- Publisher: `https://publisher.walrus-testnet.walrus.space`
- Aggregator: `https://aggregator.walrus-testnet.walrus.space`

---

## Tech Stack

| | Technology |
|-|-----------|
| Framework | Next.js 16, App Router |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 · Satoshi (display) · Geist Mono |
| Storage | Walrus (Sui decentralized blob storage) |
| Embeddings | Voyage AI `voyage-3-lite` — 512 dimensions |
| LLM | Groq / Gemini / Anthropic (pluggable) · 429 retry/backoff |
| Validation | Zod with retry on parse failure |
| Streaming | Server-Sent Events (SSE) |
| Blockchain | Sui (registry, Phase 2) |

---

## Scripts

```bash
npm run dev        # Development server (Turbopack)
npm run build      # Production build
npm run typecheck  # TypeScript check
npm run lint       # ESLint
```

---

## Security

- API keys are loaded server-side only — never exposed to the browser
- `.env.local` is gitignored; use `.env.local.example` as the setup template
- `data/registry.json` (local Walrus pointer) is gitignored — rebuilt automatically on startup
- Walrus blobs on testnet are public; do not store sensitive content

---

<div align="center">

Made by [Muhammad Anas](https://github.com/i-anasop) for Sui Overflow 2026

</div>
