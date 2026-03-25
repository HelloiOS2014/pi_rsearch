# Harness Engineering — 从 Agent 内核到生产级产品

## 设计规格文档 v2

**日期**: 2026-03-25
**状态**: 重构设计
**前置**: Part 1 (Ch0-8) 已完成
**替代**: 2026-03-24 v1 spec（结构重建，内容继承）

---

## 1. 设计哲学

### 1.1 这不是参考手册，是一段学习旅程

Part 2 不是"Harness 有哪些组件"的清单。它是一段从"能跑的 Demo"到"可用的产品"的旅程。每一章由**读者真实会遇到的痛苦**驱动——而不是由 Pi 的代码目录驱动。

### 1.2 叙事弧线

每章解决一个问题，但解决之后自然暴露出下一个问题。读者被**问题拉着走**：

```
Ch9:  你的 Agent 在 demo 里很好用。为什么它在真实任务中会失败？
        → 理论框架建立 → 但光懂理论不行，得动手
Ch10: 动手后第一个痛：Agent 不可控。→ 控制回路解决了
        → 但你发现工具经常出错，甚至做了危险操作
Ch11: 第二个痛：Agent 不可靠也不安全。→ 防御性工具 + 信任机制解决了
        → 但跑了 30 分钟后上下文满了，Agent 开始胡言乱语
Ch12: 第三个痛：Agent 会遗忘。→ 记忆系统解决了
        → 你的 Agent 终于能跑完长任务了。你兴奋地部署到团队的三个项目上
        → 然后发现：每个项目需要不同的模型、不同的工具、不同的安全策略
Ch13: 第四个痛：Agent 不能适应不同场景。→ 配置 + Skills 解决了
        → 但只有你一个人能在终端里用
Ch14: 第五个痛：Agent 到不了用户手里。→ 多模式交付解决了
        → 一个完整的 Harness 诞生
```

### 1.3 四条贯穿全 Part 的线索

**线索 1：理论-实践锚点**（Theory-Practice Anchors）

Ch9 的理论框架不是装饰——它在后续每章的关键设计决策处**预测或解释**。全 Part 至少 15 个锚点，让读者反复体验"原来理论真的有用"。

**线索 2：元技能**（Meta-Skills）

不只教"怎么建"，还教"怎么判断"：
- **诊断**：Agent 失败了，是模型问题还是 Harness 问题？
- **优先级**：资源有限时先建什么？
- **评估**：怎么衡量 Harness 够不够好？
- **调优**：先减后加，还是缺什么补什么？

**线索 3：设计哲学对比**（Design Philosophy）

不只比较"Pi 怎么做 vs Claude Code 怎么做"，更分析**为什么他们做了不同选择**：
- **Pi**：极简哲学——"The One Rule: 你必须理解你的代码"。选择最小复杂度。
- **Claude Code**：企业就绪——重量级 Hook、管理策略、沙箱。选择最大控制力。
- **Cursor**：开发者速度——投机式编辑、并行 Agent、嵌入式索引。选择最快反馈。

三种哲学代表设计光谱的三个端点：简洁 ↔ 控制 ↔ 速度。读者理解 WHY 后，能在自己的场景中做出正确的设计决策。

**线索 4：简化轨迹**（Simplification Trajectory）

每章包含"什么可以删掉"的讨论。Manus 5 次重写每次都更简单。模型在进步，今天 Harness 需要处理的边界情况，明天的模型可能原生解决。**为删除而构建。**

### 1.4 教学节奏

每章的节奏从 v1 的"六段式"改为**问题驱动式**：

```
1. 痛苦场景（读者亲身经历或能想象的真实失败）
2. 为什么会痛（连接到理论框架，解释根因）
3. 业界怎么解决（通用模式 + 不同产品的不同选择及其 WHY）
4. Pi 怎么解决（源码解剖 + 理论锚点：理论在此处预测了什么？）
5. 自己动手（问题驱动的 Demo：先遇到问题 → 再解决）
6. 元技能（诊断/优先级/评估/调优的具体指导）
7. 简化思考（什么时候可以删掉你刚建的东西？）
```

### 1.5 读者画像与终态

**读者是谁**：完成了 Part 1 的学习者，理解 Agent 内核（循环、工具协议、事件流），想把 Agent 变成真正可用的产品。

**读完后能做什么**：
- 给任意 Agent 内核从零构建生产级 Harness
- 拿到一个现有 Agent 产品（Claude Code / Cursor / 任何框架），能拆解它的 Harness 架构，理解每个设计决策的 WHY
- 当 Agent 出问题时，能准确诊断是模型问题还是 Harness 问题，并知道怎么修
- 知道什么时候该加东西，什么时候该删东西

---

## 2. 六章结构总览

| 章节 | 叙事定位 | 核心痛苦 | 理论根基 | Pi 标本 |
|------|---------|---------|---------|---------|
| Ch9 | 觉醒 | "我的 Agent 在生产中失败了" | 五个鸿沟、成本反转、控制系统、简化轨迹 | Pi 全貌走查 |
| Ch10 | 控制 | "Agent 失控了" | 控制系统模型 | AgentSession ~3,180 行 |
| Ch11 | 信赖 | "Agent 做错了，甚至做了危险的事" | 边界鸿沟 + 信任鸿沟 | tools ~1,270 行 |
| Ch12 | 记忆 | "Agent 忘了之前做的事" | 状态鸿沟 + 注意力鸿沟 + 成本反转 | session + compaction ~2,750 行 |
| Ch13 | 适应 | "Agent 只在我的环境里能用" | 适应鸿沟 | settings + skills + prompt ~3,140 行 |
| Ch14 | 交付 | "只有我一个人能用这个 Agent" | 洋葱模型最外层 | modes + SDK ~5,700 行 |

---

## 3. Ch9：Harness Engineering — 一门被忽视的学科

### 3.1 叙事入口

不从定义开始。从**痛苦**开始：

> 你花了两周学完 Part 1，自己实现了一个 Agent（Demo 06）。它能读文件、写代码、执行命令。你很自豪。
>
> 然后你尝试用它完成一个真实任务——重构一个 3000 行的模块。
>
> 第 15 分钟，上下文窗口满了，它开始重复之前的工作。
> 第 20 分钟，一次 edit 因为 Unicode 字符不匹配失败了，它不知道怎么恢复。
> 第 25 分钟，你不小心关了终端，所有进度丢失。
> 你重新启动，它不记得之前做了什么。
> 你想让同事也用，但他用的是不同的模型和不同的项目约定。
>
> 你的 Agent 没有变笨。**它的内核一直在正确工作。** 它缺的不是智能，是智能之外的一切。

这就是 Harness Engineering 要解决的问题。

### 3.2 什么是 Agent Harness

#### 3.2.1 多源定义（三角定位）

从业界权威来源汇聚定义，让读者从多个角度理解同一个概念：

- **LangChain**："Agent = Model + Harness。Harness 是模型之外的一切——代码、配置、执行逻辑。" *(The Anatomy of an Agent Harness, 2026)*
- **Anthropic**："使 Agent 能跨多个上下文窗口有效工作的基础设施。" *(Effective Harnesses for Long-Running Agents, 2025.11)*
- **vtrivedy (HaaS)**："增强模型运行时执行的外部功能集——对话管理、工具调用、权限、会话状态、循环控制、可观测性。" *(HaaS: Harness as a Service, 2025.09)*
- **Martin Fowler**："让 AI Agent 保持受控的工具和实践。" *(Harness Engineering, 2026)*
- **Pi 自身**："Pi is a minimal terminal coding harness." *(README 第一句)*

本教程的综合定义：

> Agent Harness 是包裹 Agent 内核的工程系统。内核负责推理，Harness 负责其余一切——让推理变得可控、可靠、可持久、可适应、可交付。
>
> **模型是引擎，Harness 是汽车。**

#### 3.2.2 为什么不叫"框架"或"平台"

"Harness"这个词不是随意选的。它的词源揭示了本质：

- 马具（horse harness）→ 控制力量，使之安全可用
- 测试线束（test harness）→ 包裹被测对象，提供可控的运行环境
- Agent Harness → 包裹 Agent 内核，使其能力在确定性世界中安全落地

共同本质：harness 不是力量的来源，而是**让力量变得可用的工程结构**。

### 3.3 为什么 Harness Engineering 是一门独立学科

#### 3.3.1 量化证据

三个独立的、可量化的证据：

**证据 1：改 Harness 不改模型，排名跳 25 位**
> "We improved our coding agent from Top 30 to Top 5 on Terminal Bench 2.0 by only changing the harness." —— LangChain

**证据 2：更简单的 Harness 反而更好**
> Vercel 实验：15 个专业工具 80% 准确率，2 个通用工具（bash + SQL）100% 准确率。同一个模型。

**证据 3：生产失败不是知识不足，是编排不足**
> APEX-Agents 基准测试（2026.01）：前沿模型在真实任务上 ~24% pass@1（传统基准 90%+）。"These failures were predominantly not knowledge failures. The failures were execution and orchestration problems."

**经济证据：Harness 优化 = 10x 成本下降**
> Manus 通过 KV-cache 优化（Harness 层基础设施改进）将缓存 token 成本从 $3/MTok 降到 $0.30/MTok。模型没换。Meta 以 ~$20 亿收购了 Manus——收购的是 Harness，不是模型。

#### 3.3.2 收敛证据

OpenAI Codex、Claude Code、Manus——独立开发，互不参考——收敛到了相同的 Harness 模式：
- 更少、更通用的工具
- 文件系统作为外部状态（git + 进度文件）
- 上下文压缩层级
- 可扩展的分层架构

三家独立收敛说明问题空间有**深层结构**。Harness Engineering 有可发现的规律，不是随意的工程决策。

#### 3.3.3 代码比例证据

Pi：agent-core ~1,900 行，coding-agent ~40,000 行。比例 ~1:21。Harness 占 Agent 产品代码的 ~95%。

### 3.4 理论框架

#### 3.4.1 五个根本性鸿沟

每一个 Harness 子系统的存在，都可追溯到 LLM 与现实世界之间的一个根本性鸿沟。每个鸿沟创造一个 trade-off 空间。

| 鸿沟 | LLM 的本质 | 现实世界的要求 | Harness 的桥梁 | 核心 trade-off |
|------|-----------|-------------|--------------|---------------|
| **状态鸿沟** | 无状态函数调用 | 工作是有状态的 | 会话管理、持久化 | 更多状态 = 更多上下文成本 = 更少推理空间 |
| **边界鸿沟** | 在 token 空间思考 | 世界在文件/进程/网络空间 | 工具（翻译层） | 更多工具 = 更多能力但更多选择歧义 |
| **信任鸿沟** | 必须给予权力才有用 | 不能完全被信任 | 权限、沙箱、Hook | 更多信任 = 更快但更危险 |
| **注意力鸿沟** | 有限上下文窗口 | 任务产生无界信息 | Compaction、子 Agent、外部记忆 | 更多压缩 = 更多推理空间但更多信息丢失 |
| **适应鸿沟** | 同一个模型权重 | 不同用户/环境/任务 | 配置、Skills、动态 Prompt | 更多灵活性 = 更多配置复杂度 |

#### 3.4.2 成本反转原理

在 LLM 上下文中，**保留是昂贵的，取回是廉价的**——与传统计算机内存模型完全相反。

这个原理统一解释了 Harness 的大量设计决策：
- 工具 schema 不应该全量常驻（Vercel 证明了）
- Skills 用渐进式披露（元数据常驻，内容按需）
- 历史消息要压缩（compaction）而不是全量保留
- 子 Agent 的价值在于上下文隔离（只返回摘要到父 Agent）

**统一启发式**：在 Harness 的每一层，默认选择"按需取回"而非"常驻保留"，除非有证据表明取回延迟不可接受。

#### 3.4.3 控制系统模型

```
用户意图 (reference signal)
    ↓
Harness (controller) → Agent 行动 (actuator) → 环境变化 (plant)
    ↑                                              ↓
    ←←←←←← 工具结果 / 事件 (feedback) ←←←←←←←←←←←
```

控制论概念映射到 Harness 工程：
- **稳定性**：Agent 是否收敛到解？→ 循环检测
- **可控性**：Harness 能否引导 Agent？→ steering 机制
- **可观测性**：Harness 能否知道 Agent 在做什么？→ 事件流
- **反馈质量**：工具结果的信噪比 → 输出截断策略
- **前馈控制**：System Prompt 预设期望 → 比纯反馈更快收敛
- **扰动抑制**：API 故障、prompt injection → retry + 降级

#### 3.4.4 简化轨迹

> 初版 Harness 总是过度补偿模型的不足。随着理解加深，你发现模型能处理的比你以为的更多——Harness 应该后退。

Manus 5 次重写，每次更简单。Bitter Lesson 应用于 Harness：通用方法 + 计算 > 手工复杂度。

**设计启发式**：Harness 的每一层都应该有"过期日期"。定期审视：模型进步后，这个机制还有必要吗？

#### 3.4.5 模型-Harness 协同进化

LangChain 的关键发现：现代 Agent（Claude Code）是**带着 Harness 一起做 post-training 的**。模型训练时见过 edit、bash、read 这些工具接口——改了工具逻辑，模型性能会下降。

这意味着：
- Harness 决策有"粘性"——不是随时可改
- 最佳 Harness 不是通用最优，而是与特定模型的**适配度最高**
- HumanLayer 数据：Opus 4.6 在 Claude Code Harness 排 #33，在另一个 Harness 排 #5——同一个模型，不同适配度

### 3.5 Harness 的三大支柱（Martin Fowler 框架）

Martin Fowler 分析 OpenAI 用 Codex 构建百万行代码库的实践后总结：

**支柱 1：Context Engineering（上下文工程）**
> 持续增强的知识库 + Agent 访问动态上下文的能力。

核心是 Anthropic 的原则："找到最小的高信号 token 集合，最大化期望行为的概率。把上下文当作有限资源，具有递减边际收益。"

关联概念："上下文腐烂（Context Rot）"——性能在上下文窗口填满之前就开始退化。HumanLayer 的"笨区（Dumb Zone）"——每多一个无关 token，就把 Agent 往笨区推一步。

**支柱 2：Architectural Constraints（架构约束）**
> 不只由 LLM Agent 监控，还由确定性的自定义 linter 和结构化测试监控。

反直觉：Harness 不只给 Agent 更多能力，还要**约束**Agent。通过确定性工具缩小可能犯错的空间。

**支柱 3：Entropy Management（熵管理）**
> 周期性运行的 Agent，发现文档不一致或架构约束违规。

代码库随 Agent 持续修改会逐渐混乱。Harness 需要"清洁机制"定期整理。

### 3.6 方法论：怎么做 Harness Engineering

#### 3.6.1 故障驱动迭代（HumanLayer）

> "当 Agent 犯错时，把它当作信号——识别缺什么（工具？约束？文档？），然后补上。"

不是预先设计完美 Harness，而是**从最小可用开始，让失败指导迭代**。

#### 3.6.2 Working Backwards（LangChain）

> 从期望的 Agent 行为出发，反推需要什么 Harness 设计。

"Behavior we want (or want to fix) → Harness Design to help the model achieve this."

#### 3.6.3 先减后加

> 不是"缺什么加什么"，而是先精简到最小可用集，观察失败模式，再针对性补充。

Vercel 证明了这一点：从 15 工具减到 2 工具，性能反而提升。

#### 3.6.4 "Skill Issue" 操作原则

> "The model is probably fine. It's just a skill issue." —— HumanLayer
>
> Agent 犯错时，先找 Harness 配置问题，不要换模型。

HumanLayer 数据：Opus 4.6 在不同 Harness 上排名从 #33 到 #5。问题几乎总是在 Harness。

### 3.7 Pi 作为标本：一次交互的 Harness 全貌走查

带读者走一遍完整交互："当你在 Pi 中输入一行文字按下回车，到看到结果，Harness 的 15+ 个子系统如何在幕后协同？"

完整事件链：输入捕获 → slash command 检查 → skill 展开 → extension hook → AgentSession.prompt() → system prompt 组装 → 历史消息加载 → LLM 调用 → 流式事件 → 事件队列串行处理 → 持久化 + 扩展分发 + UI 渲染 → tool call → 权限检查 → 工具执行 → 结果截断 → turn 结束 → auto-compaction 检查 → auto-retry 检查 → 消息队列检查 → 最终渲染。

### 3.8 诊断元技能：模型问题还是 Harness 问题？

| 症状 | 更可能是模型问题 | 更可能是 Harness 问题 |
|------|----------------|---------------------|
| 输出逻辑错误 | ✓ | |
| 工具调用参数错误 | 部分 | ✓ (schema 描述不够清晰) |
| 重复执行同一操作 | | ✓ (循环检测缺失) |
| 长会话后质量下降 | | ✓ (上下文腐烂 / compaction 问题) |
| 在特定项目上失败 | | ✓ (配置 / context files 问题) |
| 所有任务都表现差 | ✓ | |
| 特定类型任务失败 | | ✓ (工具 / skill / prompt 问题) |

经验法则：**如果同一个模型在不同 Harness 上表现不同，就是 Harness 问题。**

### 3.9 Product Gap 分析：你的 Agent 缺什么？

读者拿出 Demo 06，对照五个鸿沟做系统性评估。这个评估表就是 Ch10-Ch14 的个性化学习路线。

### 3.10 检验标准

- [ ] 能用自己的语言解释"什么是 Agent Harness"以及它和 Agent 内核的区别
- [ ] 能列出五个根本性鸿沟并解释每个鸿沟的核心 trade-off
- [ ] 能解释成本反转原理并举出 3 个例子
- [ ] 能解释"为什么 2 个工具可能比 15 个工具更好"
- [ ] 能解释"为什么改 Harness 不改模型可以从 Top 30 跳到 Top 5"
- [ ] 当 Agent 失败时，能用诊断表判断问题类型
- [ ] 完成了自己 Agent 的 Product Gap 分析

---

## 4. Ch10：控制回路 — "Agent 失控了"

### 4.1 痛苦场景

> 你给 Agent 一个任务："重构 auth 模块"。它开始工作了。
>
> 5 分钟后，你发现它走错了方向——但你无法在不终止它的情况下纠正它。
> 10 分钟后，API 返回了 429 Too Many Requests，Agent 直接崩溃了。
> 你重启后，它从头开始，完全不知道之前做了什么。
> 你加了一个 follow-up 消息，但它在当前 turn 结束前不会看到。
> 最后你发现它在循环——反复尝试同一个失败的 edit，每次用同样的方式。
>
> 你的 Agent 有一个大脑，但没有神经系统。

### 4.2 为什么会痛（理论连接）

这些症状对应控制系统模型中的经典故障：
- 无法纠正方向 = **可控性不足**（缺少 steering 机制）
- API 失败即崩溃 = **扰动抑制缺失**（没有 retry / 降级）
- 重启后失忆 = **状态不持续**（没有 checkpoint）
- 消息不及时 = **控制带宽不足**（缺少消息队列分级）
- 循环执行 = **稳定性失败**（缺少循环检测 / 负反馈）

控制系统需要：传感器（事件流）、执行器（工具调用）、控制器（AgentSession）、反馈回路（工具结果 → 下一次决策）。缺少任何一个，系统就不稳定。

### 4.3 业界怎么解决

**通用模式：Agent Orchestrator**

Orchestrator 的七项核心职责：生命周期管理、事件分发、上下文组装、请求协调、控制与守卫、错误恢复、可观测性。

**设计光谱（不同产品的不同选择及其 WHY）**：

| 产品 | Orchestrator 厚度 | WHY |
|------|------------------|-----|
| Pi | 中等 (~3,200 行) | 极简哲学——够用就好，理解每一行 |
| Claude Code | 重量级 | 企业需求——需要 18 种 Hook、5 种权限模式、管理策略 |
| Vercel AI SDK | 极薄 | SDK 哲学——用户自己组装，不强加结构 |
| LangGraph | 图引擎 | 学术背景——用图的形式化保证执行正确性 |

**自治光谱**（决定了控制回路的粒度）：

human-in-the-loop（每步审批）→ human-on-the-loop（选择性干预）→ human-out-of-the-loop（仅监控）

### 4.4 Pi 的解法：AgentSession 深度解剖

#### 4.4.1 依赖注入与子系统协调

AgentSession 不自己创建任何子系统，全部通过构造参数接收。

**理论锚点**：为什么不在内部 new？控制系统原理：controller 不应该和 plant 耦合。相同的 controller（AgentSession）应该能驱动不同的 plant（Interactive / Print / RPC 模式）。

#### 4.4.2 事件分发与异步队列

事件路由链：Agent Event → `_agentEventQueue`（串行化）→ SessionManager.append() + ExtensionRunner.dispatch() + UI callback + Auto-compaction check。

**理论锚点**：为什么事件必须串行处理？控制论的基本原则——并发反馈会腐蚀控制器状态。如果持久化和 UI 渲染并发处理同一事件，可能出现持久化成功但 UI 未更新（用户看不到结果），或 UI 更新但持久化失败（重启后丢失）。

#### 4.4.3 消息队列与请求协调

三种消息注入机制（对应源码 `_steeringMessages`、`_followUpMessages`、`_pendingNextTurnMessages`）。

**为什么不能合并为一种？** 因为它们的时序语义不同：steering 在当前 turn 内生效（即时纠偏），follow-up 在当前 turn 结束后生效（追加任务），next-turn messages 是扩展注入的隐藏上下文（用户不可见）。合并会丢失时序控制力。

#### 4.4.4 错误恢复

- **Auto-retry**：可重试错误检测（overloaded / rate limit / 5xx）→ 指数退避 → 错误消息从 Agent 状态移除但保留在 Session 中

  **理论锚点**：为什么用指数退避而不是固定间隔？控制论：激进重试 = 振荡（每次重试都收到相同 429，系统不收敛）。指数退避引入"阻尼"，让系统逐渐稳定。

- **Overflow Recovery**：检测溢出 → 移除错误消息 → 自动压缩 → 重试 → `_overflowRecoveryAttempted` 防循环标志

  **理论锚点**：成本反转原理——溢出后，"保留"所有历史已经不可能，唯一出路是"压缩取回"。防循环标志是稳定性保证——防止"压缩 → 重试 → 再溢出 → 再压缩"的无限循环。

#### 4.4.5 启动序列与优雅关闭

6 阶段启动：CLI 参数 → Settings → Model Registry → Resources → Session 恢复 → Mode 选择。

多 AbortController 协调关闭：compaction / retry / bash / branch summary 各自独立可取消。

#### 4.4.6 可观测性——控制回路的"传感器"

控制系统的质量取决于传感器的质量。Harness 的"传感器"就是可观测性基础设施。

**事件流设计**：AgentSession 的 `subscribe(listener)` 是一等 API——所有消费者（UI、持久化、扩展、外部监控）通过同一个接口获取信息。

**关键设计决策**：工具输出在事件流中保留**完整版本**，发给 LLM 的是**截断版本**。宿主应用永远拥有完整信息——这是"传感器不应该丢弃信息"原则的体现。

**生产级可观测性需要**：
- **结构化日志**：每个事件带 timestamp、event type、tool name、token count，可被 log pipeline 消费
- **成本追踪**：每次 LLM 调用的 input/output tokens、缓存命中率、美元成本，归因到具体任务
- **决策路径记录**：Agent 为什么选了这个工具？选择时看到了哪些候选？这对调试至关重要
- **健康指标**：上下文利用率、compaction 频率、retry 频率、平均 turn 数——这些是 Harness 健康度的"仪表盘"

Pi 的实现：`getSessionStats()`（消息数、工具调用数、token 总量、成本）、`getContextUsage()`（当前上下文占用百分比）。

**理论锚点**：控制论中，可观测性（observability）定义为"能否从输出推断系统内部状态"。如果你只能看到 Agent 的最终输出而看不到中间事件流，你就无法诊断问题——系统对你是不可观测的。

### 4.5 问题驱动 Demo

```
Step 1: 实现最简控制回路（AgentHarness 类 + 事件分发）
Step 2: 运行 → 观察：API 返回 500 时整个程序崩溃
Step 3: 加入 auto-retry + 指数退避 → 运行 → API 错误被静默恢复
Step 4: 观察：Agent 连续 5 次尝试同一个失败的 edit
Step 5: 加入停止条件（turn 限制 + abort）→ 循环被打断
Step 6: 观察：想中途纠正 Agent 方向但做不到
Step 7: 加入 steering 消息队列 → 能在 Agent 运行中注入纠偏指令
```

### 4.6 元技能

**诊断**：如何判断"这是控制问题"？
- 症状：Agent 循环、不可停止、事件丢失、错误级联、无法中途纠偏

**优先级**：控制回路是第一个要建的——没有它，后续一切（工具、记忆、配置）无从挂载。

**评估指标**：错误恢复率（多少 transient error 被自动恢复）、平均恢复时间、事件丢失率。

### 4.7 简化思考

随着模型更擅长自我恢复（检测到错误后自动换策略），部分 retry 逻辑可能变得不必要。但生命周期管理和事件分发是**不可简化的**——只要 Agent 运行在外部环境中，就需要有东西管理启动和关闭。

### 4.8 检验标准

- [ ] Agent 能启动、接受请求、返回响应
- [ ] API 返回 500/429 时自动重试（指数退避，最多 3 次）
- [ ] 上下文溢出时自动压缩并重试
- [ ] 超过 turn 限制时自动停止并报告
- [ ] 能通过 steering 消息中途纠正 Agent 方向
- [ ] 优雅关闭：所有进行中的操作被正确取消
- [ ] 事件流完整：每个工具调用和结果都有对应事件
- [ ] 能查询 session 统计（消息数、工具调用数、token 总量）

---

## 5. Ch11：边界与信任 — "Agent 做错了，甚至做了危险的事"

### 5.1 痛苦场景

> 你的 Agent 有了控制回路，运行很稳定。但是：
>
> 它尝试编辑一个文件，但 LLM 输出的 oldText 包含智能引号（`'` 而不是 `'`），匹配失败。Agent 不知道怎么办，反复尝试同一个 edit 5 次。
>
> 你让它运行一个测试命令，命令挂起了 10 分钟，你不得不手动杀进程。
>
> 它执行了一次 grep 返回了 50MB 的结果，直接把上下文窗口塞满了。
>
> 最可怕的：它执行了 `rm -rf ./src` 而不是 `rm -rf ./src/tmp`——路径幻觉。
>
> 你的 Agent 能行动了，但它的行动不值得信赖。

### 5.2 为什么会痛（理论连接）

两个鸿沟交织：

**边界鸿沟**：LLM 在 token 空间思考，但文件系统在字节空间运行。Unicode 智能引号在 token 空间和字节空间有不同表示。工具就是翻译层——翻译的保真度决定了可靠性。

**信任鸿沟**：LLM 必须有执行权力才有用（能读写文件、执行命令），但不能完全被信任（会幻觉路径、被 prompt injection 操纵）。这是一对根本矛盾——力量和安全的张力。

**理论预测**：成本反转原理告诉我们——更多工具"保留"在 Agent 的工具集中，消耗更多注意力预算。Vercel 的 2 > 15 实验验证了这个预测。

### 5.3 业界怎么解决

#### 5.3.1 工具工程的四种流派

| 流派 | 代表 | 核心策略 | WHY 选择这种策略 |
|------|------|---------|-----------------|
| 精确 + 模糊回退 | Pi, Claude Code | 先 exact match，失败后 normalize retry | 简单可靠，失败可预测。极简哲学。 |
| Sketch + Apply 模型 | Cursor | 前沿模型生成 sketch，专用 Apply 模型集成 | 追求编辑速度（1000 tok/s），牺牲透明性换速度。 |
| 多格式适配 | Aider, Cline | 不同模型用不同 diff 格式 | 适配多模型生态。Cline 发现成功率提升 10-25%。 |
| 全文件重写 | 简单实现 | 返回整个文件 | 最简单但最贵，且模型倾向省略代码。 |

**深层分析**：这四种流派对应三种设计哲学——Pi 选简洁（理解每一行），Cursor 选速度（开发者体验），Aider 选兼容性（多模型支持）。没有绝对最优——取决于你的约束。

#### 5.3.2 防御性工具工程的七条原则

1. 架构约束优于行为约束
2. 歧义时失败（Fail-Closed）
3. 提供可自修复的错误信息（给 LLM 看的，不是给人看的）
4. 最小化工具集，消除歧义
5. 分离信息获取与状态变更
6. 输出截断是一等公民
7. Operations 抽象实现环境解耦

#### 5.3.3 沙箱隔离光谱

seccomp → Bubblewrap → Docker → gVisor → WASM → Firecracker

Trail of Bits 的发现："命令白名单是安全幻觉"——`git`、`find` 的隐藏 flag 可以执行任意代码。真正的安全边界必须在 OS 层。

Claude Code 的实践：Seatbelt（macOS）/ Bubblewrap（Linux），同时限制文件系统和网络。开源为 `@anthropic-ai/sandbox-runtime`。

### 5.4 Pi 的解法

#### 5.4.1 Edit 工具——容错翻译

三阶段匹配（精确 → 模糊 normalize → 报错 + 引导）。

`normalizeForFuzzyMatch()`：Unicode NFKC、智能引号 → ASCII、Unicode 横线 → ASCII、特殊空格 → 普通空格。

**理论锚点**：每种 normalization 都对应一个边界鸿沟的具体实例——LLM 在 Markdown 渲染环境中"看到"的字符和文件系统中"存储"的字符不同。fuzzy matching 就是在弥合这个翻译损失。

其他防御：UTF-8 BOM 处理、行尾保持、唯一性验证、Diff 生成。

#### 5.4.2 Bash 工具——安全执行

Rolling Buffer + Temp File 混合策略、进程树杀死、Command Prefix、Operations 抽象。

**理论锚点**：为什么"保留"完整 bash 输出是昂贵的？成本反转——50MB 的测试输出常驻上下文会摧毁推理能力。所以 Pi 用 truncateTail 只保留尾部（错误信息通常在最后），同时把完整输出写到 temp file（供人类查看）。两种"消费者"（LLM 和人类）获得不同版本的同一个输出。

#### 5.4.3 输出截断

双模策略（truncateHead 文件读取、truncateTail bash 输出）。UTF-8 边界安全。元数据驱动引导。

#### 5.4.4 文件变更安全

File Mutation Queue：Promise chain per-file 串行，`realpath()` 解析符号链接。40 行代码解决并发文件操作的正确性。

#### 5.4.5 路径工程

macOS Unicode 陷阱：NFD、窄 NBSP、Curly quote。`resolveReadPath()` 5 种变体匹配。"隐形可靠性"——用户永远不知道它存在，但没有它 5% 的文件操作莫名失败。

#### 5.4.6 错误消息工程

为 LLM 设计 vs 为人类设计。自修复反馈循环。Aider/Cline 数据：好的错误消息提升 edit 成功率 10-25%。

### 5.5 问题驱动 Demo

```
Step 1: 实现基础 Edit 工具（精确匹配）
Step 2: 用 LLM 生成一段带智能引号的 edit → 匹配失败
Step 3: 加入 fuzzy matching → 成功
Step 4: 实现基础 Bash 工具（spawn + wait）
Step 5: 运行一个会 hang 的命令 → 进程无法被杀掉
Step 6: 加入超时 + 进程树杀死 → 安全终止
Step 7: 运行一个输出巨大的命令 → 上下文被淹没
Step 8: 加入 truncateTail → 只保留关键的尾部信息
Step 9: 尝试不读取就编辑 → 编辑了错误的位置
Step 10: 加入 read-before-write 门控 → 安全
```

### 5.6 元技能

**诊断**：如何判断"这是工具问题"？
- 症状：edit 频繁失败、bash 挂起、输出爆炸、意外文件变更

**评估**：工具可靠性指标——edit 首次匹配率、bash 超时率、截断触发频率。

**调优**：HumanLayer 的经验——先用最少的工具（bash + read），只在 bash 不够用时才加专用工具。

### 5.7 简化思考

随着模型更擅长输出精确的文本匹配，fuzzy matching 的重要性会下降。但沙箱和权限是**不可简化的**——即使模型 100% 可靠，外部攻击（prompt injection）仍然存在。安全不会因为模型进步而变得不必要。

### 5.8 检验标准

- [ ] LLM 输出带智能引号的 oldText 时，模糊匹配成功
- [ ] Edit 找到多个匹配时拒绝执行并返回引导信息
- [ ] Bash 命令超时时杀掉整个进程树
- [ ] 大输出（>50KB）正确截断并保留尾部
- [ ] 同一文件的并发 Edit 串行执行
- [ ] 变更工具需要权限确认，只读工具直接执行
- [ ] 错误消息包含足够上下文让 LLM 在下一个 turn 自修复

---

## 6. Ch12：记忆与注意力 — "Agent 忘了之前做的事"

### 6.1 痛苦场景

> 你的 Agent 现在可控且可靠。你让它重构一个大模块。
>
> 前 20 分钟一切顺利——它读了文件，理解了结构，开始修改。
> 第 25 分钟，你注意到它又读了之前已经读过的文件。
> 第 30 分钟，它开始重复一个 15 分钟前就做过的修改。
> 你查看上下文使用量：95%。Agent 的推理空间被历史消息挤压殆尽。
>
> 更糟的是——你关掉终端去吃午饭，回来后一切从零开始。
> 它不记得修改了哪些文件、做了哪些决策、下一步该做什么。
>
> 你的 Agent 有行动力，但没有记忆力。

### 6.2 为什么会痛（理论连接）

两个鸿沟叠加：

**状态鸿沟**：LLM 是无状态函数——每次调用都是一个独立的数学运算。"记住之前做了什么"不是模型的原生能力，必须由 Harness 提供。

**注意力鸿沟**：即使你把所有历史塞进上下文，模型也会因"注意力衰减"和"中间遗忘"而丢失早期信息。更大的上下文窗口不是解药——Pichay 研究发现 21.8% 是结构性浪费，工具结果中位数放大因子 84.4x。

**成本反转原理是本章的中心轴**：

在传统计算中，保留内存页是免费的，缺页中断（page fault）是昂贵的。
在 LLM 上下文中，完全相反——保留每个 token 消耗注意力预算（昂贵），用工具重新读取文件（廉价）。

**这个反转决定了记忆系统的几乎所有设计决策。**

### 6.3 业界怎么解决

#### 6.3.1 记忆层次结构

| 层级 | 类比 | 内容 | 访问成本 | 驻留策略 |
|------|------|------|---------|---------|
| L1 | CPU Cache | 当前推理活跃的 token | 最高（每 token 付注意力） | 只保留高信号 token |
| L2 | RAM | 本轮需要但不必每 turn 常驻 | 中等（工具调用） | 按需加载 |
| L3 | Swap | 早期对话、已完成的工具交互 | 低（摘要 token） | 压缩后保留摘要 |
| L4 | 磁盘 | CLAUDE.md、进度文件、git 历史 | 最低（读文件） | 持久化，会话间存活 |

#### 6.3.2 三种压缩策略

| 策略 | 描述 | 压缩率 | 幻觉风险 | 适用场景 |
|------|------|--------|---------|---------|
| Token 清除（Compaction） | 删除原始 token，零改写 | 50-70% | 零 | 编码（精确路径关键） |
| LLM 摘要（Summarization） | LLM 改写为结构化摘要 | 80-90% | 中等 | 长对话需大幅减少上下文 |
| Observation Masking | 隐藏输出，保留动作 | 变动 | 低 | 保留推理链，去除数据 |

**生产实践：层叠使用** — Tool Result Clearing（最轻）→ Thinking Clearing → LLM Summarization（最重）。

**Factory.ai 数据**：结构化摘要 3.70/5 vs Anthropic 默认 3.44/5 vs OpenAI 3.35/5。**但即使最好的方案，多会话信息保留率也仅 37%。** 这不是可以"解决"的问题，是根本性限制。

#### 6.3.3 会话分支

ContextBranch 研究：Git-like 分支改善质量 +2.5%，减少上下文 58.1%。分支不只是功能——它通过隔离探索路径减轻注意力负担。

#### 6.3.4 外部记忆：文件系统作为 L4

Anthropic 的 Initializer-Executor 模式。Manus 的 todo.md。关键：不要只靠上下文记忆——把关键状态**刻意外化**到文件系统。

### 6.4 Pi 的解法

#### 6.4.1 JSONL 树状存储

SessionManager（1,410 行）。append-only JSONL。9 种 Entry 类型。id/parentId DAG。

**理论锚点**：为什么用 append-only？状态鸿沟的最安全桥接——只追加不修改，永远不会因为崩溃丢失已写入的数据。

#### 6.4.2 分支机制

`branch(branchFromId)` = 一行代码（移动 leaf 指针）。不修改任何历史。带摘要的分支用 LLM 生成上下文保留。

#### 6.4.3 Compaction 系统

两阶段摘要（历史 + Turn 前缀，并行执行）。

**切点算法的理论锚点**：为什么不在 toolResult 处切？因为 toolResult 和 toolCall 是配对的——单独的 toolResult 在 LLM 看来没有意义（是对什么工具调用的结果？）。切点必须尊重语义完整性。

**Token 估算的理论锚点**：为什么 `chars/4` 是最优启发式？成本反转——高估触发 compaction 略早（低成本，只是稍微早压缩了一点），低估导致上下文溢出（高成本，Agent 崩溃）。保守启发式是成本反转原理的直接推论。

**结构化摘要格式**：Goal / Constraints / Progress / Decisions / Next Steps / Critical Context。Factory.ai 的发现："结构强制保留"——有了固定分区，摘要不会默默丢掉文件路径或跳过决策。

**文件操作追踪**：从被摘要的消息中提取 read/write/edit 操作，追加 XML 标签到摘要尾部。即使详细对话被压缩了，Agent 仍知道"我之前改过哪些文件"。

#### 6.4.4 何时触发

**理论锚点**：为什么 75% 比 95% 更好？注意力鸿沟告诉我们——性能在窗口填满之前就开始退化（"上下文腐烂"）。75% 时触发保留了 25% 的"推理空间"，全程维持较高推理质量。Claude Code 的生产数据验证了这一点。

#### 6.4.5 会话迁移

v1→v2（添加树结构）→ v2→v3（重命名 role）。自动运行，向后兼容。

### 6.5 成本反转全景表

本章的核心框架——每个记忆决策都是"保留 vs 取回"的 trade-off：

| 决策 | 保留（昂贵） | 取回（廉价） | Pi 的选择 |
|------|------------|-------------|----------|
| 历史消息 | 全量在上下文 | Compaction 摘要 | 阈值触发摘要 |
| 工具结果 | 原始输出常驻 | Clearing + 重新执行 | truncate + 元数据 |
| Thinking blocks | 所有 turn 保留 | 只保留最近 turn | 可配置 |
| 文件内容 | 预加载到上下文 | read 工具按需 | 按需 |
| 子任务上下文 | 在主 Agent 上下文中 | 子 Agent 隔离 | Proxy transport |

### 6.6 问题驱动 Demo

```
Step 1: 实现 JSONL 会话持久化（写入 + 读取 + 恢复）
Step 2: 关闭 Agent → 重新启动 → 对话完整恢复
Step 3: 开始一个长任务 → 观察上下文逐渐填满 → Agent 开始重复工作
Step 4: 实现 chars/4 token 估算 + 阈值检测
Step 5: 实现切点算法 + LLM 摘要
Step 6: 再次运行长任务 → compaction 触发 → Agent 用摘要继续工作
Step 7: 尝试分支 → fork 后两条路径互不干扰
```

### 6.7 元技能

**诊断**：如何判断"这是记忆问题"？
- 症状：Agent 重复之前做过的工作、质量随时间下降、重启后丢失进度

**优先级**：Compaction 是第一个要建的记忆机制——上下文溢出是最早遇到的致命问题。Session 持久化是第二个（用户会关终端）。分支可以最后加。

**评估**：compaction 后的任务完成率 vs 未 compaction 的完成率。摘要保留了多少关键信息（决策、文件路径、下一步）。

### 6.8 简化思考

随着上下文窗口增大（100K → 200K → 1M），触发 compaction 的频率会下降。但 compaction 不会消失——即使 1M token 窗口，一个跨越数小时的重构任务仍然会填满它。而且更大的窗口带来"上下文腐烂"——模型不是因为窗口满了才变差，是因为噪声累积。

---

## 7. Ch13：适应 — "Agent 只在我的环境里能用"

### 7.1 痛苦场景

> 你的 Agent 现在可控、可靠、有记忆。你在自己的项目上用得很开心。
>
> 你把它给同事用。他用的是 GPT-4 不是 Claude，Agent 不知道怎么处理不同的 API。
> 你在另一个项目上用，那个项目用 tabs 而不是 spaces，Agent 的 edit 指令全是 spaces。
> 你想加一个"代码审查"工作流，但这需要修改系统提示词——改了之后，原来的"编码"工作流出了问题。
> 你的团队有安全规定——不能用某些模型、不能执行某些命令——但 Agent 什么都不知道。
>
> 你的 Agent 能工作，但只在**你的**环境里。

### 7.2 为什么会痛（理论连接）

**适应鸿沟**：同一份模型权重，面对无限多样的用户、项目、组织、安全策略。模型不会因为你换了项目就自动知道新的约定。

**"Skill Issue" 原则在此章最为核心**：

> "The model is probably fine. It's just a skill issue." —— HumanLayer

HumanLayer 数据：Opus 4.6 在不同 Harness 配置下排名从 #33 到 #5。问题几乎总是在配置，不在模型。

**成本反转在适应层的体现**：更多指令"保留"在 system prompt 中 ≠ 更好的表现。HumanLayer 发现 CLAUDE.md 超过 60 行反而降低性能，自动生成的指令文件增加 20% token 成本但不提升质量。

### 7.3 业界怎么解决

#### 7.3.1 三层分离

```
知识层 (CLAUDE.md / AGENTS.md)  → "Agent 应该知道什么"
能力层 (Skills / MCP / Tools)   → "Agent 能做什么"
策略层 (Settings / Permissions)  → "Agent 被允许做什么"
```

为什么分离？变更节奏不同、负责人不同、作用域不同。

#### 7.3.2 分层配置

通用层级：企业（不可覆盖）→ 项目（团队共享）→ 用户（个人偏好）→ 本地（gitignore）→ CLI（临时）。

**不同产品的不同选择及其 WHY**：
- Claude Code 4 层（managed → local）：因为服务企业，需要不可覆盖的安全策略
- Pi 2 层（global + project）：因为极简哲学，够用就好
- Cursor 2 层（user + project）：因为 IDE 场景，配置跟着编辑器走

#### 7.3.3 动态 System Prompt

Claude Code：110+ 个模块化组件，每个标注 token 消耗。根据环境、功能开关、执行模式条件组装。

**理论锚点**：为什么 Pi 的指导原则根据活跃工具动态生成？适应鸿沟 + 成本反转——如果 bash 被禁用，"优先用 grep 而非 bash"这条指令就是噪声（消耗注意力但提供零价值）。动态生成确保每个指导原则都是高信号的。

#### 7.3.4 Skills 渐进式披露

**理论锚点**：为什么 Skills 分三级（元数据 → 完整指令 → 辅助资源）？成本反转——50 个 Skill 的完整内容（~50,000 tokens）常驻 system prompt 会直接进入"笨区"。只有元数据（~2,500 tokens）常驻，内容按需加载。

#### 7.3.5 模型路由

不同任务需要不同的模型-成本平衡。Plan-Execute 分离可以节省高达 90% 成本。

#### 7.3.6 教学案例：CLAUDE.md 的精简之旅

一个让"less is more"变得具象的实操案例：

> **Before**（200 行 CLAUDE.md，自动生成）：
> - 每个文件的详细描述
> - 每个 API 端点的参数说明
> - 完整的编码规范（缩进、命名、注释风格...）
> - 项目历史和背景
> - 结果：token 成本 +20%，Agent 表现无提升甚至下降
>
> **After**（45 行，人工精炼）：
> - 3 行项目定位
> - 5 行关键命令（build / test / lint）
> - 10 行核心约定（只列"Agent 容易犯错的"约定，不列"显而易见的"）
> - 5 行安全边界（不能碰的文件和目录）
> - 剩余行留给项目特有的非直觉知识
> - 结果：Agent 表现提升，成本下降
>
> **原则**：CLAUDE.md 不是文档——是给 Agent 的"备忘便签"。只写模型不看代码就不会知道的东西。

这个案例让读者体验到：适应性工程不是"加更多配置"，而是**精准配置**。

### 7.4 Pi 的解法

SettingsManager（deep merge + 修改追踪 + 文件锁）。system-prompt.ts（双路径 + 工具感知指导原则）。skills.ts（SKILL.md 发现 + 验证 + 去重 + XML 注入）。model-resolver.ts（pattern matching + 最后冒号拆分 + 别名偏好 + glob）。ResourceLoader（5 种资源统一管理 + 路径元数据 + 目录树遍历）。

**Ch8 覆盖边界说明**：Ch8（Part 1）已覆盖 Skills 的用户面概念。Ch13 聚焦 Ch8 未涉及的**工程内部视角**：验证管道实现、名称规范设计决策、符号链接去重原理、冲突诊断架构。

### 7.5 问题驱动 Demo

```
Step 1: 硬编码 system prompt → 在新项目上表现差
Step 2: 实现分层 settings（global + project）+ deep merge → 不同项目不同配置
Step 3: 硬编码所有指导原则 → 禁用 bash 后仍出现 bash 相关指令（噪声）
Step 4: 实现工具感知的动态指导原则 → 指令随工具集变化
Step 5: 想添加"代码审查"工作流但不想改 prompt → 实现 Skill 系统
Step 6: Skill 加载后 → /skill:code-review 注入专业指令而不影响其他工作流
```

### 7.6 元技能

**"先减后加"调优路径**：
1. 从最小配置开始（空 CLAUDE.md，默认 4 工具）
2. 运行，观察失败
3. 分析：是缺工具？缺指令？缺配置？
4. 只添加针对这个失败的最小修复
5. 重复

**60 行规则**：CLAUDE.md 控制在 60 行以内。如果需要更多，用 Skills 按需加载。

**Working Backwards**：从"我希望 Agent 怎么表现" → 反推需要什么配置/Skill/Prompt。

### 7.7 简化思考

随着模型变得更擅长理解上下文和遵循指令，部分配置（如详细的编码风格指导）可能变得不必要——模型能从项目代码中自动学习风格。但安全策略（哪些模型可用、哪些操作被禁止）是**不可简化的**——它们由组织决定，不会因模型进步而消失。

### 7.8 检验标准

- [ ] 项目级 settings 能覆盖全局 settings 的特定字段，其余字段继承
- [ ] 禁用 bash 工具后，system prompt 中不出现 bash 相关指导原则
- [ ] 添加自定义 Skill 后，LLM 在 system prompt 中看到其描述
- [ ] `/skill:my-skill` 正确加载 SKILL.md 内容注入上下文
- [ ] `model:high` 语法正确解析为模型 + thinking level
- [ ] 配置文件解析失败时 Agent 用默认配置启动

---

## 8. Ch14：交付 — "只有我一个人能用这个 Agent"

### 8.1 痛苦场景

> 你的 Agent 可控、可靠、有记忆、能适应。它是一个完整的 Harness 了——但只有你能在终端里用。
>
> 你的 CI/CD pipeline 需要它自动执行代码审查——但它需要交互式输入。
> 你的 IDE 扩展想嵌入它——但它只有终端界面。
> 你的团队需要在它执行危险操作前审批——但没有 Hook 机制。
> 你想把一次精彩的 Agent 会话分享给同事——但它只是终端里的文字。
>
> 你的 Agent 是一个好产品，但**到不了用户手里**。

### 8.2 为什么会痛（理论连接）

这不是一个"鸿沟"——而是 Harness 洋葱模型的**最外层**。前四章构建了一个完整的 Harness 核心（控制 + 信赖 + 记忆 + 适应），交付层决定用户如何接触这个核心。

核心架构洞见：**Agent 核心是一个无 I/O 观点的库。** 它不知道也不关心谁在消费它的输出。事件订阅模式（`session.subscribe()`）是实现这种解耦的关键——一个订阅就是一种交付模式。

### 8.3 业界怎么解决

#### 8.3.1 传输协议光谱

stdio（本地子进程）→ Streamable HTTP（远程服务）→ WebSocket（实时交互）。MCP 为什么弃用 SSE。

#### 8.3.2 SDK 设计

Claude Agent SDK 的模型：`query()` 返回 async iterator，产出 5 种类型化消息（SystemMessage / AssistantMessage / UserMessage / StreamEvent / ResultMessage）。同一个循环驱动 CLI 和 SDK。

#### 8.3.3 Hook 系统——交付层的可编程控制面

**统一命题**：Hook 不是杂项功能——它是 Harness 暴露给外部消费者（CI/CD、企业管理员、安全团队）的**可编程控制面**。

Claude Code：18 事件 × 4 Hook 类型。决策控制（allow / deny / modify / inject / halt）。

#### 8.3.4 生产部署

临时会话 vs 长运行会话 vs 混合会话。状态管理（Redis / StatefulSet / 外部数据库）。会话恢复（session_id + resume）。

#### 8.3.5 展望：多 Agent 编排

**注意：本节为展望性内容，不在 Demo 范围内。**

多 Agent 是交付工程的延伸——"消费者"不再是人类用户，而是另一个 Agent。三种模式：
- 子 Agent（Claude Code：隔离上下文，只返回摘要到父 Agent）
- Handoff（OpenAI：转移对话所有权，不是隔离而是接力）
- 并行 Worktree（Cursor：git 隔离的 8 个并行 Agent）

这是一个快速演化的领域（共享状态管理、冲突解决、上下文隔离策略都是开放问题）。本教程建立基础认知，不做深入实现。读者完成 Part 2 后具备独立探索这个方向的能力。

### 8.4 Pi 的解法

#### 8.4.1 三种模式，一个 AgentSession

**理论锚点**：为什么所有模式共享一个 AgentSession？控制系统原理——一个 controller，多个 observer。AgentSession 是 controller，三种模式是不同的 observer。改变 observer 不影响 controller 的行为。

- Interactive Mode（4,570 行）：实时流式渲染。`message_delta` → `streamingComponent` 累积 → 逐 delta 渲染。
- Print Mode（125 行）：单次执行。一个 `subscribe` + 一个 `prompt` + 输出最终文本。**125 行代码服务一个完整的 CLI 交付。**
- RPC Mode（646 行）：JSON stdin/stdout。自定义 JSONL 解析器（Unicode 安全）。Extension UI 异步 request/response。
- SDK（376 行）：`createAgentSession()` 工厂函数。进程内嵌入。

#### 8.4.2 Extension UI 优雅降级

`ExtensionUIContext` 在不同模式下有不同实现。不支持的能力返回 stub，不抛异常。`hasUI` 判断。

#### 8.4.3 HTML 导出

会话 → JSON → Base64 → 嵌入 HTML 模板。自包含、可离线查看。主题色自动推导。

### 8.5 问题驱动 Demo

```
Step 1: 实现 Print Mode（~30 行）→ echo prompt | agent → 输出结果
Step 2: 尝试从外部脚本控制 Agent → 做不到（只有 stdin prompt）
Step 3: 实现 RPC Mode（JSON stdin/stdout）→ 外部脚本能双向通信
Step 4: 想在 Agent 执行 rm 前拦截 → 做不到
Step 5: 实现 PreToolUse Hook → rm 命令被阻止
Step 6: 想分享一次精彩会话 → 实现 HTML 导出 → 自包含离线查看
```

### 8.6 元技能

**诊断**：如何判断"这是交付问题"？
- 症状：Agent 只在特定环境可用、无法被脚本控制、无法被策略约束

**评估**：支持的交付模式数量、Hook 覆盖的事件数量、模式间代码复用率。

### 8.7 简化思考

随着标准化协议（MCP、Agent Skills Standard）的成熟，自定义 RPC 协议可能被标准协议替代。但事件订阅模式本身是**不可简化的**——只要有多种消费者，就需要这种解耦。

### 8.8 检验标准

- [ ] Print mode：`echo '{"type":"prompt","message":"hello"}' | node agent.js --mode json` 输出事件流
- [ ] RPC mode：外部脚本能通过 stdin/stdout 双向通信
- [ ] PreToolUse Hook 能阻止特定命令执行
- [ ] HTML 导出在浏览器中离线可查看
- [ ] 三种模式使用同一个 AgentSession 实例

### 8.9 附加：测试你的 Harness

Harness 的特殊挑战：它包裹一个非确定性系统（LLM），传统单元测试不直接适用。

**四种测试策略**：

| 策略 | 适用对象 | 方法 |
|------|---------|------|
| **Mock LLM** | 控制回路、事件分发、消息队列 | 用固定响应替代真实 LLM 调用，测试 Harness 逻辑本身 |
| **快照测试** | Session 序列化、HTML 导出 | 对比输出和已知正确的快照，捕获格式回归 |
| **属性测试** | Edit fuzzy matching、路径解析 | 生成随机 Unicode 输入，验证 normalize 的不变量（幂等性、往返一致性） |
| **集成测试** | 端到端流程 | Mock LLM + 真实文件系统，验证完整的 prompt → tool call → result → response 链路 |

**Pi 的实践**：Pi 用 Vitest 测试框架，`SessionManager.inMemory()` 提供无磁盘 I/O 的测试后端，Operations 接口支持 mock 注入。

**关键原则**：测试 Harness 逻辑，不测试模型智能。如果一个测试因为模型输出不同而失败，那是测试设计的问题——应该用 Mock LLM 隔离。

---

## 9. 毕业挑战

Part 2 的 6 章结束后，读者手里有一个 ~1,640 行的 Mini Harness 和完整的理论框架。毕业挑战检验他们能否**独立应用**这些知识。

### 9.1 挑战描述

> 用你在 Part 2 构建的 Harness 框架，给一个**非编码场景**的 Agent 构建完整 Harness。
>
> 可选场景：
> - **研究助手**：搜索文献、整理笔记、生成摘要。工具：web search、文件读写、笔记管理。
> - **数据分析师**：读取 CSV、执行 SQL、生成图表。工具：文件读取、SQL 执行、Python 脚本。
> - **客服机器人**：查询知识库、创建工单、升级到人工。工具：知识库检索、工单 API、人工转接。

### 9.2 你需要做的设计决策

- 需要什么工具？哪些是"边界翻译"，哪些是"信息获取"？
- 信任级别怎么设？哪些操作需要人类审批？
- 记忆策略怎么定？什么信息必须保留，什么可以压缩？
- 需要什么配置？哪些行为因场景而异？
- 交付模式是什么？CLI？Web API？Slack 机器人？

### 9.3 评估维度

- [ ] 能清晰说明五个鸿沟在你的场景中分别意味着什么
- [ ] 每个设计决策能追溯到理论框架（哪个鸿沟？哪个 trade-off？）
- [ ] 能用成本反转原理解释你的记忆策略
- [ ] Agent 在连续 20 分钟的工作中不崩溃、不退化
- [ ] 换一个不同的用户/项目/场景，Agent 不需要改代码就能适应

---

## 10. 理论-实践锚点索引

贯穿全 Part 的 15+ 个锚点，让理论框架持续发挥作用：

| 章节 | 设计决策 | 理论解释 |
|------|---------|---------|
| Ch10 | 事件必须串行处理 | 控制论：并发反馈腐蚀状态 |
| Ch10 | Auto-retry 用指数退避 | 控制论：激进重试 = 振荡 |
| Ch10 | Overflow recovery 有防循环标志 | 稳定性保证：防止无限压缩-重试循环 |
| Ch11 | Vercel 2 工具 > 15 工具 | 注意力鸿沟 + 成本反转：schema 常驻消耗注意力 |
| Ch11 | Edit 用 fuzzy matching | 边界鸿沟：token 表示 ≠ 字节表示 |
| Ch11 | Bash 输出用 truncateTail | 成本反转：保留完整输出太贵，尾部信息价值最高 |
| Ch12 | Token 估算用 chars/4 | 成本反转：高估便宜（早压缩），低估昂贵（溢出） |
| Ch12 | Compaction 在 75% 触发 | 注意力鸿沟：性能在窗口满之前就退化 |
| Ch12 | 工具结果最先被清除 | 成本反转：放大因子 84.4x = 最大浪费源 |
| Ch12 | 切点不在 toolResult 处 | 语义完整性：toolResult 必须和 toolCall 配对 |
| Ch13 | CLAUDE.md < 60 行 | 注意力鸿沟：更多指令 ≠ 更好（"笨区"） |
| Ch13 | 指导原则随工具集动态生成 | 适应鸿沟 + 成本反转：陈旧指令是负价值 |
| Ch13 | Skills 用渐进式披露 | 成本反转：元数据常驻便宜，内容按需加载 |
| Ch14 | 所有模式共享一个 AgentSession | 控制论：一个 controller，多个 observer |
| Ch14 | Print mode 只需 125 行 | 事件订阅的威力：一个 subscribe = 一种交付 |

---

## 11. Demo 项目设计

### 11.1 问题驱动的渐进叠加

```
Demo 06 (Part 1 裸 Agent, ~300 行)
  → Ch10 Demo: 遇到"失控"→ 建控制回路 (~250 行) → Demo 10-control
  → Ch11 Demo: 遇到"不可靠"→ 建可靠工具 (~250 行) → Demo 11-trust
  → Ch12 Demo: 遇到"遗忘"→ 建记忆系统 (~330 行) → Demo 12-memory
  → Ch13 Demo: 遇到"不适应"→ 建配置+Skills (~290 行) → Demo 13-adapt
  → Ch14 Demo: 遇到"到不了用户"→ 建交付层 (~220 行) → Demo 14-deliver
```

最终产物：~1,640 行的完整 Mini Harness。

### 11.2 每个 Demo 的结构

```
src/
  01-problem.ts    — 运行，观察失败
  02-solution.ts   — 修复，验证成功
  README.md        — 问题描述、理论连接、预期输出
  expected-output.md
```

所有 Demo 支持 Mock 模式。Demo 编号从 10 开始（Part 1 已用 01-09）。

---

## 12. 参考资料

### 11.1 业界关键文献

| 来源 | 标题 | 核心贡献 |
|------|------|---------|
| Anthropic | Effective harnesses for long-running agents (2025.11) | Initializer-Executor 模式 |
| Anthropic | Effective context engineering for AI agents (2025.09) | 上下文工程方法论 |
| LangChain | The Anatomy of an Agent Harness (2026) | Agent = Model + Harness 公式 |
| Martin Fowler | Harness Engineering (2026) | 三大支柱框架 |
| OpenAI | Harness Engineering (2026) | Codex 百万行实践 |
| HumanLayer | Skill Issue: Harness Engineering for Coding Agents (2026) | 6 配置杠杆 + "Skill Issue" 原则 |
| vtrivedy | HaaS: Harness as a Service (2025.09) | Harness 组件分解 + HaaS 愿景 |
| Parallel.ai | What is an agent harness (2025) | 5 阶段操作流程 |
| Pappas | The Agent Harness Is the Architecture (2026) | Manus 5 次重写 + 经济分析 |
| paddo.dev | Agent Harnesses: From DIY to Product (2026) | DIY → 产品化演进 |

### 11.2 Pi 源码引用

| 文件 | 行数 | 章节 |
|------|------|------|
| `core/agent-session.ts` | ~3,180 | Ch10 |
| `core/tools/edit.ts` + `edit-diff.ts` | ~540 | Ch11 |
| `core/tools/bash.ts` | ~330 | Ch11 |
| `core/tools/truncate.ts` | ~265 | Ch11 |
| `core/tools/file-mutation-queue.ts` | ~40 | Ch11 |
| `core/tools/path-utils.ts` | ~95 | Ch11 |
| `core/session-manager.ts` | ~1,410 | Ch12 |
| `core/compaction/compaction.ts` | ~815 | Ch12 |
| `core/compaction/branch-summarization.ts` | ~355 | Ch12 |
| `core/compaction/utils.ts` | ~170 | Ch12 |
| `core/settings-manager.ts` | ~950 | Ch13 |
| `core/skills.ts` | ~480 | Ch13 |
| `core/system-prompt.ts` | ~210 | Ch13 |
| `core/model-resolver.ts` | ~630 | Ch13 |
| `core/resource-loader.ts` | ~870 | Ch13 |
| `core/prompt-templates.ts` | ~300 | Ch13 |
| `core/resolve-config-value.ts` | ~105 | Ch13 |
| `modes/interactive/interactive-mode.ts` | ~4,570 | Ch14 |
| `modes/print-mode.ts` | ~125 | Ch14 |
| `modes/rpc/rpc-mode.ts` | ~645 | Ch14 |
| `core/sdk.ts` | ~375 | Ch14 |
| `core/event-bus.ts` | ~35 | Ch10, Ch14 |
| `main.ts` | ~875 | Ch10 |
