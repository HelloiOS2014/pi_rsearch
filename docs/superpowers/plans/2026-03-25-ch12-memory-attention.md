# Ch12: Memory & Attention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the chapter teaching readers how to give agents persistent memory and manage finite context windows, with both MDX content and a problem/solution demo featuring JSONL sessions and basic compaction.

**Architecture:** MDX chapter with SourceReader referencing Pi's SessionManager and Compaction system. Demo `demos/12-memory/` with problem (agent forgets everything) and solution (JSONL persistence + basic compaction).

**Tech Stack:** Astro 5, MDX, React Islands for chapter; TypeScript, tsx, @anthropic-ai/sdk, @pi-tutorial/shared for demo.

**Spec:** `docs/superpowers/specs/2026-03-25-harness-engineering-design-v2.md` Section 6

**Prerequisites:** Ch9-Ch11 complete and pushed.

---

## MDX Heading Hierarchy

```
## Agent 忘了之前做的事（痛苦场景）
## 为什么会痛：状态鸿沟与注意力鸿沟
## 记忆层次结构
## 成本反转全景：保留 vs 取回的每一个决策
## 三种压缩策略
## 会话持久化与分支
## Pi 的解法：会话管理深度解剖
### JSONL 树状存储
### 分支机制
### Compaction 系统
### 何时触发
### 会话迁移
## 保留什么、丢弃什么
## 不同产品为什么做了不同选择
## 动手实现
## 元技能：如何判断"这是记忆问题"
## 简化思考
## 检验标准
```

---

## Stream A: MDX (sequential)

### Task 1: Scaffold + Pain + Theory + Memory Hierarchy

**Files:**
- Create: `src/content/chapters/12-memory-attention.mdx`

- [ ] **Step 1: Read Pi source files for export consts**

Read these files to extract accurate code:
- `/Users/panghu/code/rsearch/pi_demo/pi-mono/packages/coding-agent/src/core/session-manager.ts` — SessionEntry types, JSONL format, tree building, buildSessionContext
- `/Users/panghu/code/rsearch/pi_demo/pi-mono/packages/coding-agent/src/core/compaction/compaction.ts` — cut-point algorithm, two-phase summarization, token estimation
- `/Users/panghu/code/rsearch/pi_demo/pi-mono/packages/coding-agent/src/core/compaction/branch-summarization.ts` — branch summary generation

Create ~5 export consts (simplified, ~10-20 lines each):
1. `codeSessionEntryTypes` — the 9 entry types (message, compaction, branch_summary, etc.)
2. `codeBranchMechanism` — the one-line branch implementation (move leaf pointer)
3. `codeCutPoint` — the cut-point algorithm (walk backwards, accumulate tokens, find legal cut)
4. `codeCompactionPrompt` — the structured summarization prompt (Goal/Constraints/Progress/Decisions/Next Steps)
5. `codeTokenEstimate` — chars/4 heuristic

- [ ] **Step 2: Create MDX with frontmatter, imports, exports, pain scenario**

Frontmatter: title "记忆与注意力", chapter 12. Imports: SourceReader, CodeComparison.

Pain scenario `## Agent 忘了之前做的事` (~30 lines blockquote):
- Agent working on large refactoring, first 20 min fine
- At 25 min: re-reads files it already read, repeats work from 15 min ago
- Context at 95%: reasoning quality crashed
- Close terminal for lunch: all progress lost, starts from zero
- Doesn't remember which files modified, which decisions made

- [ ] **Step 3: Write theory + memory hierarchy**

`## 为什么会痛：状态鸿沟与注意力鸿沟` (~20 lines)
- State gap: LLM is stateless, work needs state
- Attention gap: even with all history in context, "lost in the middle" degrades quality
- Cost inversion is THIS chapter's central axis

`## 记忆层次结构` (~15 lines + table)
L1 (generation window ≈ CPU cache) → L2 (working set ≈ RAM) → L3 (session history ≈ swap) → L4 (cross-session ≈ disk). Include Pichay data: 21.8% structural waste, 84.4x amplification factor.

End with `---`.

- [ ] **Step 4: Build + commit**

```bash
npx astro build && git add src/content/chapters/12-memory-attention.mdx && git commit -m "feat(ch12): scaffold + pain + theory + memory hierarchy"
```

---

### Task 2: Cost Inversion Table + Compression Strategies + Branching

- [ ] **Step 1: Write cost inversion full table section**

`## 成本反转全景：保留 vs 取回的每一个决策` (~20 lines + table)

This is the chapter's CENTRAL FRAMEWORK. Table:

| 决策 | 保留（昂贵） | 取回（廉价） | Pi 的选择 |
|------|------------|-------------|----------|
| 历史消息 | 全量在上下文 | Compaction 摘要 + 按需重读 | 阈值触发摘要 |
| 工具结果 | 原始输出常驻 | Tool Result Clearing + 重新执行 | truncate + 元数据 |
| Thinking blocks | 所有 turn 保留 | 只保留最近 turn | 可配置 |
| 文件内容 | 预加载到上下文 | read 工具按需 | 按需 |
| 子任务上下文 | 主 Agent 上下文中 | 子 Agent 隔离返回摘要 | Proxy transport |

**Theory anchor:** "This table is the cost inversion principle from Ch9 applied to every memory decision."

- [ ] **Step 2: Write three compression strategies**

`## 三种压缩策略` (~25 lines + table)

| 策略 | 描述 | 压缩率 | 幻觉风险 | 适用场景 |
|------|------|--------|---------|---------|
| Token 清除 (Compaction) | 删除原始 token，零改写 | 50-70% | 零 | 编码 |
| LLM 摘要 (Summarization) | LLM 改写为结构化摘要 | 80-90% | 中等 | 长对话 |
| Observation Masking | 隐藏输出保留动作 | 变动 | 低 | 保留推理链 |

Production practice: layer them (clearing → thinking clearing → summarization).

Factory.ai data: structured 3.70/5 vs Anthropic 3.44/5. Multi-session retention only 37%.

- [ ] **Step 3: Write branching section**

`## 会话持久化与分支` (~15 lines)

Git analogy: commits → branch → checkout. ContextBranch research: +2.5% quality, -58.1% context. Branching reduces attention burden through isolation.

Universal data model: Entry { id, parentId, type, timestamp, payload }. DAG via parentId. leafId pointer for current position.

End with `---`.

- [ ] **Step 4: Build + commit**

```bash
npx astro build && git add src/content/chapters/12-memory-attention.mdx && git commit -m "feat(ch12): cost inversion table + compression strategies + branching"
```

---

### Task 3: Pi Session Manager + Compaction Deep Dive

- [ ] **Step 1: Write Pi session manager section**

`## Pi 的解法：会话管理深度解剖`

`### JSONL 树状存储` (~25 lines)

SessionManager 1,410 lines. Append-only JSONL. Show entry types via SourceReader (`codeSessionEntryTypes`).

**Theory anchor:** "为什么用 append-only？状态鸿沟的最安全桥接——只追加不修改，崩溃不会丢失已写入数据。"

Lazy write strategy: buffer user messages until first assistant response.

`### 分支机制` (~10 lines)

Show via SourceReader (`codeBranchMechanism`). One line of code. Branch summary via LLM (maxTokens=2048).

`### Compaction 系统` (~35 lines)

Two-phase: history summary + turn prefix summary (parallel execution).

Show cut-point algorithm via SourceReader (`codeCutPoint`).

**Theory anchor:** "为什么不在 toolResult 处切？toolResult 和 toolCall 必须配对——单独的 toolResult 语义不完整。"

Token estimation: chars/4. Show via SourceReader (`codeTokenEstimate`).

**Theory anchor:** "为什么 chars/4 是最优？成本反转——高估触发 compaction 略早（低成本），低估导致溢出（高成本）。保守启发式是成本反转的直接推论。"

Structured summary format: Goal/Constraints/Progress/Decisions/Next Steps/Critical Context. Show via SourceReader (`codeCompactionPrompt`).

File operation tracking: read-files/modified-files XML tags appended to summary.

`### 何时触发` (~10 lines)

75% > 95%. Claude Code production data. "提前停止反而延长了生产性会话长度。"

**Theory anchor:** "注意力鸿沟——性能在窗口满之前就退化（上下文腐烂）。"

`### 会话迁移` (~8 lines)

v1→v2 (tree structure) → v2→v3 (rename role). Auto-run on load, backward compatible.

End with `---`.

- [ ] **Step 2: Build + commit**

```bash
npx astro build && git add src/content/chapters/12-memory-attention.mdx && git commit -m "feat(ch12): Pi session manager + compaction deep dive"
```

---

### Task 4: Closing Sections (preserve/discard + comparisons + meta + checklist)

- [ ] **Step 1: Write preserve/discard section**

`## 保留什么、丢弃什么` (~20 lines)

Always preserve: instructions (CLAUDE.md), unresolved problems, file paths/URLs, error traces.
Discard first: old tool outputs (84.4x amplification), intermediate reasoning, duplicate content, old thinking blocks.

External memory: Anthropic's Initializer-Executor pattern, Manus's todo.md, git as implicit log.

- [ ] **Step 2: Write comparisons + demo + meta + simplification + checklist**

`## 不同产品为什么做了不同选择` — table (Pi/Claude Code/LangGraph/Manus)
`## 动手实现` — point to demos/12-memory/
`## 元技能` — symptoms, priority (compaction first), evaluation metrics
`## 简化思考` — larger windows reduce frequency but compaction persists
`## 检验标准` — 7 items

Closing tease Ch13: "Agent 现在有了记忆，能跑完长任务。你兴奋地把它部署到团队的三个项目上——然后发现每个项目需要不同的模型、不同的安全策略、不同的代码规范。下一章，我们让 Agent 学会适应。"

- [ ] **Step 3: Build + commit**

```bash
npx astro build && git add src/content/chapters/12-memory-attention.mdx && git commit -m "feat(ch12): preserve/discard + comparisons + meta + checklist"
```

---

## Stream B: Demo (parallel to Stream A)

### Task 5: Demo Scaffold + Both Files

**Files:**
- Create: `demos/12-memory/package.json`, `tsconfig.json`, `README.md`
- Create: `demos/12-memory/src/01-no-memory.ts`
- Create: `demos/12-memory/src/02-with-memory.ts`

- [ ] **Step 1: Create scaffold** (package.json, tsconfig, README)

Package: `@pi-tutorial/demo-12-memory`. Dependencies: `@anthropic-ai/sdk`, `@pi-tutorial/shared`.

- [ ] **Step 2: Create 01-no-memory.ts (~60 lines)**

Demonstrates the problem: Agent that forgets everything.
- Simulates a multi-turn conversation (mock mode)
- Each "turn" is independent — no history carried over
- After 3 turns, the agent repeats turn 1's analysis
- Shows: "Agent 重复了 Turn 1 的工作——它不记得之前做过什么"

- [ ] **Step 3: Create 02-with-memory.ts (~200 lines)**

Demonstrates the solution: JSONL persistence + basic compaction.

Implements a simplified `SessionStore` class:
```typescript
class SessionStore {
  private entries: SessionEntry[] = [];
  private filePath: string;

  // Append-only persistence
  append(entry: SessionEntry): void { /* write to JSONL */ }
  load(): SessionEntry[] { /* read from JSONL */ }

  // Basic compaction
  compact(keepRecent: number): { summary: string; kept: SessionEntry[] } {
    // chars/4 token estimation
    // Find cut point (not at tool_result)
    // Generate summary of discarded entries
    // Return summary + kept entries
  }

  // Context building
  buildContext(): Message[] { /* walk tree, build messages */ }
}
```

Mock mode:
- Simulates 5-turn conversation with growing context
- After turn 3: context "reaches threshold" → compaction triggers
- Shows summary generated + remaining context
- Close and reopen: session restores from JSONL
- Contrast: "关闭重启后，Agent 记得之前的工作"

- [ ] **Step 4: Install, run both, typecheck, commit**

```bash
npm install
npx tsx demos/12-memory/src/01-no-memory.ts    # Shows forgetting
npx tsx demos/12-memory/src/02-with-memory.ts   # Shows remembering
cd demos/12-memory && npx tsc --noEmit
git add demos/12-memory/ && git commit -m "feat(ch12): demo — 01-no-memory + 02-with-memory"
```

---

## Task 6: Polish and Push

- [ ] **Step 1: Review MDX** — exports at top, highlights correct, Chinese quality, theory anchors
- [ ] **Step 2: Review demos** — mock mode works, contrast clear, types pass
- [ ] **Step 3: Build + run demos + push**

```bash
npx astro build && git add -A && git commit -m "feat(ch12): polish memory & attention chapter + demo" && git push origin main
```
