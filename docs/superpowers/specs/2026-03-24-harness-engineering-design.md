# Harness Engineering — 从 Agent 内核到生产级产品

## 设计规格文档

**日期**: 2026-03-24
**状态**: 设计完成，待实施
**前置**: Part 1 (Ch0-8) 已完成

---

## 1. 定位与目标

### 1.1 定位

Part 2 独立系列，6 个章节（Ch9-Ch14）。Part 1（Ch0-8）教读者理解和构建 Agent 内核。Part 2 教一门新学科——如何将内核工程化为可靠、可配置、可交付的产品。Ch9 建立 Harness Engineering 的概念框架和理论基础，Ch10-Ch14 逐层实践。

### 1.2 核心论点

Agent 内核是"大脑"，Harness 是"身体"。大脑只占整个系统的一小部分（Pi: agent-core ~1,900 行 vs coding-agent/src ~40,000 行，比例约 1:21），身体负责感知、行动、记忆、适应环境。产品的差异化不在大脑（大家用同一个 LLM），而在身体的工程质量。

### 1.3 教学哲学

"通过 Pi 学通用 Harness Engineering"——Pi 是教学载体，但目标是让读者掌握**通用的 Harness 工程能力**，能迁移到任何 Agent 框架。

每章的教学节奏：

```
1. 工程命题（为什么这个问题重要，不解决会怎样）
2. 通用模式（业界怎么思考这个问题，有哪些经典方案）
3. Pi 的解法（源码解剖，设计决策分析）
4. 替代方案对比（Claude Code / Cursor / LangGraph 等怎么做）
5. 动手实现（读者给自己的 Agent 内核实现这个能力）
6. 检验标准（怎么判断你的实现是否合格）
```

### 1.4 读者终态

- 能独立设计并实现一个完整的 Agent Harness——从零开始给任意 Agent 内核包一层生产级外壳
- 能深度理解现有 Agent 产品（Claude Code、Cursor 等）的架构决策，能评估、选型、定制，能在现有 Harness 上做高质量的二次开发

### 1.5 前置知识

Part 1 全部内容，尤其 Ch2 核心循环、Ch3 工具系统、Ch6 整合构建、Ch8 扩展系统。

### 1.6 贯穿全 Part 的 Demo 项目

读者从 Part 1 的 Demo 06（已有的裸 Agent）出发，每章给它叠加一层 Harness 能力。到 Part 2 结束时，这个 Agent 从"能跑"变成"能用"。

---

## 2. 五章结构总览

| 章节 | 工程命题 | 核心问题 | Pi 标本 | 通用模式 |
|------|---------|----------|---------|---------|
| Ch9 | 编排 | 如何把内核变成可控系统？ | AgentSession ~3,180 行 | Orchestrator 模式 |
| Ch10 | 可靠性 | 如何让行动值得信赖？ | edit/bash/tools ~1,270 行 | 防御性工具工程 |
| Ch11 | 适应性 | 如何适应不同场景？ | Settings + Skills + Prompt + ModelResolver + ResourceLoader ~3,140 行 | 分层配置 + 动态提示词 |
| Ch12 | 记忆 | 如何在有限窗口内长期工作？ | Session + Compaction ~2,750 行 | 会话树 + 渐进式遗忘 |
| Ch13 | 交付 | 如何送达不同环境的用户？ | Interactive/Print/RPC/SDK ~5,700 行 | 多态交付模式 |

---

## 3. Ch9：编排 — "如何把一个 Agent 内核变成可控的系统？"

### 3.1 开篇：8:1 问题

用具体对比引入：裸 Agent ~300 行 vs Pi coding-agent 15,000 行 vs Claude Code 50,000-100,000 行。列出裸 Agent 在真实使用中立刻遇到的五个问题（对话丢失、换模型要改代码、工具出错无恢复、上下文满了崩溃、加功能要改源码），恰好对应 Part 2 五章。

核心类比："如果你只实现了 Agent Loop，你拥有的是一个大脑。但大脑不能自己活着——它需要心跳（生命周期管理）、神经系统（事件分发）、免疫系统（错误恢复）、感知系统（权限与审批）。"

### 3.2 通用模式：Agent Orchestrator

**Orchestrator ≈ 应用服务器**：Agent Loop ≈ 应用代码，Orchestrator ≈ Tomcat / Express / Kestrel。

**七项核心职责**：

1. **生命周期管理** — 启动、运行、暂停、恢复、优雅关闭
2. **事件分发** — Agent 事件路由到持久化、UI、扩展等消费者
3. **上下文组装** — system prompt + history + injections → LLM 输入
4. **请求协调** — steering / follow-up / custom context 三种消息队列
5. **控制与守卫** — 停止条件、循环检测、权限评估、预算管控
6. **错误恢复** — 重试策略、溢出恢复、优雅降级
7. **可观测性** — 事件流设计、完整性保证、诊断信息

**设计光谱**：从"薄 Orchestrator"到"厚 Orchestrator"（Vercel AI SDK → Pi → Claude Code → LangGraph）

**自治光谱**：human-in-the-loop（每步审批）→ human-on-the-loop（选择性干预）→ human-out-of-the-loop（仅监控）

### 3.3 Pi 的解法：AgentSession 解剖

#### 3.3.1 依赖注入与子系统协调

AgentSession 不自己创建任何子系统，全部通过构造参数接收（8 个协作者：Agent Core、SessionManager、SettingsManager、ModelRegistry、ResourceLoader、ExtensionRunner、BashExecutor、Compaction System）。分析为什么不在内部 new。

#### 3.3.2 事件分发与异步队列

事件路由：Agent Event → SessionManager.append() + ExtensionRunner.dispatch() + UI callback + Auto-compaction check。

`_agentEventQueue` 的 promise chain 设计——为什么事件必须串行处理（防止持久化和 UI 渲染的竞态条件）。

事件类型全景：10 种核心事件 + 4 种 Session 特有事件 + 20+ 种扩展事件。

关键设计决策：工具输出在事件流中保留完整版本，发给 LLM 的是截断版本。

#### 3.3.3 消息队列与请求协调

三种消息注入机制（steering / follow-up / next-turn messages "asides"），分析为什么不能合并为一种。对应源码中的 `_steeringMessages`、`_followUpMessages`、`_pendingNextTurnMessages`。

Pending bash messages（`_pendingBashMessages`）的设计——为什么 bash 输出要延迟到 turn 结束后才注入。

#### 3.3.4 控制与守卫

- 停止条件：自然完成 / turn 限制 / 预算限制 / abort 信号 / 不可恢复错误
- 权限模型：Pi 的 tool hooks（beforeToolCall / afterToolCall），对比 Claude Code 的 5 步评估链
- Thinking Level 管理：动态调节推理强度，模型切换时自动 clamping

#### 3.3.5 错误恢复

- Auto-retry：可重试错误检测 → 指数退避 → 错误消息从 Agent 状态移除但保留在 Session 中
- Overflow Recovery：检测溢出 → 移除错误 → 自动压缩 → 重试 → `_overflowRecoveryAttempted` 防循环标志
- 优雅降级：Extension 失败不阻塞 Agent、Bash 执行失败作为结果返回而非抛异常

#### 3.3.6 启动序列

`main.ts` 的 6 阶段启动流程：CLI 参数解析 → Settings 加载 → Model Registry 构建 → Resource Loading → Session 恢复 → Mode 选择。每个阶段的错误处理。

优雅关闭：多个 AbortController 的协调（compaction / retry / bash / branch summary）。

#### 3.3.7 可观测性

`subscribe(listener)` 和 `getSessionStats()`。`getContextUsage()` 的设计——只信任最近一次压缩后的 usage 数据。

### 3.4 替代方案对比

Pi vs Claude Code vs LangGraph vs OpenAI Agents SDK vs Vercel AI SDK，维度：Orchestrator 厚度、事件分发、错误恢复、权限模型、停止条件、人机协作、多 Agent、可观测性。

### 3.5 动手实现

7 步构建 ~250-350 行的 mini orchestrator：AgentHarness 类 → 事件分发 → 消息队列 → 停止条件 → auto-retry → 启动序列 → 优雅关闭。

### 3.6 检验标准

- 启动/响应/恢复对话
- Steering 中途改变行为
- 出错时自动重试（最多 3 次，指数退避）
- 上下文溢出时自动压缩并重试
- 超过 turn 限制时自动停止
- 事件流完整

---

## 4. Ch10：可靠性 — "如何让 Agent 的行动值得信赖？"

### 4.1 开篇：复合错误率问题

单次 85% 成功率 → 10 步任务 19.7% 端到端成功率。防御性工具工程的核心理念："假设 LLM 经常犯错，但系统仍然正确"。

### 4.2 LLM 工具的常见失败模式

6 种失败模式（参数幻觉、递归循环、指令漂移、上下文淹没、多 Agent 级联、安全边界突破），以 Replit "Rogue Agent" 事件为案例。

### 4.3 防御性工具工程的七条原则

1. 架构约束优于行为约束
2. 歧义时失败（Fail-Closed）
3. 提供可自修复的错误信息
4. 最小化工具集，消除歧义
5. 分离信息获取与状态变更
6. 输出截断是一等公民
7. Operations 抽象实现环境解耦

补充：工具 Schema 设计本身就是可靠性机制（TypeBox + 精确描述）。

### 4.4 循环检测

**注意：Pi 当前未实现循环检测。** 此节介绍的是业界通用模式（如 StrongDM Attractor 规范中的算法），作为读者自行实现的参考。

通用算法：滑动窗口 + 工具调用签名追踪（name + args hash），检测长度 1-3 的重复模式，注入 steering 消息强制改变策略。

### 4.5 错误消息工程

为 LLM 设计 vs 为人类设计的区别。自修复反馈循环。案例对比：好 vs 差的错误消息（Aider/Cline 数据：好的错误消息设计提升 edit 成功率 10-25%）。

### 4.6 Pi 的工具工程深度解剖

#### 4.6.1 Edit 工具 — 容错编辑

三阶段匹配（精确 → 模糊 → 报错）。`normalizeForFuzzyMatch()` 处理 Unicode NFKC、智能引号、Unicode 横线、特殊空格。UTF-8 BOM 处理。行尾保持。唯一性验证。Diff 生成。

对比业界：精确+模糊（Pi/Claude Code）vs Sketch+Apply（Cursor）vs 多格式适配（Aider/Cline）vs 全文件重写。

#### 4.6.2 Bash 工具 — 安全执行

Rolling Buffer + Temp File 混合策略。进程树杀死（`detached: true`）。Command Prefix。Operations 抽象。

安全维度：Trail of Bits 发现"命令白名单是安全幻觉"。OS 级隔离光谱（seccomp → Bubblewrap → Docker → gVisor → WASM → Firecracker）。Claude Code 的 Seatbelt/Bubblewrap 实践。

#### 4.6.3 输出截断

双模策略（truncateHead for 文件读取，truncateTail for bash 输出）。UTF-8 边界安全。元数据驱动的用户引导。

对比业界：硬截断 vs Tool Result Clearing vs Observation Masking vs Pointer-Based Storage vs Anchored Summarization。

#### 4.6.4 文件变更安全

File Mutation Queue：Promise chain per-file 串行。`realpath()` 解析符号链接。自动清理。

#### 4.6.5 路径工程

macOS 上的 Unicode 陷阱：NFD 分解、窄 NBSP、Curly quote。Pi 的 `resolveReadPath()` 5 种变体匹配。

### 4.7 沙箱工程

独立小节。隔离光谱（6 种方案对比）。文件系统 + 网络双重隔离原则。Claude Code 的开源 `@anthropic-ai/sandbox-runtime`。

### 4.8 Operations 抽象

可测试性（Mock operations）。可移植性（本地 → SSH → Docker）。可组合性。

### 4.9 替代方案对比

Pi vs Claude Code vs Cursor vs Cline/Aider，维度：Edit 策略、Bash 安全、输出截断、文件安全、权限模型。

### 4.10 动手实现

4 步：可靠 Edit 工具（~80 行）→ 安全 Bash 工具（~100 行）→ 文件变更队列（~40 行）→ 权限门控（~30 行）。

### 4.11 检验标准

Edit 模糊匹配、多匹配拒绝、Bash 超时杀进程、大输出截断、截断元数据、并发串行、权限门控、循环检测触发、错误消息自修复。

---

## 5. Ch11：适应性 — "如何让同一个 Agent 适应不同场景？"

### 5.1 开篇：一个 Agent，一千种环境

"三层分离"架构原则：知识层（CLAUDE.md）→ 能力层（Skills/MCP/Tools）→ 策略层（Settings/Permissions）。

### 5.2 分层配置

通用层级模型（企业 → 项目 → 用户 → 本地 → CLI）。Pi 的 deep merge 策略（基本类型覆盖、嵌套对象浅合并）。修改追踪与部分持久化。文件锁与容错。配置值解析三种形态（字面量 / 环境变量 / Shell 命令 + 缓存）。

### 5.3 动态 System Prompt 构建

模块化组装模型。Pi 的双路径设计（自定义 vs 默认）。工具感知指导原则注入——为什么不硬编码。

Claude Code 的规模：110+ 组件，每个标注 token 消耗。

Prompt-as-Code：语义化版本控制、CI/CD、A/B 测试、即时回滚、解耦部署。

### 5.4 Skills — 无代码能力扩展

Skills 的本质：meta-tool。渐进式披露（元数据 → 完整指令 → 辅助资源）。

Pi 的实现：SKILL.md 发现算法、验证流水线、去重策略、XML 注入格式。

**注意：Ch8（Part 1）已覆盖 Skills 的用户面概念**（SKILL.md 格式、发现路径、`disable-model-invocation`、`resources_discover` 集成）。Ch11 聚焦 Ch8 未涉及的**工程内部视角**：验证管道的实现细节、名称规范的设计决策、符号链接去重的原理、冲突诊断的架构。读者已有的 Ch8 知识是基础，Ch11 在此之上建立更深的理解。

跨框架对比：Pi Skills vs Claude Code Skills vs Cursor Rules vs MCP Tools。

补充：Prompt Templates 作为 Skills 的轻量替代。可扩展性光谱：硬编码 prompt → Template → Skill → Extension → MCP Server。

### 5.5 模型路由与选择

路由策略光谱：统一最强 → 手动切换 → 任务分类 → 级联 → Skill 指定 → Plan-Execute 分离。

Pi 的模型解析器：最后冒号拆分、别名偏好、Glob 支持、回退链。

### 5.6 资源管理系统

ResourceLoader（869 行）：5 种资源统一管理、路径元数据追踪、上下文文件目录树遍历、Override Hooks。

### 5.7 MCP — 动态能力发现

工具集从编译时决策变为运行时发现。上下文成本问题。延迟加载方案（`defer_loading`）。

### 5.8 替代方案对比

Pi vs Claude Code vs Cursor vs LangChain，维度：配置层级、Prompt 构建、Skills、模型路由、动态能力、上下文管理。

### 5.9 动手实现

4 步：分层配置（~100 行）→ 动态 Prompt 构建器（~80 行）→ 简化版 Skill 系统（~60 行）→ 模型选择器（~50 行）。

### 5.10 检验标准

配置继承覆盖、工具感知指导原则、Skill 注入和触发、model:thinking-level 解析、配置解析容错。

---

## 6. Ch12：记忆 — "如何在有限窗口内维持长期工作？"

### 6.1 开篇：遗忘的代价

反直觉洞见：在 LLM 上下文中"保留"是昂贵的（每个驻留 token 消耗注意力），"遗忘再取回"是廉价的（一次工具调用）。最优策略是"精准保留最少的高信号 token，其余按需恢复"。

### 6.2 记忆层次结构

L1（生成窗口 ≈ CPU Cache）→ L2（工作集 ≈ RAM）→ L3（会话历史 ≈ Swap）→ L4（跨会话记忆 ≈ 磁盘）。

Pichay 研究数据：21.8% 结构性浪费，工具结果中位数放大因子 84.4x。

### 6.3 压缩 vs 摘要 vs 清除

三种策略对比：Token 清除（零幻觉、50-70% 压缩）vs LLM 摘要（高压缩、有风险）vs Observation Masking（保留推理链，去除数据）。

生产实践：层叠使用（Tool Result Clearing → Thinking Clearing → LLM Summarization）。

### 6.4 会话持久化与分支

Git 类比。ContextBranch 研究量化结果（质量 +2.5%，上下文 -58.1%）。通用数据模型（Entry + parentId DAG + leafId 指针）。

### 6.5 Pi 的解法：会话管理深度解剖

#### 6.5.1 JSONL 树状存储

SessionManager（1,410 行）。文件格式。9 种 Entry 类型。`buildSessionContext()` 核心逻辑。持久化策略（懒写入）。

#### 6.5.2 分支机制

`branch()` = 一行代码移动 leaf 指针。带摘要的分支（LLM 生成，maxTokens=2048，带前言）。

#### 6.5.3 Compaction 系统

两阶段摘要（历史 + Turn 前缀，并行执行）。切点算法（向后累加，不在 toolResult 处切，检测 splitTurn）。Token 估算（chars/4 保守启发式）。结构化摘要格式（Goal / Constraints / Progress / Decisions / Next Steps / Critical Context）。迭代更新。文件操作追踪（read-files / modified-files XML 标签）。

#### 6.5.4 会话迁移

v1→v2（添加树结构）→ v2→v3（重命名 role）。自动运行，向后兼容。

### 6.6 何时触发压缩？

5 种方案对比。反直觉发现：75% 比 95% 更好。

### 6.7 保留什么、丢弃什么？

始终保留：指令、未解决问题、文件路径/URL、错误信息。优先丢弃：旧工具输出、中间推理、重复内容、旧 thinking block。

Initializer-Executor 模式：Anthropic 的双 Agent 架构，刻意的记忆外化策略。

文件系统作为 L4 记忆（Manus 的 todo.md 模式）。

Factory.ai 数据：结构化摘要 3.70/5 vs Anthropic 3.44/5 vs OpenAI 3.35/5。多会话保留率仅 37%。

### 6.8 替代方案对比

Pi vs Claude Code vs LangGraph vs Manus，维度：持久化格式、分支支持、压缩策略、触发时机、Token 估算、迁移策略、跨会话记忆。

### 6.9 动手实现

4 步：JSONL 会话持久化（~120 行）→ 分支支持（~30 行）→ 基础 Compaction（~150 行）→ 文件操作追踪（~30 行）。

### 6.10 检验标准

持久化恢复、分支隔离、正确路径回溯、自动 compaction、摘要 + 保留消息、切点不在 toolResult、文件列表追踪。

---

## 7. Ch13：交付 — "如何将 Agent 送达不同环境的用户？"

### 7.1 开篇：一个核心，多种面孔

核心抽象——事件订阅模式：AgentSession → event stream → 消费者自行适配。核心不知道也不关心谁在消费事件。

### 7.2 交付层架构

6 层模型：交付界面 → 传输层 → 会话管理 → 策略权限 → 编排层 → Agent 核心。

传输协议光谱：stdio / SSE（已弃用）/ Streamable HTTP / WebSocket。MCP 弃用 SSE 的原因分析。

### 7.3 Pi 的三种交付模式

核心抽象：`session.subscribe()` — 所有模式通过同一个接口连接。

#### 7.3.1 Interactive Mode（TUI）— 4,570 行

富终端交互。事件订阅 → `streamingComponent` 累积 → 逐 delta 渲染。Extension UI 完整实现。

#### 7.3.2 Print Mode（CLI）— 125 行

单次执行。两种输出模式（text / json）。"一个 subscribe 就是一种交付"——125 行代码的威力。

#### 7.3.3 RPC Mode（Headless）— 646 行

JSON stdin/stdout 协议。18 种命令类型。stdout 重定向到 stderr。自定义 JSONL 解析器（Unicode 安全）。Extension UI 异步 request/response。

#### 7.3.4 SDK — 376 行

TypeScript API。`createAgentSession()` 工厂函数。与 RPC 的对比（同进程 vs 独立进程，类型安全 vs JSON）。

### 7.4 Extension UI 的优雅降级

`ExtensionUIContext` 在不同模式下的不同实现。不支持的能力返回 stub 而非抛异常。`hasUI` 判断。

### 7.5 多 Agent 交付

三种模式：子 Agent（Orchestrator-Worker，Claude Code 的 Agent tool）、Handoff（OpenAI 的接力模式）、并行 Agent（Cursor 的 worktree 隔离）。

未解决的基础设施问题：端口冲突、数据库竞态、环境变量冲突。

Anthropic 多 Agent 研究系统数据：质量 +90.2%，token ~15x。

### 7.6 Hook 系统——交付层的可扩展性

Claude Code：18 种事件 × 4 种 Hook 类型（command / http / prompt / agent）。决策控制能力（allow / deny / modify / inject / halt）。产品化用例（安全、质量、审计、上下文注入、成本控制）。

### 7.7 生产部署

部署模式光谱（临时 / 长运行 / 混合）。资源需求。状态管理（Redis / StatefulSet / 外部数据库）。会话恢复（session_id + resume）。

### 7.8 替代方案对比

Pi vs Claude Agent SDK vs OpenAI Agents SDK vs LangGraph，维度：交付模式、传输协议、子 Agent、Hook 系统、部署模式、IDE 集成、HTML 导出。

### 7.9 动手实现

4 步：Print Mode（~30 行）→ 简化版 RPC Mode（~80 行）→ Hook 机制（~60 行）→ HTML 导出（~50 行）。

### 7.10 检验标准

Print mode 事件流输出、RPC 双向通信、PreToolUse hook 拦截、HTML 离线查看、三种模式共享 AgentSession。

---

## 8. Demo 项目设计

### 8.1 渐进式叠加

从 Part 1 的 Demo 06（裸 Agent）出发，每章叠加一层：

```
Demo 06 (裸 Agent, ~300 行)
  + Ch9: Mini Orchestrator (~250 行) → Demo 10-orchestration
  + Ch10: 可靠工具 (~250 行) → Demo 11-reliability
  + Ch11: 配置 + Prompt + Skills (~290 行) → Demo 12-adaptability
  + Ch12: 会话 + Compaction (~330 行) → Demo 13-memory
  + Ch13: 交付层 (~220 行) → Demo 14-delivery
```

**注意**：Demo 编号从 10 开始，因为 Part 1 已使用 01-09（其中 09-graduation 是 Part 1 的毕业项目）。

最终产物：~1,640 行的 Mini Harness，涵盖编排、可靠工具、分层配置、会话管理、多模式交付。

### 8.2 Mock 模式

所有 Demo 支持 Mock 模式（无 API Key 时自动切换），与 Part 1 保持一致。

### 8.3 每章 Demo 独立可运行

虽然 Demo 是渐进叠加的，但每章的 Demo 也应该能独立运行（包含前序章节的产出作为依赖）。

---

## 9. 与 Part 1 的关系

### 9.1 不重复的内容

| Part 1 已覆盖 | Part 2 的处理方式 |
|--------------|-----------------|
| Extension 系统（Ch8） | 引用"如 Ch8 所述"，不重讲 |
| TUI 架构（Ch8） | 引用，聚焦"作为交付模式"的视角 |
| Session 结构（Ch6） | 深化，从"怎么用"升级到"怎么设计" |
| System Prompt 接口（Ch6） | 深化，从"接口"升级到"动态构建工程" |
| Tool Schema（Ch3） | 深化，从"怎么定义"升级到"怎么实现可靠工具" |

### 9.2 需要补充的 Part 1 前向引用

在 Part 1 的适当位置添加前向引用，提示读者"Part 2 会深入这个主题"。具体位置待实施时确定。

---

## 10. 技术参考

### 10.1 Pi 源码引用

| 文件 | 行数 | 对应章节 |
|------|------|---------|
| `core/agent-session.ts` | 3,182 | Ch9 |
| `core/tools/edit.ts` | 233 | Ch10 |
| `core/tools/edit-diff.ts` | 310 | Ch10 |
| `core/tools/bash.ts` | 329 | Ch10 |
| `core/tools/truncate.ts` | 266 | Ch10 |
| `core/tools/file-mutation-queue.ts` | 40 | Ch10 |
| `core/tools/path-utils.ts` | 95 | Ch10 |
| `core/settings-manager.ts` | 953 | Ch11 |
| `core/skills.ts` | 484 | Ch11 |
| `core/system-prompt.ts` | 211 | Ch11 |
| `core/model-resolver.ts` | 628 | Ch11 |
| `core/resource-loader.ts` | 869 | Ch11 |
| `core/session-manager.ts` | 1,410 | Ch12 |
| `core/compaction/compaction.ts` | 817 | Ch12 |
| `core/compaction/branch-summarization.ts` | 354 | Ch12 |
| `modes/interactive/interactive-mode.ts` | 4,570 | Ch13 |
| `modes/print-mode.ts` | 125 | Ch13 |
| `modes/rpc/rpc-mode.ts` | 646 | Ch13 |
| `core/sdk.ts` | 376 | Ch13 |
| `core/prompt-templates.ts` | 299 | Ch11 |
| `core/resolve-config-value.ts` | 105 | Ch11 |
| `core/event-bus.ts` | 34 | Ch9, Ch13 |
| `core/compaction/utils.ts` | 170 | Ch12 |
| `modes/rpc/rpc-types.ts` | 264 | Ch13 |
| `modes/rpc/rpc-client.ts` | 506 | Ch13 |
| `main.ts` | 874 | Ch9 |

### 10.2 业界参考框架

| 框架 | 对比维度 |
|------|---------|
| Claude Code / Claude Agent SDK | 编排、权限、Hook、交付、部署 |
| Cursor | Edit 策略、并行 Agent、Rules 系统 |
| LangGraph | Checkpoint、图引擎、LangSmith |
| OpenAI Agents SDK | Handoffs、Guardrails |
| Vercel AI SDK | 极薄 Orchestrator、stopWhen |
| Cline / Aider | 多格式 Edit、开源实践 |
| Manus | 文件系统作为记忆、todo.md |
| Factory.ai | 结构化摘要、压缩评估 |
| MCP | 动态能力发现、传输抽象 |
