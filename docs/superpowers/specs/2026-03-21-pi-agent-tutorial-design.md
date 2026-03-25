# Pi Agent 深度教程设计文档

> **项目名称**：pi-tutorial
> **方案**：C — 双轨并行（解剖 + 重建）
> **技术栈**：Astro + MDX + Remotion + TypeScript
> **目标受众**：有全栈经验的开发者，目标是理解 Agent 原理并构建自己的通用 Agent 框架
> **输出形式**：分章节交互式文档 + 可运行 Demo + Remotion 动画/视频
> **章节数**：9 章（第 0-8 章）+ 6 个附录（A-F）

---

## 零、关键实施决策

### 0.1 Pi 源码版本锁定

Pin 到特定 Pi commit（而非 latest），防止源码行号漂移：
- `pi-mono/` 使用 git submodule 锁定到具体 commit hash
- SourceReader 组件尽量用**函数名锚点**而非行号，行号仅作辅助
- 提供 `scripts/validate-references.ts` 脚本，CI 中校验所有行号引用是否仍然有效
- Pi 版本升级时，运行校验脚本 → 修复漂移的引用 → 更新 submodule

### 0.2 Demo 测试与运行策略

| 类型 | 运行方式 | 测试策略 |
|------|----------|----------|
| **可嵌入 demo**（01-04, 大部分 05, 07-comparison） | StackBlitz WebContainers | Mock LLM API（固定响应），CI 中验证编译通过 |
| **需本地运行 demo**（05-proxy-transport, 07-oauth-flow, 06-my-agent/bash） | 本地 `npx tsx` | 提供录制终端输出作为 fallback 展示 |
| **所有 demo** | — | 每个 demo 有 `expected-output.md` 描述预期行为 |

`demos/shared/src/config.ts` 职责：
- 从环境变量读取 API Key（`ANTHROPIC_API_KEY` 等）
- 提供 `createMockStream()` 用于无 API Key 时的本地测试
- StackBlitz 环境中自动切换到 mock 模式

### 0.3 动画分级

| 级别 | 数量 | 标准 | 处理方式 |
|------|------|------|----------|
| **Tier 1 必做** | 10 | 核心概念，纯文字难以传达 | Remotion 动画 + `<Player>` 嵌入 |
| **Tier 2 增强** | 10 | 有助于理解，但文字也能讲清 | 优先实现，可降级为 SVG 动图 |
| **Tier 3 可选** | 10 | 简单概念，静态图足够 | 先用静态 SVG/图表，有时间再升级 |

Tier 1（必做）：V00, V01, V02, V04, V08, V12, V15, V19, V24, V26
Tier 2（增强）：V05, V06, V09, V10, V16, V20, V22, V25, V27, V29
Tier 3（可选）：V03, V07, V11, V13, V14, V17, V18, V21, V23, V28

### 0.4 分阶段交付

| 阶段 | 范围 | 预期产出 |
|------|------|----------|
| **V1** | Chapter 0-3 + 核心组件（SourceReader, CodeComparison, VideoEmbed）+ Tier 1 动画前 4 个 | 可独立使用的"Agent 核心原理"教程 |
| **V2** | Chapter 4-6 + InteractiveDemo + 剩余 Tier 1 动画 | 完整的"理解+构建"教程 |
| **V3** | Chapter 7-8 + 附录 + Tier 2 动画 + QuizBlock + ProgressTracker | 完整教程 + 进阶内容 |

### 0.5 Remotion 组件共享策略

- 动画组件统一在 `remotion/src/sequences/` 中开发（Remotion 项目，可独立 `remotion studio` 预览）
- Astro 中通过 `src/components/remotion/VideoEmbed.tsx` 用 `@remotion/player` 的 `<Player>` 组件嵌入
- Fallback：对不支持 WebAssembly 的环境，提供预渲染 MP4（存放在 `public/videos/`）

### 0.6 URL 结构

```
/                           → 首页
/00-overview                → 第 0 章
/01-agent-panorama          → 第 1 章
...
/08-advanced                → 第 8 章
/appendix/api-reference     → 附录 A
/appendix/glossary          → 附录 B
...
```

### 0.7 每章完成定义（Definition of Done）

- [ ] MDX 内容完成并审校
- [ ] 所有 SourceReader 行号引用经 validate-references 脚本验证
- [ ] 所有 demo 编译通过（mock 模式）
- [ ] 可嵌入 demo 在 StackBlitz 中可运行
- [ ] Tier 1 动画（如有）渲染正确
- [ ] QuizBlock 题目编写完成
- [ ] ProgressTracker 状态正确更新

---

## 一、项目结构

```
pi-tutorial/
├── astro.config.mjs
├── package.json                        # workspace root
├── tsconfig.json
│
├── src/                                # Astro 前端项目
│   ├── content/                        # 教程内容（MDX）
│   │   ├── config.ts                   # Content Collections schema
│   │   └── chapters/
│   │       ├── 00-overview.mdx         # 全景导读
│   │       ├── 01-agent-panorama.mdx   # 第1章：Agent 全景
│   │       ├── 02-core-loop.mdx        # 第2章：核心循环
│   │       ├── 03-tool-system.mdx      # 第3章：工具系统
│   │       ├── 04-streaming.mdx        # 第4章：流式与事件
│   │       ├── 05-multi-model.mdx      # 第5章：多模型统一
│   │       ├── 06-build-agent.mdx      # 第6章：构建完整 Agent
│   │       ├── 07-comparison.mdx       # 第7章：框架对比
│   │       ├── 08-advanced.mdx         # 第8章：进阶扩展
│   │       └── appendix/
│   │           ├── A-api-reference.mdx
│   │           ├── B-glossary.mdx
│   │           ├── C-troubleshooting.mdx
│   │           ├── D-cli-reference.mdx
│   │           ├── E-settings-schema.mdx
│   │           └── F-custom-models.mdx
│   │
│   ├── components/                     # 可复用组件
│   │   ├── tutorial/                   # 教程专用交互组件（React Islands）
│   │   │   ├── SourceReader.tsx        # Pi 源码阅读器（行号高亮、注释浮层）
│   │   │   ├── CodeComparison.tsx      # 左右对比（Pi 原版 vs 你的实现）
│   │   │   ├── InteractiveDemo.tsx     # 内嵌可运行 demo（StackBlitz）
│   │   │   ├── ArchitectureDiagram.tsx # 可交互架构图（hover 展开细节）
│   │   │   ├── EventTimeline.tsx       # 事件时间线（可点击展开 payload）
│   │   │   ├── ConceptCard.tsx         # 概念/术语卡片
│   │   │   ├── QuizBlock.tsx           # 章节小测验
│   │   │   ├── ProgressTracker.tsx     # 学习进度（localStorage）
│   │   │   ├── ComparisonTable.tsx     # 可排序/筛选对比表
│   │   │   ├── StateMachine.tsx        # 状态机可视化
│   │   │   └── PriorityChain.tsx       # 优先级链/降级链可视化
│   │   │
│   │   ├── remotion/                   # Remotion Player Islands
│   │   │   ├── VideoEmbed.tsx          # 通用 <Player> wrapper
│   │   │   └── sequences/             # 动画组件（下方详列）
│   │   │
│   │   └── layout/                    # Astro 布局组件
│   │       ├── Sidebar.astro           # 章节导航
│   │       ├── ChapterLayout.astro     # 章节页面布局
│   │       ├── TableOfContents.astro   # 页内目录
│   │       └── Footer.astro
│   │
│   ├── lib/                            # 共享工具
│   │   ├── pi-source.ts               # Pi 源码加载/行号解析
│   │   ├── progress.ts                # localStorage 进度管理
│   │   └── syntax.ts                  # 语法高亮配置
│   │
│   ├── layouts/
│   │   └── TutorialLayout.astro
│   │
│   ├── pages/
│   │   ├── index.astro                 # 首页
│   │   └── [...slug].astro             # 动态章节路由
│   │
│   └── styles/
│       └── global.css                  # Tailwind + 自定义
│
├── demos/                              # 独立可运行 Demo
│   ├── shared/                         # 共享工具
│   │   ├── package.json
│   │   └── src/
│   │       ├── utils.ts
│   │       └── config.ts              # API key 管理
│   │
│   ├── 01-hello-agent/
│   │   ├── package.json
│   │   └── src/
│   │       ├── 01-raw-llm-call.ts
│   │       ├── 02-add-tool-call.ts
│   │       └── 03-agent-loop.ts
│   │
│   ├── 02-mini-loop/
│   │   ├── package.json
│   │   └── src/
│   │       ├── 01-single-turn.ts
│   │       ├── 02-multi-turn.ts
│   │       ├── 03-with-events.ts
│   │       ├── 04-steering.ts
│   │       ├── 05-abort.ts
│   │       └── 06-edge-cases.ts
│   │
│   ├── 03-tool-system/
│   │   ├── package.json
│   │   └── src/
│   │       ├── 01-schema-validation.ts
│   │       ├── 02-tool-registry.ts
│   │       ├── 03-parallel-exec.ts
│   │       ├── 04-hooks.ts
│   │       ├── 05-custom-tool.ts
│   │       └── 06-update-then-fail.ts
│   │
│   ├── 04-streaming/
│   │   ├── package.json
│   │   └── src/
│   │       ├── 01-event-stream.ts
│   │       ├── 02-stream-text.ts
│   │       ├── 03-stream-tools.ts
│   │       ├── 04-stream-thinking.ts
│   │       └── 05-proxy-transport.ts
│   │
│   ├── 05-multi-model/
│   │   ├── package.json
│   │   └── src/
│   │       ├── 01-provider-adapter.ts
│   │       ├── 02-unified-api.ts
│   │       ├── 03-cross-provider.ts
│   │       ├── 04-thinking-unify.ts
│   │       ├── 05-cost-tracking.ts
│   │       ├── 06-unicode-sanitize.ts
│   │       ├── 07-oauth-flow.ts
│   │       └── 08-custom-model.ts
│   │
│   ├── 06-my-agent/
│   │   ├── package.json
│   │   └── src/
│   │       ├── agent.ts
│   │       ├── tools/
│   │       │   ├── read.ts
│   │       │   ├── write.ts
│   │       │   ├── bash.ts
│   │       │   └── search.ts
│   │       ├── prompt.ts
│   │       ├── session.ts
│   │       ├── config-resolver.ts
│   │       ├── auth-manager.ts
│   │       ├── retry.ts
│   │       └── main.ts
│   │
│   ├── 07-comparison/
│   │   ├── package.json
│   │   └── src/
│   │       ├── pi-style.ts
│   │       ├── langchain-style.ts
│   │       └── vercel-ai-style.ts
│   │
│   └── 08-extensions/
│       ├── package.json
│       └── src/
│           ├── 01-simple-extension.ts  # 最小扩展：审计 bash 命令
│           ├── 02-custom-tool-ext.ts   # 通过扩展注册自定义工具
│           └── 03-event-bus.ts         # 扩展间通信
│
├── remotion/                           # Remotion 渲染项目
│   ├── package.json
│   ├── remotion.config.ts
│   └── src/
│       ├── Root.tsx
│       ├── components/                 # 复用组件（继承 ~/code/Tool/remotion 风格）
│       │   ├── ChapterCard.tsx
│       │   ├── CodeShowcase.tsx
│       │   ├── ArchitectureDiagram.tsx
│       │   ├── DataFlow.tsx
│       │   ├── SequenceDiagram.tsx
│       │   ├── ComparisonTable.tsx
│       │   ├── TerminalReplay.tsx
│       │   ├── ConceptCard.tsx
│       │   ├── StateMachineAnim.tsx
│       │   └── GanttChart.tsx
│       └── sequences/                 # 章节动画（下方详列）
│
└── pi-mono/                            # Pi 源码引用（已克隆）
```

---

## 二、章节详细设计

### 第 0 章：全景导读

**目标**：10 分钟建立全局认知

**内容**：
1. 什么是 AI Coding Agent — 与普通 ChatBot 的本质区别（input→output vs input→[think→act→observe]*→output）
2. 为什么选 Pi 作为学习对象
   - 核心代码 ~1,900 行（5 个文件），一下午读完
   - Terminal-Bench 2.0 排行榜前列
   - 对比：Claude Code 5-10 万行、LangChain 庞大、Vercel AI SDK 隐藏循环
3. Pi 的三层架构速览：pi-ai → pi-agent-core → pi-coding-agent
4. 学习路线图（8 章依赖关系 DAG 图）
5. 环境准备：Node.js 20+、API Key 配置、克隆 Pi 源码
6. 每章节奏约定：「读 Pi 源码 → 理解设计决策 → 自己实现 → 验证」
7. Pi 项目哲学："The One Rule" — 你必须理解你的代码

**Demo**：无

**动画**：
| ID | 文件 | 内容 | 时长 |
|----|------|------|------|
| V00 | `CourseIntro.tsx` | 课程片头："从 1,900 行代码理解 Agent 的本质" | 8s |

---

### 第 1 章：Agent 全景

**目标**：理解 Agent 核心定义，30 行代码写出最小 Agent，理解 Pi 整体架构

#### 1.1 什么是 Agent
- Agent = LLM（决策者）+ Tools（执行者）+ Loop（协调者）
- ReAct 模式（Reasoning + Acting）
- 与 ChatBot 的区别

#### 1.2 Pi 架构鸟瞰

**源码阅读清单**：
| 文件 | 关注点 |
|------|--------|
| `pi-mono/README.md` | 7 个包的关系 |
| `packages/agent/package.json` | 依赖关系：只依赖 pi-ai |
| `packages/agent/src/index.ts`（8 行） | 4 个文件导出 |
| `packages/ai/src/index.ts` | LLM 层导出 |
| `packages/coding-agent/src/main.ts`（前 100 行） | CLI 入口 6 阶段启动流程 |
| `CONTRIBUTING.md` | "The One Rule" + lockstep 版本 |

**知识点详解**：

**pi-ai 层**：
- 核心类型：`Model<TApi>`（模型定义）、`Message`（消息）、`Tool<TSchema>`（工具定义）、`AssistantMessage`（LLM 响应）
- 核心函数：`streamSimple()` / `completeSimple()`
- 流式事件：`AssistantMessageEvent`（13 种：start, text_start/delta/end, thinking_start/delta/end, toolcall_start/delta/end, done, error）
- 20+ Provider 适配（Anthropic/OpenAI/Google/Bedrock/Mistral 等）
- 懒加载：provider 动态 import，首次调用才加载

**pi-agent-core 层**：
- 低层 API：`agentLoop()` / `agentLoopContinue()` — 无状态事件流
- 高层 API：`Agent` 类 — 带状态管理的封装
- 12 种 `AgentEvent`（agent_start/end, turn_start/end, message_start/update/end, tool_execution_start/update/end）
- 工具系统：`AgentTool<TParameters, TDetails>` + TypeBox schema
- 钩子：beforeToolCall / afterToolCall

**pi-coding-agent 层**：
- 7 个内置工具：read, bash, edit, write, grep, find, ls
- 扩展系统（15+ 事件类型）
- 会话树（JSONL + id/parentId）
- 上下文压缩（Compaction）
- 3 种运行模式：Interactive / Print / RPC
- 30+ CLI flags、50+ Settings 字段
- 主题系统（50+ 色彩 token）

#### 1.3 5 分钟跑通 Pi
- 安装：`npm install -g @mariozechner/pi-coding-agent`
- 配置 API Key
- 执行简单编码任务，观察工具调用

#### 1.4 动手：30 行最小 Agent

**Demo 01-hello-agent/**：

**01-raw-llm-call.ts**：
- 裸调 Anthropic API，理解 Context（systemPrompt + messages）
- 用 `streamSimple()` 流式获取响应
- 关键概念：Message 类型、AssistantMessage、stopReason

**02-add-tool-call.ts**：
- 定义 calculator 工具（TypeBox schema）
- LLM 自己决定何时调用
- 解析 ToolCall 内容块、构造 ToolResultMessage、追加到 messages
- 关键概念：Tool 定义、ToolCall 解析、JSON Schema

**03-agent-loop.ts**：
- 30 行完整 Agent Loop
- while (true) { stream → 检查 tool calls → 执行 → 追加结果 → 继续 }
- 关键概念：Agent 的本质就是这个循环

**动画**：
| ID | 文件 | 内容 | 时长 |
|----|------|------|------|
| V01 | `WhatIsAgent.tsx` | 左：ChatBot 单箭头 / 右：Agent 循环流程 | 8s |
| V02 | `PiArchOverview.tsx` | 三层架构从底向上构建，每层亮起标注职责 | 10s |
| V03 | `AgentVsChat.tsx` | 终端回放：同一问题用 ChatBot vs Agent 处理 | 12s |

---

### 第 2 章：核心循环

**目标**：逐行理解 agent-loop.ts（616 行）和 agent.ts（613 行），理解双层循环和状态机，自己实现 mini agent loop

#### 2.1 agent-loop.ts 源码精读

**源码阅读清单**：
| 行范围 | 关注点 |
|--------|--------|
| 1-50 | 导入、类型定义 |
| 50-100 | `agentLoop()` 入口 — 创建 EventStream，启动 runAgentLoop |
| 100-230 | `runLoop()` — 双层循环核心 |
| 230-320 | `streamAssistantResponse()` — transformContext → convertToLlm → LLM 调用 |
| 320-420 | `executeToolCalls()` 分发 + `executeToolCallsParallel()` 预检顺序/执行并发/结果保序 |
| 420-500 | `prepareToolCall()` — 查找工具 → validateToolArguments → beforeToolCall 钩子 |
| 500-560 | `executePreparedToolCall()` — 执行 + 收集 update events + await flush |
| 560-616 | `finalizeExecutedToolCall()` — afterToolCall 覆盖 + emitToolCallOutcome |

**双层循环伪代码**：
```
runLoop(context, config, emit):
  pendingMessages = []
  firstTurn = true

  // 外层循环：处理 follow-up
  while true:
    steeringMessages = await getSteeringMessages()
    if steeringMessages: pendingMessages.push(...)

    // 内层循环：处理工具调用 + steering
    hasMoreToolCalls = true
    while hasMoreToolCalls OR pendingMessages.length > 0:
      if !firstTurn: emit(turn_start)
      firstTurn = false
      // 处理 pending → 调 LLM → 检查错误 → 提取工具调用 → 执行工具 → emit turn_end → 检查 steering
      ...

    // Agent 想停，检查 follow-up
    followUpMessages = await getFollowUpMessages()
    if followUpMessages.length == 0: break
    pendingMessages = followUpMessages

  emit(agent_end)
```

**关键设计决策**：
1. 为什么双层循环：内层=一次对话多轮工具，外层=对话结束后追加指令
2. Steering vs Follow-up：Steering 是"中断"（工具执行间隙），Follow-up 是"续命"（Agent 要停时拉回来）
3. firstTurn 标记：避免第一轮重复 turn_start
4. 工具结果保序：并行执行但按 assistant source order emit
5. transformContext → convertToLlm 管道：先在 AgentMessage 级别裁剪，再转 LLM 格式

#### 2.2 agent.ts 源码精读

**源码阅读清单**：
| 行范围 | 关注点 |
|--------|--------|
| 1-80 | `AgentOptions` 类型 — 所有可配置项 |
| 80-200 | 构造函数 + 状态初始化 + 默认值 |
| 200-350 | 状态管理方法（replaceMessages 浅拷贝 vs appendMessage spread） |
| 350-420 | 队列管理（steer/followUp/dequeue 逻辑、one-at-a-time vs all 模式） |
| 420-500 | `prompt()` 和 `continue()` 入口 + 防重入（isStreaming 检查） |
| 500-613 | `_runLoop()` 和 `_processLoopEvent()` |

**状态机**：
```
IDLE ──prompt()──→ STREAMING ──agent_end──→ IDLE
  ↑                    │
  │                    ├── abort() → emits error → IDLE
  │                    │
  └──continue()────────┘
```

**关键细节**：
- `prompt()` 在 isStreaming=true 时抛异常
- `continue()` 要求最后一条不是 assistant 消息
- 状态变更方法（setTools 等）不触发事件
- pendingToolCalls 每次创建新 Set（为了 UI 响应式检测）
- replaceMessages 用 slice（浅拷贝），appendMessage 用 spread（新数组）
- 默认 convertToLlm 只保留 user/assistant/toolResult，静默丢弃其他 role

#### 2.3 边界行为与陷阱

**Steering 一条 vs 全部**：
- one-at-a-time 模式：`dequeueSteeringMessages()` 返回 `[first]`，queue = `queue.slice(1)`
  - 结果：N 条 steering → N 轮 LLM 调用
- all 模式：drain 整个队列
  - 结果：N 条 steering → 1 轮 LLM 调用，但上下文可能膨胀

**Follow-up 只在特定条件触发**：
- 条件：无更多工具调用 AND 无 steering 消息
- Follow-up 不能在 steering 可用时触发
- continue() 优先级：先检查 steering → 再检查 follow-up

**Abort 在不同时机的行为**：
- LLM 流式中：reader.cancel()，stopReason="aborted"
- 工具执行中：工具需检查 signal.aborted 自行停止
- 并行工具执行中：部分工具可能已完成，部分未完成
- 工具间隙：不进入下一轮

**事件队列串行化**：
- `_agentEventQueue` 用 Promise 链串行处理所有 agent 事件
- 防止持久化和扩展处理的竞态
- Retry promise 同步创建（早于异步队列）防止 timing race

**Disconnect→Abort→Reconnect 模式**：
- session switch、compaction、fork、tree navigation 都使用此模式
- 防止状态转换期间的竞态条件

#### 2.4 动手：实现 mini-loop

**Demo 02-mini-loop/**：

| 文件 | 目标 | 关键概念 |
|------|------|----------|
| `01-single-turn.ts` | 单次 LLM 调用 + 工具执行 | Context 构建、streamSimple、结果解析 |
| `02-multi-turn.ts` | 完整 while 循环直到无工具调用 | 工具结果追加、多轮上下文积累 |
| `03-with-events.ts` | 实现 EventStream，emit 12 种事件 | 事件驱动 vs 直接返回的优劣 |
| `04-steering.ts` | 实现 steering + follow-up 双队列 | 中断时机、one-at-a-time vs all |
| `05-abort.ts` | AbortController + 错误分类 | AbortSignal 传播链 |
| `06-edge-cases.ts` | steering 交互、abort 时机、保序验证 | 测试验证的边界行为 |

**动画**：
| ID | 文件 | 内容 | 时长 |
|----|------|------|------|
| V04 | `LoopAnimation.tsx` | Agent Loop 圆环动画：消息→LLM→工具→反馈→循环或结束 | 15s |
| V05 | `TurnLifecycle.tsx` | 时序图：12 种事件在有/无工具调用时的完整序列 | 12s |
| V06 | `SteeringDemo.tsx` | 双时间线：无 steering vs 有 steering 的执行差异 | 10s |
| V07 | `AbortTimeline.tsx` | abort 在 4 个时机的行为差异时序图 | 10s |

---

### 第 3 章：工具系统

**目标**：理解工具定义、验证、执行完整链路，理解并行 vs 顺序执行，理解钩子系统，自己实现工具系统

#### 3.1 工具类型体系

**源码阅读**：
| 文件 | 关注点 |
|------|--------|
| `agent/src/types.ts` — AgentTool | name、label、description、parameters（TypeBox）、execute |
| `agent/src/types.ts` — AgentToolResult | content（TextContent \| ImageContent）+ details（不进 LLM 上下文，UI 专用） |
| `agent/src/types.ts` — AgentToolUpdateCallback | 流式中间结果推送 |
| `coding-agent/src/core/tools/index.ts` | 7 个工具注册、默认工具集分组 |

- TypeBox vs Zod：TypeBox 生成标准 JSON Schema（LLM 需要），Zod 不直接生成
- `Static<TParameters>`：从 schema 推导 TS 类型，execute 参数类型安全
- AJV 验证配置：`coerceTypes: true`（"42"→42）、`strict: false`、`allErrors: true`
- CSP-safe 降级：浏览器扩展 Manifest V3 禁止 eval，AJV 退化为无校验 + console 警告

#### 3.2 内置工具解剖

| 工具 | 关键实现 |
|------|----------|
| **bash** | 进程管理（detached spawn + killProcessTree 杀整棵进程树）、输出截断（50KB 滚动缓冲 + /tmp 溢写）、超时 + abort signal、commandPrefix |
| **read** | 图片自动检测（MIME + base64 + 可选 auto-resize 2000×2000）、大文件截断（2000 行/50KB）、offset/limit 增量读、macOS 路径 NFD 归一化（narrow no-break space + curly quotes 多变体尝试） |
| **edit** | 四级模糊匹配（精确 → 去尾空格 → 智能引号归一化 → Unicode 连字符归一化）、唯一性校验（多处匹配则失败）、BOM 保留、CRLF/LF 检测 + 保持、unified diff 生成 |
| **write** | 文件变更队列（同文件串行、不同文件并行，用 realpath 处理 symlink）、自动创建父目录 |
| **grep** | 双后端（ripgrep / 自定义 GrepOperations）、行截断 500 字符、match 上限 100、gitignore 尊重 |
| **find** | 双后端（fd / 自定义 FindOperations）、fd 自动下载（ensureTool()）、结果上限 1000 |
| **ls** | 可插拔 LsOperations、大小写无关排序、500 条目上限、目录尾 `/` |

**可插拔操作接口**：
- `BashOperations`、`ReadOperations`、`WriteOperations`、`FindOperations`、`GrepOperations`、`LsOperations`
- 设计目的：支持 SSH 远程执行、沙箱隔离、测试 mock
- 工具和底层操作解耦 — 策略模式

#### 3.3 工具调用完整链路

```
LLM 输出 tool_call(s)
  ↓
executeToolCalls() — 分发到 sequential / parallel
  ↓
[Parallel 模式]
  Phase 1（顺序）: prepareToolCall(tool1) → prepare(tool2) → prepare(tool3)
    ├── 查找工具（不存在 → immediate error）
    ├── validateToolArguments（AJV 校验，coerceTypes）
    ├── beforeToolCall 钩子（可 block，{ block: true, reason }）
    └── 被 block/校验失败的直接 emit error result
  Phase 2（并发）: executePreparedToolCall(tool1) | execute(tool2) | execute(tool3)
    ├── 执行 tool.execute(callId, args, signal, onUpdate)
    ├── onUpdate 回调 emit tool_execution_update（Promise.resolve 包装）
    ├── await Promise.all(updateEvents) 确保 updates flush
    └── catch 错误 → createErrorToolResult（updates 仍会 flush）
  Phase 3（顺序）: finalizeExecutedToolCall(tool1) → finalize(tool2) → finalize(tool3)
    ├── afterToolCall 钩子（可覆盖 content/details/isError，字段级独立，非深合并）
    ├── emitToolCallOutcome() — emit tool_execution_end + message_start + message_end
    └── 结果按 assistant source order emit（保序保证）
```

#### 3.4 工具执行的边界情况

- **Update 后失败**：工具 emit 3 次 update（progress 25/50/75%）然后 throw → UI 收到 3 次 tool_execution_update + 1 次 tool_execution_end(isError=true)。已发送的 update 不可撤回
- **afterToolCall 能转换错误/成功**：`{ isError: false }` 把错误变成功，反之亦然
- **beforeToolCall 在验证之后**：能看到 validatedArgs 但不能修改参数，只能 block 或 allow
- **ToolResult 事件序列不同于 Assistant**：ToolResult 同步 emit message_start + message_end（无 update），Assistant 是流式 start → update(n) → end

#### 3.5 动手：实现工具系统

**Demo 03-tool-system/**：

| 文件 | 目标 | 关键概念 |
|------|------|----------|
| `01-schema-validation.ts` | TypeBox schema + AJV 验证 | JSON Schema 生成、Static<T> 类型推导 |
| `02-tool-registry.ts` | ToolRegistry — 注册/查找/列出 | 冲突检测、prompt 片段生成 |
| `03-parallel-exec.ts` | 两种执行模式对比 | Promise.all + 保序 |
| `04-hooks.ts` | before/after 钩子 | block 语义、覆盖语义 |
| `05-custom-tool.ts` | web_search 工具集成到 agent | 完整链路 |
| `06-update-then-fail.ts` | emit 3 次 update 后 throw | UI 如何处理 |

**动画**：
| ID | 文件 | 内容 | 时长 |
|----|------|------|------|
| V08 | `ToolCallFlow.tsx` | 完整三阶段链路动画 | 15s |
| V09 | `ParallelVsSeq.tsx` | 甘特图：3 工具顺序 3s vs 并行 1s | 8s |
| V10 | `HookSystem.tsx` | beforeToolCall 闸门 → execute → afterToolCall 过滤器 | 10s |
| V11 | `ToolUpdateFail.tsx` | 进度条推进到 75% 然后变红失败 | 8s |

---

### 第 4 章：流式与事件

**目标**：理解 EventStream 双消费模式，理解完整事件生命周期，理解 Proxy 传输层，理解流式 JSON 解析，自己实现流式处理

#### 4.1 EventStream 核心

**源码阅读**：`ai/src/utils/event-stream.ts`

- 双消费模式：`for await (const event of stream)` + `await stream.result()`
- Queue + Waiter 模式：生产者 push，消费者可能已在等/还没来
- 终止条件：`isComplete(event)` 返回 true 时结束迭代
- 结果提取：`extractResult(event)` 从终止事件取最终值
- `AssistantMessageEventStream` extends `EventStream<AssistantMessageEvent, AssistantMessage>`

#### 4.2 AssistantMessageEvent 全景（13 种）

```
start
├── text_start → text_delta(n) → text_end
├── thinking_start → thinking_delta(n) → thinking_end
└── toolcall_start → toolcall_delta(n) → toolcall_end
done | error
```

- contentIndex：标识是哪个 content block
- textSignature / thinkingSignature：缓存/验证用
- stopReason："stop" / "length" / "toolUse" / "error" / "aborted"
- **Interleaved thinking**：thinking 可出现在 tool call 之间（不只是开头）

#### 4.3 AgentEvent 生命周期（12 种）

**无工具调用**：
```
agent_start → turn_start →
  message_start(user) → message_end(user) →
  message_start(assistant) → message_update(n) → message_end(assistant) →
turn_end → agent_end
```

**有工具调用**：
```
agent_start → turn_start →
  message_start(user) → message_end(user) →
  message_start(assistant) → message_update(n) → message_end(assistant) →
  tool_execution_start → tool_execution_update(n) → tool_execution_end →
  message_start(toolResult) → message_end(toolResult) →    ← 注意：同步 emit，无 update
turn_end → turn_start → ... → turn_end → agent_end
```

- **ToolResult 事件序列**不同于 Assistant：同步 emit start+end（无 update 阶段）
- **abort 后消息可继续用**：aborted message 不会"毒化"后续对话
- **update 事件异步 emit**：用 Promise.resolve 包装，抛错不阻塞工具完成

#### 4.4 流式 JSON 解析

**源码**：`ai/src/utils/json-parse.ts`

- 问题：LLM 输出 `{"query": "wea` — 不完整 JSON
- `parseStreamingJson()`：从部分 JSON 尽量提取已知字段
- 用途：工具参数在完全输出前就能开始展示
- 每次 delta 都全量重解析（无增量缓存）

#### 4.5 Proxy 传输层

**源码**：`agent/src/proxy.ts`（340 行）

- 动机：浏览器不能直接调 LLM API（CORS + API Key 暴露）
- 架构：Client → POST /api/stream → Server → LLM → Server → NDJSON → Client
- 带宽优化：服务端剥离 `partial` 字段，客户端 `processProxyEvent()` 本地重建，省约 50%
- ProxyAssistantMessageEvent：简化版事件（无 partial）
- 行协议：`data: {JSON}\n`，buffer 处理不完整行
- 边界：EOF 时 buffer 中不完整行丢失、contentIndex 稀疏数组风险

#### 4.6 动手：实现流式处理

**Demo 04-streaming/**：

| 文件 | 目标 | 关键概念 |
|------|------|----------|
| `01-event-stream.ts` | 从零实现 EventStream | AsyncIterable 协议、push/pull、终止条件 |
| `02-stream-text.ts` | 流式打字效果 | text_delta 订阅、process.stdout.write |
| `03-stream-tools.ts` | 工具参数流式解析 | parseStreamingJson |
| `04-stream-thinking.ts` | 思考过程实时展示 | ThinkingLevel、thinking_delta |
| `05-proxy-transport.ts` | 简易 proxy server + client | Express + NDJSON + partial 重建 |

**动画**：
| ID | 文件 | 内容 | 时长 |
|----|------|------|------|
| V12 | `EventTimeline.tsx` | 12 种 AgentEvent 时间线，有/无工具调用并排 | 15s |
| V13 | `StreamVsBatch.tsx` | 左批量（等 3s）vs 右流式（逐字符） | 8s |
| V14 | `ProxyFlow.tsx` | 三列架构：Browser→Proxy→LLM，数据流动+带宽标注 | 12s |

---

### 第 5 章：多模型统一

**目标**：理解 20+ provider 统一适配，理解跨 provider 消息转换，理解 Thinking 统一，自己封装统一接口

#### 5.1 Provider 抽象

**源码阅读**：
| 文件 | 关注点 |
|------|--------|
| `ai/src/types.ts` — Model<TApi> | 模型定义全字段 |
| `ai/src/types.ts` — Api | 10 种 API 格式 |
| `ai/src/api-registry.ts` | registerApiProvider() + 按 api 类型分发 |
| `ai/src/stream.ts` | stream()/streamSimple() 入口 |
| `ai/src/register-builtins.ts` | 懒加载：dynamic import + forward stream |

**三层抽象**：Model → Api → Provider
**懒加载设计**：首次调用才加载 provider SDK，外层 EventStream 转发内层事件
**StreamFunction 契约**：绝不 throw，失败编码在 stream 事件（stopReason="error" + errorMessage）

#### 5.2 Provider 适配器解剖

**Anthropic**：
- 认证：API Key / OAuth（sk-ant-oat- 前缀） / GitHub Copilot Bearer
- Thinking：Adaptive（Opus/Sonnet 4.6+: `thinking.type: "adaptive"` + effort）vs Budget-based（旧模型: token 预算）
- 工具 ID：正则 `^[a-zA-Z0-9_-]+$`，最长 64 字符
- Redacted Thinking：加密不透明 payload，只能同模型重放
- 缓存：`cache_control: {type: "ephemeral", ttl?: "1h"}`（TTL 只在 api.anthropic.com 上）
- Beta Headers：interleaved-thinking、fine-grained-tool-streaming

**OpenAI**：
- 两套 API：Completions（旧）vs Responses（新）
- Service Tier：Flex（0.5x）、Priority（2x）
- 工具 ID：pipe-separated `callId|itemId`，可达 450+ 字符
- Prompt Cache：session-based，`prompt_cache_key` + 24h
- Signature：TextSignatureV1（JSON id + phase）

**Google**：
- 多入口：Generative AI / Vertex / Gemini CLI / Antigravity
- 工具 ID：可能缺失或重复，用 `{name}_{timestamp}_{counter}` 兜底
- Thinking：Gemini 3 Pro `LOW/HIGH`、Flash `MINIMAL/LOW/MEDIUM/HIGH`
- 重试：3 次指数退避 + jitter，从 header 和错误文本提取 retry delay

**Bedrock**：
- 7 级认证链：AWS_PROFILE → Access Key → Bearer Token → ECS Task Role → IRSA → Skip Auth → default
- HTTP/1.1 降级：`AWS_BEDROCK_FORCE_HTTP1=1`
- HTTP Proxy 支持

**Mistral**：
- 工具 ID 截断到 9 字符（MISTRAL_TOOL_CALL_ID_LENGTH）
- x-affinity：session-based KV-cache 复用
- promptMode: "reasoning"

#### 5.3 跨 Provider 消息转换

**源码**：`ai/src/transform-messages.ts`

**三阶段管道**：
1. **内容转换**：Redacted thinking 跨模型丢弃、空 thinking 丢弃、Thinking→text（跨模型）、Tool call ID 归一化、Signature 跨模型剥离
2. **ID 映射追踪**：建立 toolCallIdMap，ToolResult 的 toolCallId 同步更新
3. **孤儿修复**：有 tool_call 无 tool_result → 插入 synthetic error result，跳过 errored/aborted assistant messages

#### 5.4 Thinking 统一

**映射矩阵**：
```
Level     Anthropic(4.6+)  Anthropic(旧)  OpenAI   Google(G3Pro) Google(G3Flash)
minimal   low              -              minimal  -             MINIMAL
low       low              low            low      LOW           LOW
medium    medium           medium         medium   -             MEDIUM
high      high             high           high     HIGH          HIGH
xhigh     max(仅Opus)      -              xhigh    -             -
```

Budget vs Adaptive：
- Budget（旧）：固定 token（minimal=1024, low=2048, medium=8192, high=16384）
- Adaptive（新）：模型自己决定思考量

#### 5.5 Token 计费与溢出检测

- 计费公式：`cost = (model.cost.X / 1_000_000) * usage.X`
- 溢出检测：40+ 种错误模式匹配（每个 provider 格式不同）
- 静默溢出：z.ai 返回 stopReason="stop" 但 usage.input > contextWindow
- 静默截断：Ollama 不报错直接截断

#### 5.6 生产环境必备

- **Unicode 代理对清理**：sanitize-unicode.ts，正则移除未配对 surrogate，真实场景 LinkedIn emoji 触发
- **CSP-safe 校验降级**：浏览器扩展 Manifest V3 → AJV 无校验模式
- **OAuth 完整流程**：
  - Anthropic：PKCE（Web Crypto SHA-256）+ localhost:53692 回调 + 手动 code 兜底
  - GitHub Copilot：Device Flow + adaptive 轮询（slow_down 退避 1.4x）
  - Google：ADC 标准 OAuth
  - Token 刷新：过期前 5 分钟自动刷新
- **GitHub Copilot Headers**：X-Initiator（user/agent）、User-Agent 伪装
- **models.generated.ts**：13,899 行自动生成（scripts/generate-models.ts），从 models.dev + OpenRouter + Vercel 聚合
- **自定义模型 compat 矩阵**：20+ 字段（supportsStore、reasoningEffortMap、thinkingFormat、requiresAssistantAfterToolResult 等）
- **Config Value 动态解析**：`"!command"` 执行 shell 命令（缓存进程生命周期）、`"env:VAR"` 环境变量、字面量

#### 5.7 动手：实现多模型统一

**Demo 05-multi-model/**：

| 文件 | 目标 |
|------|------|
| `01-provider-adapter.ts` | 封装 Anthropic adapter |
| `02-unified-api.ts` | ProviderRegistry + 统一 stream() |
| `03-cross-provider.ts` | transformMessages() Claude→GPT |
| `04-thinking-unify.ts` | 同一 ThinkingLevel 控制不同 provider |
| `05-cost-tracking.ts` | 实时 token/费用统计 |
| `06-unicode-sanitize.ts` | emoji 工具结果跨 provider |
| `07-oauth-flow.ts` | 简易 PKCE 实现 |
| `08-custom-model.ts` | models.json 配置本地 Ollama |

**动画**：
| ID | 文件 | 内容 | 时长 |
|----|------|------|------|
| V15 | `ProviderAbstract.tsx` | 统一 API → adapter 层 → 3 provider | 12s |
| V16 | `MessageTransform.tsx` | Claude 格式 → 三阶段管道 → GPT 格式 | 15s |
| V17 | `ThinkingUnify.tsx` | ThinkingLevel 滑块 → 3 provider 实时映射 | 10s |
| V18 | `OAuthFlow.tsx` | PKCE 流程：challenge → 授权 → 回调 → token | 10s |

---

### 第 6 章：构建完整 Agent

**目标**：整合前 5 章所有概念，构建完整可用的 coding agent，理解 System Prompt 构建、会话管理、可靠性机制、配置系统

#### 6.1 System Prompt 设计

**源码**：`coding-agent/src/core/system-prompt.ts`

构建流程：
1. 工具描述区 → 根据启用工具自动生成使用指南（bash+grep → "优先专用工具"）
2. 上下文文件 → AGENTS.md / CLAUDE.md / SYSTEM.md
3. Skills 区 → XML `<available_skills>` 格式
4. 自定义 Guidelines（去重 + 去空白）
5. 元信息 → 日期（ISO 8601）+ 工作目录

关键决策：Prompt 动态生成（非硬编码）、上下文文件项目级、Skills 用 XML（LLM 理解好）

#### 6.2 会话管理

**源码**：`coding-agent/src/core/session-manager.ts`

- JSONL 格式 + 树结构（id/parentId）
- 9 种条目类型：message、compaction、branch_summary、custom_message、custom、label、session_info、thinking_level_change、model_change
- 版本迁移：v1→v2（加 id/parentId）、v2→v3（hookMessage→custom）
- 树操作：getBranch、getTree、getChildren、buildSessionContext
- Session export：HTML（带主题）、JSONL（线性化 parentId）、导入

#### 6.3 上下文压缩（Compaction）

**源码**：`coding-agent/src/core/compaction/compaction.ts`

- Token 估算：chars/4（保守）、图片 4800 chars ≈ 1200 tokens
- 有效切点：user/assistant/custom 消息，不能切 toolResult
- 流程：检测超阈值 → 保留近期 keepRecentTokens(20000) → LLM 总结旧消息 → 提取文件操作记录 → CompactionEntry 替代
- 触发：自动（超阈值）、手动（/compact）、溢出重试

#### 6.4 可靠性机制

**自动重试**：
- 指数退避：`baseDelayMs * 2^(attempt-1)`
- Retryable 错误：overloaded_error、network_error、429、5xx
- 成功立即重置计数器（防跨 turn 累积）
- 最大重试次数（默认 3），emit auto_retry_start/end 事件

**溢出恢复**：
- overflow → 删错误消息 → compact → agent.continue()
- `_overflowRecoveryAttempted` 限制：单次溢出只 compact+retry 一次
- 第二次溢出直接报错给用户
- Stale usage 拒绝：assistant 比最新 compaction 旧则跳过检查

**认证安全**：
- auth.json 文件锁：同步锁（10次 × 20ms）+ 异步锁（指数退避 10s）+ 30s stale
- 多实例安全 OAuth 刷新
- API Key 6 级解析：Runtime → auth.json → OAuth（auto-refresh）→ env → fallback → undefined

#### 6.5 配置系统

**三级解析**：
- Global（~/.pi/agent/settings.json）→ Project（.pi/settings.json）→ CLI override
- 深合并：嵌套对象递归合并、数组/原语覆盖

**50+ Settings 字段**：compaction、retry、branchSummary、terminal、images、markdown、steeringMode、followUpMode、doubleEscapeAction、treeFilterMode、shellPath、theme 等

**自定义模型**：models.json schema + Provider 配置 + compat 矩阵

#### 6.6 三种运行模式

- **Interactive**：TUI 全功能交互（4,358 行编排器）
- **Print**：单次执行流式输出到 stdout（--print / pipe）
- **RPC**：JSONL stdin/stdout 协议（IDE 集成）

#### 6.7 动手：构建你的 Agent

**Demo 06-my-agent/**：

| 文件 | 职责 |
|------|------|
| `agent.ts` | 基于自己的 agent loop + 事件系统 |
| `tools/read.ts` | 文件读取（图片、大文件截断） |
| `tools/write.ts` | 文件写入（变更队列） |
| `tools/bash.ts` | 命令执行（超时、abort、输出截断） |
| `tools/search.ts` | grep + find 合一 |
| `prompt.ts` | 动态 system prompt 构建 |
| `session.ts` | JSONL 会话持久化 |
| `config-resolver.ts` | 三级配置解析 |
| `auth-manager.ts` | API key 6 级解析 + 文件锁 |
| `retry.ts` | 指数退避重试 + 溢出恢复 |
| `main.ts` | CLI 入口 readline 交互 |

最终效果：终端可运行的 coding agent，能读写文件、执行命令、搜索代码、多轮对话、会话保存/恢复、Claude/GPT 切换、自动重试

**动画**：
| ID | 文件 | 内容 | 时长 |
|----|------|------|------|
| V19 | `FullArchitecture.tsx` | 完整 Agent 架构图：用户输入→prompt→LLM→工具→事件→UI→会话 | 20s |
| V20 | `BuildTimelapse.tsx` | 6 章组件逐个拼装成完整 Agent | 15s |
| V21 | `RetryStrategy.tsx` | 指数退避：1s→2s→4s→成功/放弃 | 8s |
| V22 | `ConfigResolution.tsx` | 三级配置合并：global+project+cli 层层覆盖 | 10s |
| V23 | `ApiKeyChain.tsx` | 6 级 API key 解析降级链 | 10s |

---

### 第 7 章：框架对比

**目标**：理解 Pi / Claude Code / LangChain / Vercel AI SDK 的设计差异，提炼通用模式

#### 7.1 设计哲学对比

| 维度 | Pi | Claude Code | LangChain | Vercel AI SDK |
|------|------|-------------|-----------|---------------|
| 理念 | 极简可读 | 功能完备产品级 | 万物皆 Chain | 前端友好流式优先 |
| 代码量 | ~1,900 行核心 | 5-10 万行 | 庞大 | 中等 |
| 学习曲线 | 低 | 中（闭源） | 高 | 低 |
| 可定制性 | 高 | 低 | 高（但复杂） | 中 |

#### 7.2 核心循环对比

- Pi：裸循环 + 事件流（你控制每一步）
- LangChain：StateGraph + Node/Edge（声明式图）
- Vercel：`streamText({ model, tools, maxSteps })`（一行搞定，失去细控制）

#### 7.3 工具/流式/Provider 逐维对比

**工具系统**：

| 维度 | Pi | LangChain | Vercel AI SDK |
|------|------|-----------|---------------|
| Schema 定义 | TypeBox（JSON Schema） | Zod / Pydantic | Zod |
| 并行执行 | 内置（预检顺序 → 执行并发 → 结果保序） | 需手动配置 | 自动（无保序保证） |
| 钩子系统 | before/afterToolCall（block + 覆盖） | 无直接等价 | 无 |
| 流式结果 | onUpdate callback | 无 | 无 |
| 可插拔后端 | Operations 接口（SSH/沙箱/mock） | 无 | 无 |
| 错误处理 | 验证失败 → error result → LLM 重试 | 异常抛出 | 异常抛出 |

**流式处理**：

| 维度 | Pi | LangChain | Vercel AI SDK |
|------|------|-----------|---------------|
| 抽象模型 | EventStream（AsyncIterable + Promise） | AsyncGenerator / Callback | ReadableStream / React hook |
| 事件粒度 | 13 种 AssistantMessageEvent + 12 种 AgentEvent | 粗粒度（on_llm_token 等） | 细粒度（text/tool delta） |
| 前端集成 | 自带 pi-web-ui 组件库 + pi-tui | 无直接支持 | useChat / useCompletion hooks |
| Proxy 支持 | 内置（带宽优化，partial 剥离） | 无 | 无 |
| Thinking 流式 | 支持（interleaved thinking） | 部分 | 部分 |

**Provider 抽象**：

| 维度 | Pi | LangChain | Vercel AI SDK |
|------|------|-----------|---------------|
| 支持数量 | 20+ provider，10 种 API 格式 | 广泛 | 广泛 |
| 跨 provider 消息转换 | transformMessages 三阶段管道 | 无自动转换 | 无自动转换 |
| Thinking 统一 | 6 级 ThinkingLevel 映射矩阵 | 无统一 | 部分 |
| 模型切换 | 运行时切换 + 自动消息归一化 | 需重建 chain | 需重建 |
| 成本追踪 | 内置 Usage + 自动计费 | 需额外集成 | 部分 |
| 认证 | 6 级解析 + OAuth + 文件锁 | 环境变量为主 | 环境变量为主 |

#### 7.4 通用设计模式提炼

所有 Agent 框架共性：
1. Agent Loop（think-act-observe 循环）
2. Tool Abstraction（schema + 注入 LLM + 结果反馈）
3. Context Management（消息列表 + 压缩/截断）
4. Streaming（增量输出 + 事件系统）
5. Provider Abstraction（统一接口差异）

Pi 独有优秀设计：Steering/Follow-up 双队列、工具操作接口解耦、并行执行保序、Proxy 带宽优化

#### 7.5 Demo

**Demo 07-comparison/**：同一任务三种风格实现（pi-style / langchain-style / vercel-ai-style）

**动画**：
| ID | 文件 | 内容 | 时长 |
|----|------|------|------|
| V24 | `FrameworkCompare.tsx` | 三列并排：相同任务不同框架执行流程 | 15s |
| V25 | `TradeoffMatrix.tsx` | 雷达图：5 维度 3 框架 | 12s |

---

### 第 8 章：进阶扩展

**目标**：理解扩展系统、TUI/Web UI 架构、Skills/Templates、产品化考量

#### 8.1 扩展系统

**源码**：`coding-agent/src/core/extensions/` (types.ts + loader.ts + runner.ts ≈ 3000 行)

- **加载**：jiti 运行时 TS 编译、.pi/extensions/ + ~/.pi/agent/extensions/ + CLI --extension
- **15+ 事件类型**：session_*、tool_call/result、user_bash、context、input、before_agent_start、before_provider_request、resources_discover 等
- **能力**：注册工具、注册命令、监听事件、修改上下文、拦截 bash、修改 API 请求、UI 交互
- **Input 链式处理**：多扩展 handler 链式调用，result 传递，`{ action: "handled" }` 短路，错误不中断链
- **resources_discover**：扩展动态注入 skill/prompt/theme 路径
- **CLI flag 注册**：扩展定义自定义 flag，第二轮 parseArgs 纳入

#### 8.2 TUI 架构

**源码**：`tui/src/` (10,491 行)

**差分渲染（3 策略）**：
1. 全量重绘（宽度/高度变化、首次）
2. 差分更新（找 firstChanged/lastChanged，只渲染变化行）
3. 仅删除（内容缩短时只清多余行）
- 同步输出 `\x1b[?2026h`/`l` 防闪烁

**组件体系**：Text、Input（Kill-Ring + Undo）、Editor（多行+滚动+paste marker+自动补全）、Markdown（ANSI 代码跨行追踪）、SelectList、Image（Kitty/iTerm2/文本降级）、Overlay（焦点管理+Z 排序+compositing）

**高级特性**：
- CURSOR_MARKER (`\x1b_pi:c\x07`) 零宽 APC → IME 光标定位
- Kitty 键盘协议（Flag 1+2+4，modifyOtherKeys 降级 150ms 超时）
- bracketed paste 检测
- Grapheme-aware 文本处理（Intl.Segmenter + East Asian Width）

#### 8.3 Interactive Mode

**源码**：`coding-agent/src/modes/interactive/interactive-mode.ts` (4,358 行)

- 6 阶段启动流程
- 8 种消息组件（UserMessage、AssistantMessage、BashExecution、ToolExecution 等）
- 20+ 键盘快捷键（Escape/Ctrl+P/Alt+Enter 等）
- TreeSelectorComponent（650+ 行 ASCII 树形浏览器，5 种过滤模式）
- SessionSelectorComponent（1000+ 行，3 种排序模式）
- SettingsSelectorComponent（15+ 设置项子菜单）

**Theme 系统**（50+ 色彩 token）：
- Core UI 10 + Backgrounds 11 + Markdown 10 + Diffs 3 + Syntax 9 + Thinking 6 + Bash 1
- vars 变量引用、truecolor/256-color 自动检测
- 内置 dark/light + 自定义 JSON 主题

#### 8.4 Web UI 架构

**源码**：`web-ui/src/`

- mini-lit 组件：ChatPanel → AgentInterface + ArtifactsPanel
- StreamingMessageContainer：RAF 批量更新（JSON.parse(JSON.stringify) 深拷贝检测嵌套变更）
- Artifact 沙箱：srcdoc vs sandboxUrl、RuntimeProvider 注入、window.complete() 回调
- 8 种 Artifact 类型：HTML/SVG/PDF/DOCX/XLSX/Markdown/Text/Image
- Message Renderer Registry：可扩展渲染器
- IndexedDB 存储后端
- CORS Proxy：provider-specific 规则

#### 8.5 Skills & Prompt Templates

- Skills：SKILL.md + YAML frontmatter（name/description）、XML 注入 prompt、disable-model-invocation
- Templates：Markdown + 参数替换（$1/$@/${@:N:L}）

#### 8.6 MOM & Pods

- MOM（Slack Bot）：每通道状态管理、消息队列串行化、35K/20K 截断
- Pods（vLLM）：GPU pod 生命周期、端口/GPU 轮转、模型配置数据库

#### 8.7 产品化考量

| 主题 | 内容 |
|------|------|
| 认证 | OAuth PKCE + Token 刷新 + 多 provider 凭证 + 文件锁 |
| 安全 | beforeToolCall 权限控制 + 沙箱 + 敏感信息过滤 |
| 可靠性 | 指数退避 + 溢出恢复 + abort 传播 |
| 可观测 | 事件系统 → 日志 + token 计费 + 工具耗时 |
| 部署 | CLI（npm/Bun binary）、Web（CORS Proxy）、SDK、RPC（IDE 集成） |

#### 8.8 动手：扩展实践

**Demo 08-extensions/**：

| 文件 | 目标 | 关键概念 |
|------|------|----------|
| `01-simple-extension.ts` | 最小扩展：审计所有 bash 命令，危险命令需确认 | ExtensionFactory、on("tool_call")、block 语义 |
| `02-custom-tool-ext.ts` | 通过扩展注册 web_search 工具 | registerTool、Tool schema |
| `03-event-bus.ts` | 两个扩展通过事件总线通信 | emit/on 模式、扩展间解耦 |

**动画**：
| ID | 文件 | 内容 | 时长 |
|----|------|------|------|
| V26 | `ExtensionArch.tsx` | 扩展系统：事件总线 + 15 种事件 + 注册点 | 15s |
| V27 | `UIEventConsume.tsx` | TUI/WebUI 同时消费同一 Agent 事件流 | 12s |
| V28 | `TuiDiffRender.tsx` | 三种渲染策略对比 | 10s |
| V29 | `InteractiveArch.tsx` | Interactive Mode 组件树 | 12s |

---

## 三、附录

### 附录 A：Pi 完整 API 速查
- pi-ai：stream/complete/streamSimple/completeSimple、Model、Message、Tool、EventStream
- pi-agent-core：Agent 类全方法（15 public）、agentLoop/agentLoopContinue、AgentEvent、AgentTool
- pi-coding-agent SDK：createAgentSession、工具工厂、ExtensionAPI

### 附录 B：术语表
ConceptCard 组件，按字母排序：Agent Loop、Compaction、Context Window、EventStream、Follow-up、Provider、Steering、ThinkingLevel、ToolCall、ToolResult、transformContext...

### 附录 C：常见问题
按场景：API Key、模型切换、context overflow、工具超时、流式中断...

### 附录 D：完整 CLI 参考
30+ flags 分类 + 20+ 环境变量（provider keys + 系统变量）+ 包管理命令

### 附录 E：Settings 完整 Schema
50+ 字段的类型、默认值、三级作用域说明

### 附录 F：自定义模型配置指南
models.json schema + compat 矩阵 + Header 动态解析 + Provider 注册

---

## 四、交互组件完整清单

| 组件 | 用途 | 使用章节 |
|------|------|----------|
| `SourceReader` | Pi 源码阅读器（行号高亮、注释浮层） | 1,2,3,4,5,6,8 |
| `CodeComparison` | 左右分栏对比（Pi 原版 vs 你的实现） | 2,3,4,5 |
| `InteractiveDemo` | 嵌入可运行 demo（StackBlitz） | 1-7 |
| `ArchitectureDiagram` | 可交互架构图（hover 展开） | 1,5,6,8 |
| `EventTimeline` | 事件时间线（可点击展开 payload） | 2,4 |
| `ConceptCard` | 术语/概念卡片 | 全部 + 附录 B |
| `QuizBlock` | 章节小测验 | 每章末尾 |
| `ProgressTracker` | 学习进度（localStorage） | 侧边栏常驻 |
| `ComparisonTable` | 可排序/筛选对比表 | 5,7 |
| `StateMachine` | 状态机可视化 | 2,6 |
| `PriorityChain` | 优先级/降级链可视化 | 5,6 |
| `VideoEmbed` | Remotion Player 嵌入 | 全部章节 |

---

## 五、Remotion 动画完整清单

| ID | 文件 | 章节 | 内容 | 时长 |
|----|------|------|------|------|
| V00 | `CourseIntro.tsx` | 0 | 课程片头 | 8s |
| V01 | `WhatIsAgent.tsx` | 1 | Agent vs ChatBot | 8s |
| V02 | `PiArchOverview.tsx` | 1 | 三层架构鸟瞰 | 10s |
| V03 | `AgentVsChat.tsx` | 1 | 终端回放对比 | 12s |
| V04 | `LoopAnimation.tsx` | 2 | Agent Loop 循环 | 15s |
| V05 | `TurnLifecycle.tsx` | 2 | Turn 生命周期时序图 | 12s |
| V06 | `SteeringDemo.tsx` | 2 | Steering/FollowUp 流程 | 10s |
| V07 | `AbortTimeline.tsx` | 2 | Abort 4 个时机差异 | 10s |
| V08 | `ToolCallFlow.tsx` | 3 | 工具调用完整链路 | 15s |
| V09 | `ParallelVsSeq.tsx` | 3 | 并行 vs 顺序甘特图 | 8s |
| V10 | `HookSystem.tsx` | 3 | 钩子系统工作流 | 10s |
| V11 | `ToolUpdateFail.tsx` | 3 | 进度条 75% 后失败 | 8s |
| V12 | `EventTimeline.tsx` | 4 | 12 种事件时间线 | 15s |
| V13 | `StreamVsBatch.tsx` | 4 | 流式 vs 批量对比 | 8s |
| V14 | `ProxyFlow.tsx` | 4 | Proxy 传输架构 | 12s |
| V15 | `ProviderAbstract.tsx` | 5 | Provider 抽象层 | 12s |
| V16 | `MessageTransform.tsx` | 5 | 跨 provider 消息转换 | 15s |
| V17 | `ThinkingUnify.tsx` | 5 | Thinking 映射矩阵 | 10s |
| V18 | `OAuthFlow.tsx` | 5 | PKCE 流程 | 10s |
| V19 | `FullArchitecture.tsx` | 6 | 完整 Agent 架构 | 20s |
| V20 | `BuildTimelapse.tsx` | 6 | 构建过程快进 | 15s |
| V21 | `RetryStrategy.tsx` | 6 | 指数退避动画 | 8s |
| V22 | `ConfigResolution.tsx` | 6 | 三级配置合并 | 10s |
| V23 | `ApiKeyChain.tsx` | 6 | 6 级 API key 降级链 | 10s |
| V24 | `FrameworkCompare.tsx` | 7 | 三框架流程对比 | 15s |
| V25 | `TradeoffMatrix.tsx` | 7 | 雷达图取舍矩阵 | 12s |
| V26 | `ExtensionArch.tsx` | 8 | 扩展系统架构 | 15s |
| V27 | `UIEventConsume.tsx` | 8 | TUI/WebUI 事件消费对比 | 12s |
| V28 | `TuiDiffRender.tsx` | 8 | 三种渲染策略对比 | 10s |
| V29 | `InteractiveArch.tsx` | 8 | Interactive Mode 组件树 | 12s |

**总计**：30 个动画，总时长约 340s（5 分 40 秒）

---

## 六、技术决策记录

| 决策 | 选项 | 选择 | 理由 |
|------|------|------|------|
| 文档框架 | VitePress / Nextra / Astro / Next.js | **Astro + MDX** | 内容优先、React Islands 支持 Remotion Player、零 JS 默认 |
| 代码高亮 | Shiki / Prism / highlight.js | **Shiki**（Astro 内置） | 主题丰富、性能好 |
| Demo 运行 | CodeSandbox / StackBlitz / 本地 | **StackBlitz**（WebContainers） | 浏览器内运行 Node.js，无需服务器 |
| 动画引擎 | Remotion / Motion Canvas / CSS | **Remotion** | 用户已有工具链和组件 |
| Schema 验证 | Zod / TypeBox | **TypeBox**（同 Pi） | 教学一致性 |
| 样式 | Tailwind / CSS Modules | **Tailwind** | Astro 原生支持、组件库兼容 |
| 部署 | Vercel / Netlify / GitHub Pages | **Vercel** | Astro 最佳支持 |
