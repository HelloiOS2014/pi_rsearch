# Demo 12: Memory & Attention

Chapter 12 demos illustrating why session persistence matters and how to implement it.

- **01-no-memory** — Simulates an agent with no memory: every session starts from scratch, repeating work.
- **02-with-memory** — JSONL-based session store with append-only persistence and basic compaction.

## Run

```bash
npm run 01   # See the problem: no memory
npm run 02   # See the solution: JSONL persistence + compaction
```
