# Ch10: Control Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the first practical chapter of Part 2 — teaching readers how to build a control loop (orchestrator) that turns a raw agent into a controllable system, with both MDX content and a runnable demo.

**Architecture:** Two deliverables: (1) MDX chapter following Astro 5 patterns with SourceReader components referencing Pi's AgentSession, and (2) a `demos/10-control/` directory with problem/solution TypeScript files. The demo builds on Demo 06's raw agent pattern, adding a ~250-line mini orchestrator.

**Tech Stack:** Astro 5, MDX, React Islands (SourceReader, CodeComparison) for chapter; TypeScript, tsx, @anthropic-ai/sdk, @pi-tutorial/shared for demo.

**Spec:** `docs/superpowers/specs/2026-03-25-harness-engineering-design-v2.md` Section 4

**Prerequisites:** `npm install` done, Ch9 MDX already exists at `src/content/chapters/09-harness-engineering.mdx`.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/content/chapters/10-control-loop.mdx` | Chapter content (~600-800 lines MDX) |
| Create | `demos/10-control/package.json` | Demo package config |
| Create | `demos/10-control/tsconfig.json` | TypeScript config |
| Create | `demos/10-control/src/01-no-control.ts` | Problem: raw agent without control loop |
| Create | `demos/10-control/src/02-harness.ts` | Solution: AgentHarness with full control |
| Create | `demos/10-control/README.md` | Demo instructions |

---

## MDX Heading Hierarchy

```
## Agent 失控了（开篇痛苦场景）
## 为什么会痛：控制系统视角
## 业界怎么解决
### Agent Orchestrator 模式
### 设计光谱：从极薄到极厚
### 自治光谱
## Pi 的解法：AgentSession 解剖
### 依赖注入与子系统协调
### 事件分发与异步队列
### 消息队列与请求协调
### 控制与守卫
### 错误恢复
### 启动序列与优雅关闭
### 可观测性
## 不同产品为什么做了不同选择
## 动手实现
## 元技能：如何判断"这是控制问题"
## 简化思考
## 检验标准
```

---

## Task 1: MDX Scaffold + Pain Scenario + Theory Connection

**Files:**
- Create: `src/content/chapters/10-control-loop.mdx`

- [ ] **Step 1: Create MDX file with frontmatter, imports, and export consts**

Frontmatter:
```mdx
---
title: "控制回路"
chapter: 10
description: "如何让 Agent 成为可控的系统：生命周期、事件分发、错误恢复"
---
```

Imports: SourceReader, CodeComparison (no VideoEmbed).

Export consts needed for this chapter (place all at top after imports):

```typescript
// AgentSession constructor signature (dependency injection)
export const codeAgentSessionCreate = `...`;
// Event handler queue pattern
export const codeEventQueue = `...`;
// Three message types
export const codeMessageTypes = `...`;
// Retry with exponential backoff
export const codeAutoRetry = `...`;
// Overflow recovery
export const codeOverflowRecovery = `...`;
// Startup sequence from main.ts
export const codeStartupSequence = `...`;
```

**IMPORTANT:** Read the actual Pi source files to extract accurate code snippets:
- `/Users/panghu/code/rsearch/pi_demo/pi-mono/packages/coding-agent/src/core/agent-session.ts` — for DI, events, messages, retry, overflow
- `/Users/panghu/code/rsearch/pi_demo/pi-mono/packages/coding-agent/src/main.ts` — for startup sequence

Extract simplified but accurate snippets (~10-20 lines each). Do NOT invent code — use the real source.

- [ ] **Step 2: Write pain scenario section**

`## Agent 失控了`

~30-40 lines. The reader has a working agent from Part 1. They give it a real task:
- 5 min: Agent goes wrong direction, can't be corrected without killing it
- 10 min: API returns 429, agent crashes entirely
- Restart: agent has no memory of previous work
- Follow-up message queued but agent doesn't see it until turn ends
- Agent loops: tries same failed edit 5 times

Closing: "你的 Agent 有一个大脑，但没有神经系统。"

- [ ] **Step 3: Write theory connection section**

`## 为什么会痛：控制系统视角`

~20-25 lines. Map each symptom to a control theory concept (from Ch9):
- Can't correct direction → controllability failure
- API crash → disturbance suppression missing
- No memory after restart → state not persistent
- Message timing → control bandwidth insufficient
- Loop behavior → stability failure

Conclude: control system needs sensors (events), actuators (tools), controller (AgentSession), feedback loop (tool results → next decision).

**Theory anchor:** Reference Ch9's control system model explicitly.

- [ ] **Step 4: Verify rendering**

Run: `cd /Users/panghu/code/rsearch/pi_demo/pi-tutorial && npx astro build`
Expected: Build succeeds. Chapter appears at `10-control-loop`.

- [ ] **Step 5: Commit**

```bash
git add src/content/chapters/10-control-loop.mdx
git commit -m "feat(ch10): scaffold + pain scenario + theory connection"
```

---

## Task 2: MDX Industry Solutions

**Files:**
- Modify: `src/content/chapters/10-control-loop.mdx`

- [ ] **Step 1: Write Orchestrator pattern section**

`## 业界怎么解决`

`### Agent Orchestrator 模式`

~15-20 lines. Orchestrator = application server analogy (AgentLoop ≈ application code, Orchestrator ≈ Tomcat/Express). Seven core responsibilities list:
1. 生命周期管理
2. 事件分发
3. 上下文组装
4. 请求协调
5. 控制与守卫
6. 错误恢复
7. 可观测性

- [ ] **Step 2: Write design spectrum section**

`### 设计光谱：从极薄到极厚`

~15 lines + table. From "thin orchestrator" to "thick orchestrator":

| 产品 | 厚度 | WHY |
|------|------|-----|
| Vercel AI SDK | 极薄 | SDK 哲学：用户自己组装 |
| Pi | 中等 (~3,180 行) | 极简哲学：够用就好，理解每一行 |
| Claude Code | 重量级 | 企业需求：18 种 Hook、5 种权限模式 |
| LangGraph | 图引擎 | 学术背景：用图形式化保证正确性 |

Analyze: there's no "right" thickness — it depends on your constraints.

- [ ] **Step 3: Write autonomy spectrum section**

`### 自治光谱`

~10 lines. human-in-the-loop → human-on-the-loop → human-out-of-the-loop. The orchestrator's design determines where on this spectrum the agent sits. More control points = more human oversight.

- [ ] **Step 4: Verify and commit**

```bash
npx astro build && git add src/content/chapters/10-control-loop.mdx && git commit -m "feat(ch10): industry solutions — orchestrator pattern + design spectrum"
```

---

## Task 3: MDX Pi Solution Part 1 — DI, Events, Messages

**Files:**
- Modify: `src/content/chapters/10-control-loop.mdx`

- [ ] **Step 1: Write DI section**

`## Pi 的解法：AgentSession 解剖`

`### 依赖注入与子系统协调`

~20 lines. AgentSession receives ALL collaborators via constructor (SessionManager, SettingsManager, ModelRegistry, ResourceLoader, ExtensionRunner, etc.). Show code snippet via SourceReader.

**Theory anchor:** "为什么不在内部 new？控制系统原理——controller 不应该和 plant 耦合。相同的 AgentSession 驱动 Interactive、Print、RPC 三种模式。"

Use SourceReader with `codeAgentSessionCreate` export.

- [ ] **Step 2: Write event distribution section**

`### 事件分发与异步队列`

~25 lines. Event routing chain: Agent Event → `_agentEventQueue` (serialized) → SessionManager + ExtensionRunner + UI callback + Auto-compaction check.

Show the promise chain pattern via SourceReader with `codeEventQueue` export.

**Theory anchor:** "为什么事件必须串行处理？控制论的基本原则——并发反馈会腐蚀控制器状态。"

- [ ] **Step 3: Write message queue section**

`### 消息队列与请求协调`

~20 lines. Three injection mechanisms:
- `_steeringMessages` — 当前 turn 内生效（即时纠偏）
- `_followUpMessages` — 当前 turn 结束后生效（追加任务）
- `_pendingNextTurnMessages` — 扩展注入的隐藏上下文

Show code via SourceReader with `codeMessageTypes` export.

Explain why they can't be merged: different temporal semantics.

Also mention `_pendingBashMessages` — why bash output is deferred.

- [ ] **Step 4: Verify and commit**

```bash
npx astro build && git add src/content/chapters/10-control-loop.mdx && git commit -m "feat(ch10): Pi AgentSession — DI + events + message queues"
```

---

## Task 4: MDX Pi Solution Part 2 — Control, Recovery, Startup, Observability

**Files:**
- Modify: `src/content/chapters/10-control-loop.mdx`

- [ ] **Step 1: Write control and guard section**

`### 控制与守卫`

~15 lines. Stop conditions: natural completion / turn limit / budget limit / abort / unrecoverable error. Permission model: Pi's tool hooks (beforeToolCall / afterToolCall). Thinking Level management.

- [ ] **Step 2: Write error recovery section**

`### 错误恢复`

~25 lines. Two mechanisms:

**Auto-retry:** detect retriable errors (overloaded / rate limit / 5xx) → exponential backoff → remove error from Agent state but keep in Session.

Show code via SourceReader with `codeAutoRetry` export.

**Theory anchor:** "为什么用指数退避？控制论：激进重试 = 振荡。指数退避引入'阻尼'。"

**Overflow Recovery:** detect overflow → remove error → auto-compact → retry → `_overflowRecoveryAttempted` flag prevents infinite loop.

Show code via SourceReader with `codeOverflowRecovery` export.

**Theory anchor:** "成本反转——溢出后'保留'已不可能，唯一出路是'压缩取回'。防循环标志是稳定性保证。"

- [ ] **Step 3: Write startup and shutdown section**

`### 启动序列与优雅关闭`

~15 lines. 6-stage startup from main.ts: CLI args → Settings → Model Registry → Resources → Session → Mode selection.

Graceful shutdown: multiple AbortControllers (compaction / retry / bash / branch summary).

- [ ] **Step 4: Write observability section**

`### 可观测性`

~15 lines. `subscribe(listener)`, `getSessionStats()`, `getContextUsage()`. Key design: tool output full in event stream, truncated to LLM. Structured logging, cost tracking, health metrics.

**Theory anchor:** "控制论的可观测性——能否从输出推断内部状态。"

- [ ] **Step 5: Verify and commit**

```bash
npx astro build && git add src/content/chapters/10-control-loop.mdx && git commit -m "feat(ch10): Pi AgentSession — control + recovery + startup + observability"
```

---

## Task 5: MDX Design Philosophy + Demo Section + Meta-Skills + Checklist

**Files:**
- Modify: `src/content/chapters/10-control-loop.mdx`

- [ ] **Step 1: Write design philosophy comparison section**

`## 不同产品为什么做了不同选择`

~20 lines + table. Expanded comparison: Pi vs Claude Code vs LangGraph vs OpenAI Agents SDK vs Vercel AI SDK. Dimensions: orchestrator thickness, event model, error recovery, permission model, stop conditions, human collaboration, multi-agent, observability.

Don't just list WHAT — explain WHY each product chose differently (Pi: minimalism, Claude Code: enterprise, LangGraph: formalism, etc.).

- [ ] **Step 2: Write demo reference section**

`## 动手实现`

~15 lines pointing to the demo directory. Describe the progression:
1. `01-no-control.ts` — 运行一个没有控制回路的 Agent，观察失败
2. `02-harness.ts` — 给同一个 Agent 包一层 AgentHarness，观察改善

Include run commands: `cd demos/10-control && npx tsx src/01-no-control.ts`

- [ ] **Step 3: Write meta-skills section**

`## 元技能：如何判断"这是控制问题"`

~10 lines. Symptoms: agent loops, can't stop, events lost, errors cascade, can't redirect mid-task. Priority: control loop is the FIRST thing to build. Metrics: error recovery rate, mean time to recovery, event loss rate.

- [ ] **Step 4: Write simplification and checklist sections**

`## 简化思考`

~8 lines. Models getting better at self-recovery → some retry logic may become unnecessary. But lifecycle management and event distribution are NOT simplifiable.

`## 检验标准`

8-item checklist from spec:
- [ ] Agent starts, accepts requests, returns responses
- [ ] API 500/429 auto-retried with exponential backoff
- [ ] Context overflow triggers auto-compaction + retry
- [ ] Turn limit stops agent and reports
- [ ] Steering messages can redirect mid-task
- [ ] Graceful shutdown cancels all operations
- [ ] Event stream is complete (every tool call has events)
- [ ] Session stats queryable (message count, tool calls, tokens)

- [ ] **Step 5: Verify and commit**

```bash
npx astro build && git add src/content/chapters/10-control-loop.mdx && git commit -m "feat(ch10): design philosophy + demo section + meta-skills + checklist"
```

---

## Task 6: Demo Scaffold

**Files:**
- Create: `demos/10-control/package.json`
- Create: `demos/10-control/tsconfig.json`
- Create: `demos/10-control/README.md`

- [ ] **Step 1: Create package.json**

Follow existing demo patterns (check `demos/06-my-agent/package.json` for reference):

```json
{
  "name": "@pi-tutorial/demo-10-control",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "01": "npx tsx src/01-no-control.ts",
    "02": "npx tsx src/02-harness.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "@pi-tutorial/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create README.md**

Brief description of what this demo covers, how to run, and what to observe.

- [ ] **Step 4: Install dependencies**

```bash
cd /Users/panghu/code/rsearch/pi_demo/pi-tutorial && npm install
```

- [ ] **Step 5: Commit**

```bash
git add demos/10-control/
git commit -m "feat(ch10): demo scaffold — package.json + tsconfig + README"
```

---

## Task 7: Demo 01-no-control.ts (Problem)

**Files:**
- Create: `demos/10-control/src/01-no-control.ts`

- [ ] **Step 1: Write the "problem" demo**

This file shows a raw agent loop WITHOUT a control harness. Based on the pattern from `demos/01-hello-agent/src/03-agent-loop.ts` but simplified.

Key characteristics:
- Uses `@anthropic-ai/sdk` directly (Anthropic client)
- Has a simple `calculator` tool
- Runs a `while (true)` loop with `stop_reason === "tool_use"` check
- NO error handling — if API fails, crash
- NO turn limit — can loop forever
- NO steering — can't redirect mid-task
- NO event emission — no observability
- Mock mode: simulate an API error on the 3rd turn to demonstrate the crash

Structure (~80 lines):
```typescript
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, isMockMode, printSection } from "@pi-tutorial/shared";

printSection("Demo 10-01: 没有控制回路的 Agent");

// Simple calculator tool
const tools = [/* calculator schema */];

async function runAgent(prompt: string) {
  const client = new Anthropic({ apiKey: getApiKey("anthropic") });
  const messages = [{ role: "user", content: prompt }];

  let turn = 0;
  while (true) {
    turn++;
    console.log(`\n--- Turn ${turn} ---`);

    // In mock mode, simulate API error on turn 3
    if (isMockMode() && turn === 3) {
      throw new Error("API Error: 429 Too Many Requests");
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 1024,
      tools,
      messages,
    });

    // Process response...
    // No error handling, no turn limit, no events
  }
}

runAgent("Calculate (15 * 7) + (23 * 4) step by step")
  .catch(err => {
    console.error("\n💥 Agent 崩溃了:", err.message);
    console.error("\n没有错误恢复、没有重试、没有优雅降级。");
    console.error("这就是为什么你需要控制回路。\n");
  });
```

- [ ] **Step 2: Verify it runs (and crashes in mock mode)**

```bash
cd /Users/panghu/code/rsearch/pi_demo/pi-tutorial && npx tsx demos/10-control/src/01-no-control.ts
```

Expected: Runs 2 turns, then crashes with "API Error: 429" message and the educational error message.

- [ ] **Step 3: Commit**

```bash
git add demos/10-control/src/01-no-control.ts
git commit -m "feat(ch10): demo 01-no-control — raw agent that crashes on API error"
```

---

## Task 8: Demo 02-harness.ts (Solution)

**Files:**
- Create: `demos/10-control/src/02-harness.ts`

- [ ] **Step 1: Write the "solution" demo**

This is the core demo — a ~200-line mini AgentHarness that wraps the same agent loop with control mechanisms.

Structure:
```typescript
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, isMockMode, printSection, printEvent } from "@pi-tutorial/shared";

// ===== 1. Event System =====
type EventType = "turn_start" | "turn_end" | "tool_call" | "tool_result" | "error" | "retry" | "complete";
type EventListener = (event: { type: EventType; data?: any }) => void;

// ===== 2. AgentHarness Class =====
class AgentHarness {
  private client: Anthropic;
  private tools: Anthropic.Tool[];
  private toolExecutors: Record<string, (input: any) => Promise<string>>;
  private listeners: EventListener[] = [];
  private steeringMessages: string[] = [];
  private abortController = new AbortController();
  private maxTurns: number;
  private retryConfig = { maxRetries: 3, baseDelay: 1000 };

  constructor(options: {
    apiKey: string;
    tools: Anthropic.Tool[];
    toolExecutors: Record<string, (input: any) => Promise<string>>;
    maxTurns?: number;
  }) { /* ... */ }

  // Event subscription
  subscribe(listener: EventListener) { /* ... */ }
  private emit(type: EventType, data?: any) { /* ... */ }

  // Steering
  steer(message: string) { /* ... */ }

  // Abort
  abort() { /* ... */ }

  // Core loop with control
  async run(prompt: string): Promise<string> {
    const messages = [{ role: "user", content: prompt }];

    for (let turn = 0; turn < this.maxTurns; turn++) {
      // Check abort
      if (this.abortController.signal.aborted) break;

      this.emit("turn_start", { turn });

      // Inject steering messages
      if (this.steeringMessages.length > 0) {
        const steering = this.steeringMessages.shift()!;
        messages.push({ role: "user", content: `[STEERING] ${steering}` });
        printEvent("steering", steering);
      }

      // API call with retry
      const response = await this.callWithRetry(messages);

      // Process response (extract text, handle tool calls)
      // ...

      this.emit("turn_end", { turn });
    }

    this.emit("complete", { totalTurns: turn });
    return finalText;
  }

  // Retry with exponential backoff
  private async callWithRetry(messages: any[]): Promise<any> {
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await this.client.messages.create({ /* ... */ });
      } catch (err) {
        if (attempt === this.retryConfig.maxRetries) throw err;
        if (!this.isRetriable(err)) throw err;

        const delay = this.retryConfig.baseDelay * Math.pow(2, attempt);
        this.emit("retry", { attempt: attempt + 1, delay, error: err.message });
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  private isRetriable(err: any): boolean {
    const msg = err.message || "";
    return msg.includes("429") || msg.includes("500") || msg.includes("overloaded");
  }

  // Graceful shutdown
  async shutdown() {
    this.abort();
    this.emit("complete", { reason: "shutdown" });
  }
}

// ===== 3. Demo Execution =====
printSection("Demo 10-02: 有控制回路的 Agent");

// Same tools as 01-no-control
const tools = [/* calculator */];
const toolExecutors = { calculator: async (input) => /* ... */ };

const harness = new AgentHarness({
  apiKey: getApiKey("anthropic"),
  tools,
  toolExecutors,
  maxTurns: 10,
});

// Subscribe to events (observability)
harness.subscribe((event) => {
  printEvent(event.type, JSON.stringify(event.data ?? ""));
});

// Run with the same prompt as 01
const result = await harness.run("Calculate (15 * 7) + (23 * 4) step by step");
console.log("\n✅ Agent 完成:", result);
console.log("\n对比 01-no-control：相同的任务，但有错误恢复、turn 限制、事件追踪。");
```

Mock mode: simulate API error on turn 3 (same as 01), but now the retry mechanism catches it and retries successfully.

- [ ] **Step 2: Verify it runs successfully**

```bash
cd /Users/panghu/code/rsearch/pi_demo/pi-tutorial && npx tsx demos/10-control/src/02-harness.ts
```

Expected in mock mode: Shows turn events, encounters simulated 429 on turn 3, retries with backoff, recovers, completes. Prints event log throughout.

- [ ] **Step 3: Verify typecheck**

```bash
cd demos/10-control && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add demos/10-control/src/02-harness.ts
git commit -m "feat(ch10): demo 02-harness — AgentHarness with retry, events, steering, turn limit"
```

---

## Task 9: Polish and Push

**Files:**
- Modify: `src/content/chapters/10-control-loop.mdx` (if needed)
- Modify: `demos/10-control/src/*.ts` (if needed)

- [ ] **Step 1: Review MDX content**

Read entire chapter. Check:
- Chinese text quality
- All SourceReader/CodeComparison have `client:visible`
- All export consts at top of file
- Code snippets match real Pi source (not invented)
- Theory anchors connect back to Ch9 framework
- Section transitions are smooth

- [ ] **Step 2: Review demo code**

Read both demo files. Check:
- Mock mode works without API key
- 01-no-control demonstrates clear failure
- 02-harness demonstrates clear improvement
- TypeScript types are correct
- No security issues (no eval, no rm)

- [ ] **Step 3: Verify full build**

```bash
cd /Users/panghu/code/rsearch/pi_demo/pi-tutorial && npx astro build
```

- [ ] **Step 4: Final commit and push**

```bash
git add -A && git commit -m "feat(ch10): polish control loop chapter + demo" && git push origin main
```

---

## Implementation Notes

### Code Snippet Extraction

The MDX chapter references Pi's source code. The implementer MUST read the real source files and extract simplified but accurate snippets. Key source files:

| Source File | What to Extract | For Section |
|-------------|-----------------|-------------|
| `pi-mono/packages/coding-agent/src/core/agent-session.ts` | Constructor/factory signature | DI section |
| Same file | `_agentEventQueue` pattern | Event distribution |
| Same file | `_steeringMessages` / `_followUpMessages` / `_pendingNextTurnMessages` | Message queues |
| Same file | Retry logic with error detection | Error recovery |
| Same file | Overflow recovery with `_overflowRecoveryAttempted` | Error recovery |
| `pi-mono/packages/coding-agent/src/main.ts` | Startup sequence flow | Startup section |
| `pi-mono/packages/coding-agent/src/core/event-bus.ts` | EventBus interface | Observability |

### Demo Design Principles

- **Problem file (01)** must FAIL visibly — the reader should see the crash and understand WHY
- **Solution file (02)** must SUCCEED on the same task — the contrast is the teaching moment
- Mock mode in 01 simulates an API 429 error on turn 3 (hardcoded)
- Mock mode in 02 simulates the same error but recovers via retry
- Both files use `@pi-tutorial/shared` for `getApiKey`, `isMockMode`, `printSection`, `printEvent`

### Relationship to Other Chapters

- Ch9 (Harness Engineering) provides the theoretical framework — Ch10 references it via "theory anchors"
- Ch11 (Boundary & Trust) builds on Ch10's harness by adding reliable tools
- The demo's AgentHarness class is intentionally minimal — later chapters add memory, config, delivery
