# Ch11: Boundary & Trust Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the chapter teaching readers how to build reliable, safe tools that bridge the gap between token space and the physical world, with both MDX content and a problem/solution demo.

**Architecture:** MDX chapter with SourceReader components referencing Pi's tool implementations (edit.ts, bash.ts, truncate.ts, path-utils.ts, file-mutation-queue.ts). Demo `demos/11-trust/` with problem (fragile tools) and solution (defensive tools with fuzzy matching, timeout, truncation, permissions).

**Tech Stack:** Astro 5, MDX, React Islands for chapter; TypeScript, tsx, @anthropic-ai/sdk, @pi-tutorial/shared for demo.

**Spec:** `docs/superpowers/specs/2026-03-25-harness-engineering-design-v2.md` Section 5

**Prerequisites:** Ch9 and Ch10 MDX + demos complete and pushed.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/content/chapters/11-boundary-trust.mdx` | Chapter content (~700-900 lines MDX) |
| Create | `demos/11-trust/package.json` | Demo package config |
| Create | `demos/11-trust/tsconfig.json` | TypeScript config |
| Create | `demos/11-trust/src/01-fragile-tools.ts` | Problem: tools that break on edge cases |
| Create | `demos/11-trust/src/02-defensive-tools.ts` | Solution: fuzzy edit + safe bash + truncation + permissions |
| Create | `demos/11-trust/README.md` | Demo instructions |

---

## MDX Heading Hierarchy

```
## Agent 做错了，甚至做了危险的事（痛苦场景）
## 为什么会痛：边界鸿沟与信任鸿沟
## 复合错误率：为什么可靠性是乘法而不是加法
## 防御性工具工程的七条原则
## 错误消息工程：给 LLM 写错误信息
## 循环检测
## Pi 的解法：工具工程深度解剖
### Edit 工具 — 容错编辑的艺术
### Bash 工具 — 安全执行的工程
### 输出截断 — 上下文保护
### 文件变更安全 — 并发与原子性
### 路径工程 — 隐形的可靠性
## 沙箱工程：OS 级安全边界
## 不同产品为什么做了不同选择
## 动手实现
## 元技能：如何判断"这是工具问题"
## 简化思考
## 检验标准
```

---

## MDX Tasks (Stream A — sequential, same file)

### Task 1: Scaffold + Pain Scenario + Theory + Compound Error Rate

**Files:**
- Create: `src/content/chapters/11-boundary-trust.mdx`

- [ ] **Step 1: Create MDX with frontmatter, imports, and export consts**

Frontmatter:
```mdx
---
title: "边界与信任"
chapter: 11
description: "如何让 Agent 的行动值得信赖：防御性工具工程、沙箱、权限"
---
```

Imports: SourceReader, CodeComparison.

**CRITICAL:** Read the Pi source files to extract accurate code snippets for export consts:
- `/Users/panghu/code/rsearch/pi_demo/pi-mono/packages/coding-agent/src/core/tools/edit.ts` — fuzzy matching logic
- `/Users/panghu/code/rsearch/pi_demo/pi-mono/packages/coding-agent/src/core/tools/edit-diff.ts` — normalize function
- `/Users/panghu/code/rsearch/pi_demo/pi-mono/packages/coding-agent/src/core/tools/bash.ts` — spawn + rolling buffer + process kill
- `/Users/panghu/code/rsearch/pi_demo/pi-mono/packages/coding-agent/src/core/tools/truncate.ts` — head/tail truncation
- `/Users/panghu/code/rsearch/pi_demo/pi-mono/packages/coding-agent/src/core/tools/file-mutation-queue.ts` — promise chain
- `/Users/panghu/code/rsearch/pi_demo/pi-mono/packages/coding-agent/src/core/tools/path-utils.ts` — resolveReadPath variants

Create ~6 export consts with simplified but accurate code from these files.

- [ ] **Step 2: Write pain scenario**

`## Agent 做错了，甚至做了危险的事`

~30 lines blockquote. Agent now has a control loop (Ch10), runs stably. But:
- Edit fails: LLM outputs smart quotes (`""`), file has ASCII quotes (`""`), string match fails. Agent retries 5 times, same result.
- Bash hangs: test command runs forever, no timeout, must manually kill
- Output explosion: grep returns 50MB, context window flooded
- Path hallucination: `rm -rf ./src` instead of `rm -rf ./src/tmp`
- Closing: "你的 Agent 能行动了，但它的行动不值得信赖。"

- [ ] **Step 3: Write theory connection**

`## 为什么会痛：边界鸿沟与信任鸿沟`

~20 lines. Two gaps from Ch9 intertwined:
- **边界鸿沟**: LLM thinks in tokens, world runs in bytes. Unicode smart quotes are different representations. Tools = translation layer. Translation fidelity determines reliability.
- **信任鸿沟**: Agent must have power to be useful, but can't be fully trusted. The fundamental tension: power vs safety.

**Theory anchor:** "成本反转原理预测——更多工具'保留'在工具集中消耗更多注意力预算。Vercel 的 2 > 15 实验验证了这个预测。"

- [ ] **Step 4: Write compound error rate section**

`## 复合错误率：为什么可靠性是乘法而不是加法`

~10 lines. Single tool 85% success → 10-step task 0.85^10 = 19.7% end-to-end. The math is devastating. This is why "good enough" tools are not good enough — you need defensive engineering.

End with `---`.

- [ ] **Step 5: Verify build and commit**

```bash
cd /Users/panghu/code/rsearch/pi_demo/pi-tutorial && npx astro build
git add src/content/chapters/11-boundary-trust.mdx
git commit -m "feat(ch11): scaffold + pain scenario + theory + compound error rate"
```

---

### Task 2: Seven Principles + Error Messages + Loop Detection

**Files:**
- Modify: `src/content/chapters/11-boundary-trust.mdx`

- [ ] **Step 1: Write seven principles section**

`## 防御性工具工程的七条原则`

~40 lines. Each principle: bold name + 2-3 line explanation + example:

1. **架构约束优于行为约束** — Don't prompt "read before edit". ENFORCE: Edit tool rejects unread files.
2. **歧义时失败（Fail-Closed）** — Multiple matches → refuse, don't guess.
3. **提供可自修复的错误信息** — Error messages for LLM, not human. Include: what went wrong, current state, how to fix.
4. **最小化工具集** — Fewer tools = less ambiguity. Pi: 4 default tools.
5. **分离获取与变更** — Read/grep/find = no permission. Edit/write/bash = permission required.
6. **输出截断是一等公民** — Tool output uncontrolled → context destroyed. Truncation must be designed, not afterthought.
7. **Operations 抽象** — Tool logic decoupled from execution environment (local/SSH/Docker) via Operations interface.

- [ ] **Step 2: Write error message engineering section**

`## 错误消息工程：给 LLM 写错误信息`

~15 lines. Key insight: error messages for LLMs ≠ for humans.

Use CodeComparison showing bad vs good error message:
- Left (bad): `"Error: no match found"`
- Right (good): `"No match found for oldText. File contains 3 similar matches at lines 42, 87, 155. Provide more surrounding context to uniquely identify the location."`

Aider/Cline data: good error messages improve edit success rate 10-25%.

- [ ] **Step 3: Write loop detection section**

`## 循环检测`

~10 lines. **Note: Pi does not implement this.** This section describes the industry pattern (StrongDM Attractor spec): sliding window + tool call signature tracking (name + args hash), detect patterns of length 1-3, inject steering message.

End with `---`.

- [ ] **Step 4: Verify and commit**

```bash
npx astro build
git add src/content/chapters/11-boundary-trust.mdx
git commit -m "feat(ch11): seven principles + error messages + loop detection"
```

---

### Task 3: Pi Tool Deep Dive — Edit + Bash

**Files:**
- Modify: `src/content/chapters/11-boundary-trust.mdx`

- [ ] **Step 1: Write Edit tool section**

`## Pi 的解法：工具工程深度解剖`

`### Edit 工具 — 容错编辑的艺术`

~40 lines. Three-stage matching: exact → fuzzy normalize → error + guidance.

Use SourceReader to show `normalizeForFuzzyMatch()` (from export const). Explain each normalization:
- Unicode NFKC
- Smart quotes → ASCII
- Unicode dashes → ASCII
- Special spaces → regular space

Other defenses: UTF-8 BOM handling, line ending preservation, uniqueness validation, diff generation.

**Theory anchor:** "每种 normalization 对应一个边界鸿沟的具体实例——LLM 在 Markdown 环境中'看到'的字符和文件系统中'存储'的字符不同。Fuzzy matching 弥合这个翻译损失。"

Industry comparison table: exact+fuzzy (Pi/Claude Code) vs sketch+apply (Cursor) vs multi-format (Aider/Cline) vs whole-file rewrite. Explain WHY each chose differently.

- [ ] **Step 2: Write Bash tool section**

`### Bash 工具 — 安全执行的工程`

~30 lines. Pi's architecture: spawn(bash, detached:true) → Rolling Buffer (100KB) + Temp File (>50KB) → onUpdate callback → Timeout → killProcessTree().

Use SourceReader for bash implementation pattern (from export const).

Key decisions:
- Rolling Buffer + Temp File hybrid: memory for LLM, disk for humans
- Process tree kill: `detached: true` makes child its own process group, kill entire group
- Command Prefix: inject shell options without modifying user command

**Theory anchor:** "为什么不'保留'完整 bash 输出？成本反转——50MB 日志常驻上下文会摧毁推理能力。truncateTail 只保留尾部（错误信息通常在最后），完整输出写 temp file 供人类查看。"

End with `---`.

- [ ] **Step 3: Verify and commit**

```bash
npx astro build
git add src/content/chapters/11-boundary-trust.mdx
git commit -m "feat(ch11): Pi edit fuzzy matching + bash safety"
```

---

### Task 4: Pi Tool Deep Dive — Truncation + File Safety + Paths + Sandbox

**Files:**
- Modify: `src/content/chapters/11-boundary-trust.mdx`

- [ ] **Step 1: Write truncation section**

`### 输出截断 — 上下文保护`

~20 lines. Dual-mode: truncateHead (file read, headers matter) vs truncateTail (bash output, errors at end). UTF-8 boundary safety. Metadata-driven guidance (TruncationResult with totalLines, truncatedBy, etc.).

Industry comparison table: hard truncation vs tool result clearing vs observation masking vs pointer-based storage vs anchored summarization.

- [ ] **Step 2: Write file mutation safety section**

`### 文件变更安全 — 并发与原子性`

~15 lines. File Mutation Queue: Promise chain per-file, `realpath()` resolves symlinks. 40 lines of code for correct concurrent file operations. Show via SourceReader.

- [ ] **Step 3: Write path engineering section**

`### 路径工程 — 隐形的可靠性`

~15 lines. macOS Unicode traps: NFD decomposition, narrow NBSP (AM/PM), curly quotes (French filenames). Pi's `resolveReadPath()` tries 5 variants. "隐形可靠性——用户永远不知道它存在，但没有它 5% 的文件操作莫名失败。"

- [ ] **Step 4: Write sandbox section**

`## 沙箱工程：OS 级安全边界`

~20 lines. Trail of Bits finding: "command allowlists are security theater." Isolation spectrum: seccomp → Bubblewrap → Docker → gVisor → WASM → Firecracker. Dual isolation principle: filesystem + network (both required). Claude Code's practice: Seatbelt/Bubblewrap, open-sourced as `@anthropic-ai/sandbox-runtime`.

End with `---`.

- [ ] **Step 5: Verify and commit**

```bash
npx astro build
git add src/content/chapters/11-boundary-trust.mdx
git commit -m "feat(ch11): truncation + file safety + paths + sandbox"
```

---

### Task 5: Comparisons + Demo Section + Meta-Skills + Checklist

**Files:**
- Modify: `src/content/chapters/11-boundary-trust.mdx`

- [ ] **Step 1: Write design philosophy comparison**

`## 不同产品为什么做了不同选择`

~20 lines + table comparing Pi, Claude Code, Cursor, Cline/Aider across: edit strategy, bash safety, output truncation, file safety, permission model. Include WHY column.

- [ ] **Step 2: Write demo section**

`## 动手实现`

~15 lines with run commands pointing to `demos/11-trust/`.

- [ ] **Step 3: Write meta-skills + simplification + checklist**

`## 元技能：如何判断"这是工具问题"`
Symptoms: edit fails frequently, bash hangs, output explosion, unexpected file changes.
Evaluation metrics: edit first-match rate, bash timeout rate, truncation frequency.
Tuning: HumanLayer's "start with bash + read, only add tools when bash isn't enough."

`## 简化思考`
Models getting better at exact matching → fuzzy matching less important over time.
But sandbox/permissions are NOT simplifiable — prompt injection is an external threat.

`## 检验标准`
7 items from spec.

Closing: tease Ch12 — "工具可靠了，信任机制也就位了。但你跑了一个 30 分钟的任务后发现——Agent 开始重复之前做过的工作。上下文满了。下一章，我们解决遗忘问题。"

- [ ] **Step 4: Verify and commit**

```bash
npx astro build
git add src/content/chapters/11-boundary-trust.mdx
git commit -m "feat(ch11): comparisons + demo section + meta-skills + checklist"
```

---

## Demo Tasks (Stream B — parallel to MDX stream)

### Task 6: Demo Scaffold + Both Demo Files

**Files:**
- Create: `demos/11-trust/package.json`
- Create: `demos/11-trust/tsconfig.json`
- Create: `demos/11-trust/README.md`
- Create: `demos/11-trust/src/01-fragile-tools.ts`
- Create: `demos/11-trust/src/02-defensive-tools.ts`

- [ ] **Step 1: Create package.json and tsconfig.json**

Same pattern as `demos/10-control/`. Package name: `@pi-tutorial/demo-11-trust`.

- [ ] **Step 2: Create README.md**

Brief: "Ch11 Demo: 边界与信任。对比脆弱工具（失败）和防御性工具（恢复）。"

- [ ] **Step 3: Create 01-fragile-tools.ts (~60 lines)**

Demonstrates tool failures WITHOUT defensive engineering:

```typescript
// 1. Exact-match edit that fails on smart quotes
function fragileEdit(fileContent: string, oldText: string, newText: string): string {
  const idx = fileContent.indexOf(oldText);
  if (idx === -1) throw new Error("No match found");  // No fuzzy matching, unhelpful error
  return fileContent.slice(0, idx) + newText + fileContent.slice(idx + oldText.length);
}

// 2. Bash execution with no timeout
function fragileBash(command: string): Promise<string> {
  // No timeout, no process kill, no output limit
}

// 3. No output truncation
function fragileRead(path: string): string {
  return fs.readFileSync(path, "utf-8");  // Could be 50MB
}
```

Mock mode: demonstrate each failure:
- Edit: file has `"hello"` (smart quotes), LLM sends `"hello"` (ASCII) → fails
- Bash: simulate a hanging command (setTimeout never resolves) → must Ctrl+C
- Read: simulate large output → print warning about context flood

- [ ] **Step 4: Create 02-defensive-tools.ts (~180 lines)**

Same operations but with defensive engineering:

```typescript
// 1. Fuzzy edit with normalization
function defensiveEdit(fileContent: string, oldText: string, newText: string): {
  success: boolean; result?: string; diff?: string; error?: string;
} {
  // Try exact match first
  let idx = fileContent.indexOf(oldText);
  if (idx === -1) {
    // Fuzzy: normalize both sides (smart quotes, dashes, spaces)
    const normalizedContent = normalize(fileContent);
    const normalizedOld = normalize(oldText);
    idx = normalizedContent.indexOf(normalizedOld);
  }
  if (idx === -1) {
    return { success: false, error: "No match. File contains similar text at..." };
  }
  // Uniqueness check
  // Generate diff
  return { success: true, result, diff };
}

function normalize(s: string): string {
  return s
    .replace(/[\u2018\u2019]/g, "'")   // Smart single quotes
    .replace(/[\u201C\u201D]/g, '"')   // Smart double quotes
    .replace(/[\u2013\u2014]/g, '-')   // En/em dashes
    .replace(/[\u00A0\u202F]/g, ' ')   // Non-breaking spaces
    .replace(/\s+$/gm, '');            // Trailing whitespace
}

// 2. Safe bash with timeout + process kill + output truncation
async function defensiveBash(command: string, options?: { timeout?: number; maxOutput?: number }): Promise<{
  stdout: string; exitCode: number; truncated: boolean; totalBytes: number;
}> {
  // spawn with detached: true
  // setTimeout → kill process group
  // Rolling buffer for output
  // Truncate tail if > maxOutput
}

// 3. Read with truncation
function defensiveRead(path: string, options?: { maxLines?: number }): {
  content: string; truncated: boolean; totalLines: number;
} {
  // Read file, count lines
  // If > maxLines, truncateHead and return metadata
}

// 4. Simple permission gate
function checkPermission(toolName: string): boolean {
  const needsPermission = ["edit", "write", "bash"];
  if (needsPermission.includes(toolName)) {
    console.log(`🔒 [权限] ${toolName} 需要确认`);
    return true; // In demo, auto-approve but log
  }
  return true;
}
```

Mock mode: demonstrate each defense:
- Edit: same smart quotes scenario → fuzzy match succeeds → show diff
- Bash: simulate timeout → process killed → show partial output
- Read: large file → truncated with metadata → show "truncated, 50000 lines total"
- Permission: show permission check logging

- [ ] **Step 5: Install, run, typecheck**

```bash
cd /Users/panghu/code/rsearch/pi_demo/pi-tutorial && npm install
npx tsx demos/11-trust/src/01-fragile-tools.ts  # Shows failures
npx tsx demos/11-trust/src/02-defensive-tools.ts  # Shows defenses
cd demos/11-trust && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add demos/11-trust/
git commit -m "feat(ch11): demo — 01-fragile-tools (fail) + 02-defensive-tools (recover)"
```

---

## Task 7: Polish and Push

**Files:**
- All Ch11 files

- [ ] **Step 1: Review MDX** — export const placement, SourceReader highlights, Chinese quality, theory anchors
- [ ] **Step 2: Review demos** — mock mode works, contrast is clear, types pass
- [ ] **Step 3: Build** — `npx astro build`
- [ ] **Step 4: Run demos** — both execute without error
- [ ] **Step 5: Commit and push**

```bash
git add -A && git commit -m "feat(ch11): polish boundary & trust chapter + demo" && git push origin main
```

---

## Implementation Notes

### Source Code Extraction

| Pi Source File | What to Extract | For Section |
|----------------|-----------------|-------------|
| `core/tools/edit.ts` | Three-stage matching logic | Edit section |
| `core/tools/edit-diff.ts` | `normalizeForFuzzyMatch()` | Edit section |
| `core/tools/bash.ts` | spawn + buffer + killProcessTree | Bash section |
| `core/tools/truncate.ts` | truncateHead / truncateTail | Truncation section |
| `core/tools/file-mutation-queue.ts` | Promise chain pattern | File safety section |
| `core/tools/path-utils.ts` | resolveReadPath 5 variants | Path section |

### Parallelization Strategy

Run MDX (Tasks 1-5) and Demo (Task 6) as parallel agent streams. Task 7 (polish) runs after both complete.

### Narrative Continuity

- Opening references Ch10: "Agent 有了控制回路，运行很稳定。但是..."
- Closing teases Ch12: "工具可靠了...但 Agent 开始重复之前做过的工作。上下文满了。"
