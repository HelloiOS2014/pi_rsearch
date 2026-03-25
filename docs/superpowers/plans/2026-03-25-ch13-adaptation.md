# Ch13: Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the chapter teaching how to make one agent serve many contexts without code changes — layered config, dynamic prompts, skills, model routing.

**Architecture:** MDX chapter with SourceReader referencing Pi's SettingsManager, system-prompt.ts, skills.ts, model-resolver.ts. Demo `demos/13-adapt/` with problem (hardcoded) vs solution (configurable).

**Tech Stack:** Astro 5, MDX, React Islands; TypeScript, tsx for demo.

**Spec:** `docs/superpowers/specs/2026-03-25-harness-engineering-design-v2.md` Section 7

---

## Parallel Execution Strategy

- **Stream A (MDX):** Tasks 1 → 2 → 3 (sequential, same file)
- **Stream B (Demo):** Task 4 (parallel to Stream A)
- **Final:** Task 5 (polish + push)

---

## Task 1: MDX Scaffold + Pain + Theory + Config + Dynamic Prompt

**Files:** Create `src/content/chapters/13-adaptation.mdx`

Read Pi source files FIRST:
- `pi-mono/packages/coding-agent/src/core/settings-manager.ts` — deep merge, modification tracking
- `pi-mono/packages/coding-agent/src/core/system-prompt.ts` — dynamic prompt building
- `pi-mono/packages/coding-agent/src/core/skills.ts` — SKILL.md discovery, validation
- `pi-mono/packages/coding-agent/src/core/model-resolver.ts` — pattern matching, alias preference

Create ~5 export consts from real Pi source.

Sections to write:

**`## Agent 只在我的环境里能用`** (~25 lines blockquote)
Colleague uses GPT not Claude. Different project uses tabs not spaces. Adding code-review workflow breaks coding workflow. Team has security rules Agent doesn't know.

**`## 为什么会痛：适应鸿沟`** (~15 lines)
Same model weights, infinite diversity of contexts. "Skill Issue" principle: Opus 4.6 #33→#5 by config change.
**Theory anchor:** Cost inversion — CLAUDE.md >60 lines hurts performance.

**`## 三层分离`** (~10 lines)
知识 (CLAUDE.md) / 能力 (Skills/MCP) / 策略 (Settings). Different change cadence, different owners.

**`## 分层配置`** (~25 lines + table)
Enterprise → Project → User → Local → CLI. Pi vs Claude Code vs Cursor comparison with WHY.
Deep merge strategy. Modification tracking. File locking. Config value resolution (literal / env var / shell command).

**`## 动态 System Prompt`** (~20 lines)
Modular assembly. Tool-aware guideline injection (if bash disabled, no bash guidelines).
**Theory anchor:** "陈旧指令是负价值——消耗注意力提供零信息。"
Claude Code: 110+ components with token budgets.

End with `---`.

- [ ] Build + commit: `"feat(ch13): scaffold + pain + theory + config + dynamic prompt"`

---

## Task 2: MDX Skills + Model Routing + Pi Deep Dive

Append after last `---`.

**`## Skills：无代码能力扩展`** (~25 lines)
Meta-tool concept. Progressive disclosure (metadata → instructions → resources).
**Theory anchor:** Cost inversion — 50 skills × 1000 tokens each = "笨区". Only metadata resident.
Pi implementation: SKILL.md discovery, validation, dedup, XML injection.
**Ch8 boundary:** Ch8 covered user-facing concepts. Ch13 focuses on engineering internals.

**`## 教学案例：CLAUDE.md 的精简之旅`** (~20 lines)
Before: 200 lines auto-generated, +20% token cost, no quality improvement.
After: 45 lines hand-crafted, better performance, lower cost.
Principle: CLAUDE.md is not documentation — it's a "memo pad for the agent."

**`## 模型路由与选择`** (~15 lines)
Routing spectrum: uniform → manual → task-based → cascade → skill-specified → plan-execute.
Pi's model-resolver: last-colon split, alias preference, glob support.

**`## 资源管理`** (~10 lines)
ResourceLoader: 5 resource types unified. Path metadata. Directory tree traversal. Override hooks for testing.

End with `---`.

- [ ] Build + commit: `"feat(ch13): skills + CLAUDE.md case study + model routing + resources"`

---

## Task 3: MDX Comparisons + Demo Section + Meta + Checklist + Polish

Append closing sections:

**`## 不同产品为什么做了不同选择`** — table (Pi/Claude Code/Cursor/LangChain)
**`## 动手实现`** — point to demos/13-adapt/
**`## 元技能`** — "先减后加" tuning path, 60-line rule, Working Backwards
**`## 简化思考`** — Models learn style from code, but security policies not simplifiable
**`## 检验标准`** — 6 items

Closing tease Ch14: "Agent 可控、可靠、有记忆、能适应。但只有你一个人能在终端里用它。你的 CI 需要它，你的 IDE 需要它，你的团队需要策略审批。下一章，我们让 Agent 到达用户手中。"

Then POLISH: exports at top, highlights correct, Chinese quality, no unused imports.

- [ ] Build + commit + (don't push yet, wait for Task 5)

---

## Task 4: Demo Scaffold + Both Files

Create `demos/13-adapt/`:
- package.json, tsconfig.json, README.md
- `src/01-hardcoded.ts` (~60 lines) — Agent with hardcoded prompt, hardcoded tools, can't switch models. Change project = change code.
- `src/02-configurable.ts` (~180 lines) — Implements simplified: LayeredSettings (global + project merge), DynamicPrompt (tool-aware guidelines), SkillLoader (SKILL.md discovery), ModelSelector (pattern matching).

Mock mode for both. Contrast: hardcoded fails on new project, configurable adapts.

- [ ] Install, run, typecheck, commit

---

## Task 5: Final Polish + Push

- [ ] Review all files, verify build, run demos, push to origin main
