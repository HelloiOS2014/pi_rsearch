# Pi Agent 教程改进设计文档

> **目标**：让初级工程师/实习生读完教程后，能独立构建自己的 Agent（不限于编码 Agent）
> **当前评分**：6/10（理解 Pi 源码 9/10，构建自己的 Agent 6/10）
> **目标评分**：8.5/10
> **改动范围**：14 项改进（A-N），涉及 9 个章节 MDX + 3 个新增 Demo + 2 个新增附录

---

## 改进总览

### 第 1 批：结构性重构（致命问题）

#### A. 所有章节"先 WHY 后 WHAT 再 HOW"重构

**问题**：Ch02-Ch04 全部是"先给代码再解释"，初级工程师读代码时不知道为什么要这样设计。

**改动规则**：每个小节按以下顺序重组：
1. **问题场景**（2-3 句话描述没有这个东西会怎样）
2. **Pi 的解法**（SourceReader 展示源码 + 高亮注释）
3. **动手实现**（引用 Demo 或 CodeComparison）

**受影响章节和具体改动**：

**Ch02 核心循环**（改动最大）：
- 2.1 开头新增："想象一下，你的 30 行 Agent 遇到了这些问题：用户想在 Agent 执行到一半时插入新指令怎么办？Agent 完成任务后用户想追问怎么办？这就是 steering 和 follow-up 要解决的问题。"
- 双层循环的讲解从"先给 runLoop 代码"改为"先给问题场景 → 伪代码 → 再对照 Pi 源码"
- Steering/Follow-up 定义从 L257（表格）提前到 2.1 开头

**Ch03 工具系统**：
- 3.1 TypeBox 讲解：先说"为什么需要 Schema 验证？因为 LLM 可能返回 `{command: 42}` 而不是字符串"→ 再说"TypeBox vs Zod：TypeBox 生成标准 JSON Schema，LLM 需要这个格式"→ 最后展示代码
- 3.2 AJV 验证：先说"LLM 的输出不可信，可能类型错误、缺字段"→ 再展示 AJV 配置

**Ch04 流式与事件**：
- 4.1 EventStream：先说"生产者（LLM）和消费者（UI）速度不同，不处理会怎样？内存爆炸。"→ 再展示 EventStream
- 4.3 先用一个简单例子展示"为什么需要两套事件（AssistantMessageEvent 是 LLM 层细粒度，AgentEvent 是应用层生命周期）"

**Ch05 多模型统一**：
- 5.1 先说"用户在 Claude 上对话 3 轮后切到 GPT 继续，消息格式不兼容怎么办？"→ 再展示 transformMessages

---

#### B. Ch01→Ch02 新增"100 行桥梁"

**问题**：30 行 → 616 行跳跃太大。

**改动**：

在 Ch01 末尾新增 **1.5 节：从 30 行到 100 行**：

```
30 行版本（Ch01 已有）
  ↓ 加入多工具支持（calculator + file_reader）
  ↓ 加入事件系统（console.log → emit events）
  ↓ 加入错误处理（工具抛异常 → 错误变成 tool result）
= 100 行版本（新增）
  ↓ Ch02 在此基础上加 steering/follow-up/abort
= 生产级版本（Pi 的 runLoop）
```

**新增 Demo**：`demos/01-hello-agent/src/04-bridge-100.ts`
- 在 03-agent-loop.ts 基础上加入：
  - 两个工具（calculator + read_file）
  - 简单事件 emit（turn_start, tool_call, tool_result, turn_end）
  - try/catch 工具执行错误 → 错误变成 tool_result 反馈给 LLM
- 约 80-100 行
- 关键注释："这就是 Ch02 的起点。Pi 在这个基础上加了 steering、follow-up、abort。"

**Ch02 开头修改**：
- 原来直接展示 agentLoop 源码
- 改为先 CodeComparison：左边"100 行桥梁版"，右边"Pi 的 runLoop"，标注差异

---

#### C. 新增 Ch6.5"毕业项目：设计你自己的 Agent"

**问题**：Ch06 的 Demo 06 是另一个编码 Agent，读者没有被引导去构建不同领域的 Agent。

**新增内容**（在 Ch06 现有内容之后，Ch07 之前）：

**6.8 毕业项目：设计你自己的 Agent**

结构：

1. **选择你的领域**
   提供 3 个参考方向（读者选一个或自创）：

   | 方向 | 工具集 | System Prompt 重点 |
   |------|--------|-------------------|
   | 数据分析 Agent | read_csv, query_sql, plot_chart | "你是数据分析师，先理解数据结构，再写查询" |
   | DevOps Agent | ssh_exec, read_logs, check_status | "你是运维工程师，优先检查日志，谨慎执行命令" |
   | 内容创作 Agent | search_web, write_file, read_file | "你是内容创作者，先调研再写作，注意事实准确" |

2. **设计你的工具**
   - 从 Demo 06 的 `tools/` 目录复制一个工具作为模板
   - 修改 schema、execute 函数、返回格式
   - 在 `agent.ts` 的 TOOL_EXECUTORS 中注册

3. **设计你的 System Prompt**
   - 从 Demo 06 的 `prompt.ts` 出发
   - 修改角色定义、工具使用指南
   - 测试：同一个问题，不同 prompt 的效果对比

4. **验收标准**
   - [ ] Agent 能在 3 轮内完成一个典型任务
   - [ ] 至少有 2 个自定义工具（不是从 Demo 06 复制的）
   - [ ] System Prompt 包含工具使用指南
   - [ ] 能处理工具执行失败的情况
   - [ ] 能在 mock 模式下演示完整流程

5. **进阶挑战**（可选）
   - 加入 session 持久化
   - 加入 retry 机制
   - 支持切换模型

**新增 Demo**：`demos/09-graduation/`
- 一个空的脚手架项目，结构和 Demo 06 一致但工具和 prompt 是空的
- 包含 README 说明如何填充
- 包含一个 `tools/template.ts` 示例模板

---

#### D. Ch00 环境搭建重写

**问题**：setup 不完整，不覆盖 Windows，没有验证步骤。

**重写 Ch00 的"环境准备"小节**：

```markdown
## 环境准备 Checklist

### Step 1: 安装 Node.js 20+

**Mac/Linux:**
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 22
node --version  # 应显示 v22.x.x

**Windows:**
下载 https://nodejs.org/，安装 LTS 版本。
打开 PowerShell：node --version

### Step 2: 配置 API Key

**Mac/Linux (终端):**
export ANTHROPIC_API_KEY="sk-ant-..."
# 永久生效：加入 ~/.zshrc 或 ~/.bashrc

**Windows (PowerShell):**
$env:ANTHROPIC_API_KEY="sk-ant-..."
# 永久生效：[系统属性] → [环境变量] → 新建用户变量

**或使用 .env 文件（推荐，跨平台）:**
在项目根目录创建 .env 文件：
ANTHROPIC_API_KEY=sk-ant-...
# Demo 代码会自动读取

没有 API Key？没关系。所有 Demo 都支持 Mock 模式，可以先不配。

### Step 3: 克隆教程项目

git clone --recurse-submodules https://github.com/HelloiOS2014/pi_rsearch.git
cd pi_rsearch
npm install

### Step 4: 验证环境

npx tsx demos/01-hello-agent/src/01-raw-llm-call.ts
# 应显示 "Mock 模式" 或 LLM 回复（取决于是否配了 API Key）

npx astro dev
# 打开 http://localhost:4321/ 应看到教程首页
```

---

### 第 2 批：内容补全（高危问题）

#### E. 修复概念孤儿

| 概念 | 位置 | 改动 |
|------|------|------|
| Thinking blocks | Ch01 列出 13 种事件时 | 在 thinking_start 旁加注释："thinking 是 LLM 的思考过程，某些模型（如 Claude）支持显式输出思考链。详见第 5 章。" |
| Operations Pattern | Ch03 展示 bash 工具时 | 在讲 bash.execute() 时加："注意 Pi 的 bash 工具不直接调用 child_process，而是通过 BashOperations 接口。这种'可插拔操作'模式让同一个工具能在本地、SSH 远程、沙箱中执行。" |
| Skills | Ch06 提到 prompt 中的 skills 区 | 加注释："Skills 是可复用的能力模块（如 /commit、/review），格式和加载方式详见第 8 章。这里你可以先忽略它。" |

#### F. 每章末尾新增"动手练习"

每章末尾新增 2-3 个练习，不是"读源码"，而是"改代码"：

**Ch01 练习**：
1. 给 Demo 01-03 的 Agent 加一个新工具 `list_files`（列出目录内容）
2. 修改 Agent Loop 的退出条件：不是"没有工具调用就停"，而是"连续 3 轮没有工具调用才停"

**Ch02 练习**：
1. 修改 Demo 02-04 的 steering 模式：从 one-at-a-time 改为 all，观察行为差异
2. 给 Demo 02-05 的 abort 加一个超时：如果 10 秒内没有 LLM 响应就自动 abort

**Ch03 练习**：
1. 用 TypeBox 定义一个 `web_search` 工具的 schema（query: string, maxResults: number）
2. 给 Demo 03-04 的 beforeToolCall hook 加一个规则：如果工具名是 "delete_file"，block 并返回 "Dangerous operation blocked"

**Ch04 练习**：
1. 修改 Demo 04-02 的流式输出：不只是打字效果，加一个字符计数器（每输出 100 字符打印一次计数）
2. 实现一个简单的 EventStream consumer：只监听 tool_execution_start 和 tool_execution_end，计算工具执行时间

**Ch05 练习**：
1. 给 Demo 05-02 加一个新的 provider adapter（本地 Ollama）
2. 修改 Demo 05-03 的 transformMessages：在跨 provider 转换时，把所有中文内容翻译成英文注释

**Ch06 练习**：
1. 给 Demo 06 添加一个新工具 `http_get`（发 HTTP 请求获取网页内容）
2. 修改 Demo 06 的 prompt.ts：加入一条规则"每次执行 bash 命令前，先向用户确认"

---

#### G. 补全 WHY

在以下位置新增解释：

| 位置 | 新增内容 |
|------|----------|
| Ch01 架构鸟瞰 | "为什么三层？底层（pi-ai）隔离 LLM 差异，中层（agent-core）提供通用循环，上层（coding-agent）是具体应用。如果只有一层，换模型要改 Agent 逻辑；如果有五层，过度抽象增加理解成本。三层是实用和简洁的平衡。" |
| Ch01 ReAct | "为什么 ReAct？对比：Chain-of-Thought 只有推理没有行动；Plan-and-Execute 先规划再执行但不能中途调整；ReAct 交替推理和行动，能根据中间结果改变计划。" |
| Ch06 Compaction | "为什么 chars/4？这是英文文本的经验近似值（BPE tokenizer 平均 1 token ≈ 4 chars）。中文略高（约 1 token ≈ 1.5 chars），但 chars/4 作为保守估计足够用于判断'是否接近 context window'。精确计算需要加载 tokenizer（数 MB），对实时性要求高的 Agent 不值得。" |
| Ch06 Session 树 | "为什么树而不是线性？线性 session 无法支持'从某一轮回退重来'。Pi 用 id/parentId 构建对话树，支持 /fork（分支）和 /tree（浏览分支）。如果你的 Agent 不需要分支回退，线性 JSONL（Demo 06 的方式）就够了。" |

---

#### H. Demo 06 新增 README + 工具添加指南

创建 `demos/06-my-agent/README.md`：

```markdown
# My Agent — 教程 Capstone 项目

## 快速开始
export ANTHROPIC_API_KEY="sk-ant-..."  # 可选，有 mock 模式
npx tsx src/main.ts

## 如何添加新工具

### 1. 创建工具文件 (src/tools/my_tool.ts)
export function executeMyTool(input: { param: string }): string {
  return `Result: ${input.param}`;
}

### 2. 注册到 agent.ts
在 TOOL_DEFINITIONS 数组中添加工具 schema
在 TOOL_EXECUTORS 对象中添加执行函数

### 3. 更新 prompt.ts
在 TOOL_GUIDELINES 中添加工具使用指南

### 4. 测试
npx tsx src/main.ts "用 my_tool 处理 xxx"
```

---

#### I. 新增附录 G：Agent 调试指南

创建 `src/content/chapters/appendix/G-debugging.mdx`：

内容：
1. **Agent 无限循环** → 打印 messages.length 和最后 3 条消息、检查 maxTurns 限制
2. **Token 爆炸** → 检查 messages 总字符数、启用 compaction、限制工具输出长度
3. **工具调用错误** → 检查 schema 是否正确、AJV 验证是否通过、LLM 是否理解工具描述
4. **LLM 不调用工具** → 检查 system prompt 是否清晰描述了工具、尝试更强的模型
5. **跨 provider 消息格式错误** → 检查 transformMessages 是否处理了 thinking blocks 和 tool call IDs
6. **实用技巧** → 在 agent loop 中加 `console.log(JSON.stringify(messages.slice(-2), null, 2))` 打印最近两条消息

---

### 第 3 批：体验优化（中等问题）

#### J. 双事件体系解释

Ch04 开头新增小节"为什么两套事件？"：

"AssistantMessageEvent（13 种）是 LLM 层的细粒度事件 —— 每个 text delta、每个 tool call 参数片段都有事件。AgentEvent（12 种）是应用层的生命周期事件 —— 标记 turn 的开始/结束、工具执行的开始/结束。

类比：AssistantMessageEvent 像 TCP 包，AgentEvent 像 HTTP 请求/响应。你通常在 UI 层消费 AgentEvent，在调试/日志层消费 AssistantMessageEvent。"

---

#### K. AbortSignal 生命周期统一讲解

Ch02 的 2.3 边界行为中新增 AbortSignal 传播链图：

```
Agent.abort()
  └→ AbortController.abort()
       ├→ streamFn(signal) — LLM 流式调用检查 signal
       ├→ beforeToolCall(ctx, signal) — 钩子检查 signal
       ├→ tool.execute(id, args, signal) — 工具检查 signal
       └→ afterToolCall(ctx, signal) — 钩子检查 signal
```

---

#### L. Ch07/Ch08 增加实操比例

**Ch07**：在 7.5 节扩充 Demo 07 的讲解，逐行对比三种风格实现同一个任务。

**Ch08**：精简 8.2-8.4 的纯参考内容（TUI/Web UI/Interactive Mode），每个小节限制在 100 行以内。扩充 8.8 的 Demo 08 讲解。

---

#### M. Ch06 新增"成本与约束"小节

新增 **6.6 成本与约束**：

1. Token 计费公式：`cost = input_tokens * price/M + output_tokens * price/M`
2. 一次 Agent Run 的典型成本估算（3-10 轮对话 ≈ 10K-50K tokens ≈ $0.03-0.15）
3. 控制成本的手段：maxTokens、maxTurns、compaction 阈值
4. "省钱技巧"：用便宜模型做简单工具调用，贵模型做最终总结

---

#### N. Ch01 新增"Agent 的边界"小节

新增 **1.2 Agent 的边界**（在"什么是 Agent"之后）：

"不是所有任务都需要 Agent：

| 任务 | 用 Agent？ | 理由 |
|------|:---:|------|
| 翻译一段文字 | 否 | 单次 LLM 调用足够，不需要工具 |
| 写一首诗 | 否 | 纯文本生成，不需要循环 |
| 修复代码 bug | 是 | 需要读文件→定位问题→编辑文件→运行测试 |
| 分析 CSV 数据 | 是 | 需要读取数据→执行查询→生成图表 |
| 回答'今天天气怎样' | 可能 | 如果有搜索工具是 Agent，没有就是 ChatBot |

过度使用 Agent 的反面案例：用 Agent 做'1+1=?'——启动了 Agent Loop、加载了工具系统、执行了 0 次工具调用，最后 LLM 直接回答 2。白白浪费了 token 和延迟。"

---

## 新增文件清单

| 文件 | 类型 | 描述 |
|------|------|------|
| `demos/01-hello-agent/src/04-bridge-100.ts` | Demo | 100 行桥梁版本 |
| `demos/09-graduation/` | Demo 包 | 毕业项目脚手架（package.json + tsconfig + README + template） |
| `demos/06-my-agent/README.md` | 文档 | 使用说明 + 添加工具指南 |
| `src/content/chapters/appendix/G-debugging.mdx` | 附录 | Agent 调试指南 |

## 修改文件清单

| 文件 | 改动量 | 主要改动 |
|------|--------|----------|
| `src/content/chapters/00-overview.mdx` | 中 | 重写环境搭建 + setup checklist |
| `src/content/chapters/01-agent-panorama.mdx` | 大 | 新增 1.2 Agent 边界 + 1.5 百行桥梁 + 末尾练习 |
| `src/content/chapters/02-core-loop.mdx` | 大 | "先 WHY 后 WHAT"重组 + AbortSignal 图 + 末尾练习 |
| `src/content/chapters/03-tool-system.mdx` | 中 | TypeBox/AJV 先动机后代码 + Operations 命名 + 末尾练习 |
| `src/content/chapters/04-streaming.mdx` | 中 | 先问题后方案 + 双事件解释 + 末尾练习 |
| `src/content/chapters/05-multi-model.mdx` | 小 | 先场景后源码 + 末尾练习 |
| `src/content/chapters/06-build-agent.mdx` | 大 | 补 WHY + 新增 6.6 成本 + 6.8 毕业项目 |
| `src/content/chapters/07-comparison.mdx` | 小 | 扩充 Demo 07 讲解 |
| `src/content/chapters/08-advanced.mdx` | 中 | 精简参考 + 扩充 Demo 08 讲解 |
| `src/content/chapters/appendix/A-api-reference.mdx` | 无 | 不变 |
| `src/content/chapters/appendix/B-glossary.mdx` | 小 | 补充新术语 |
| `demos/01-hello-agent/package.json` | 小 | 新增 demo:04 script |

---

## Review 修正（基于 spec review 反馈）

### 修正 1：实施顺序（解决合并冲突风险）

按以下顺序实施，避免多人同时改同一文件：

```
Phase 1: A（WHY-WHAT-HOW 重组所有章节）— 基础，必须先完成
Phase 2: B + D + N（桥梁 demo + 环境搭建重写 + Agent 边界）— 改 Ch00/Ch01
Phase 3: E + G + J + K（概念孤儿 + WHY 补全 + 双事件 + AbortSignal）— 补丁式修改
Phase 4: F（所有章节练习）— 在 A 完成后统一添加
Phase 5: C + H + I + M（毕业项目 + Demo README + 调试指南 + 成本）— 新增内容
Phase 6: L（Ch07/Ch08 实操增强）— 收尾
```

### 修正 2：毕业项目脚手架简化

原方案"结构和 Demo 06 一致"导致初级工程师被 auth-manager / config-resolver / retry 等生产级文件分心。

**修正**：脚手架只保留 4 个核心文件：

```
demos/09-graduation/
├── package.json
├── tsconfig.json
├── README.md           # 详细指南：选方向→设计工具→写 prompt→验证
├── src/
│   ├── agent.ts        # 精简版 agent loop（~60 行，从 Demo 01-04 提炼）
│   ├── prompt.ts       # 空的 prompt builder（有模板和注释）
│   ├── tools/
│   │   └── template.ts # 工具模板（schema + execute 函数）
│   └── main.ts         # 简易 CLI 入口（readline 交互）
└── fixtures/           # 每个方向的测试数据
    ├── data-analysis/
    │   └── sales.csv   # 100 行销售数据
    ├── devops/
    │   └── mock-logs.txt  # 模拟服务器日志
    └── content/
        └── topic.txt   # 写作主题和参考资料
```

生产级组件（session / retry / config）移到 `README.md` 的"进阶挑战"部分。

### 修正 3：练习增加预期行为描述

每个练习格式改为：

```markdown
**练习 1**：给 Agent 加一个 `list_files` 工具
- 修改文件：`demos/01-hello-agent/src/03-agent-loop.ts`
- 做什么：定义 list_files 工具 schema + 实现 executeTool 分支
- 预期行为：Agent 收到"列出当前目录的文件"时，调用 list_files → 返回文件列表 → 用结果回答用户
- 是否需要 API Key：否（mock 模式可验证 schema 和执行逻辑）
```

### 修正 4：Ch05 练习校准

替换两个过难/过偏的练习：

- 原 Ch05 #1（加 Ollama adapter）→ **新**："修改 Demo 05-02 的统一接口，让它在调用失败时自动切换到备用 provider（如 Claude 失败 → 切 GPT）"
- 原 Ch05 #2（翻译中文内容）→ **新**："给 Demo 05-05 的 cost tracker 加一个预算限制：当累计费用超过 $0.10 时停止 Agent 并提示"

### 修正 5：附录 C 和 G 关系

附录 G（调试指南）开头加说明："本附录聚焦 Agent 开发过程中的调试。运行环境问题（API Key、模型切换、网络）请参考附录 C。"

附录 C 开头加交叉引用："Agent 行为异常（无限循环、不调工具）请参考附录 G。"

### 修正 6：Demo 06 README 补 mock 模式

README 新增：

```markdown
## Mock 模式（无 API Key）
不设 ANTHROPIC_API_KEY 直接运行：
npx tsx src/main.ts
Agent 会使用预设响应演示完整的工具调用流程。
```

### 修正 7：Ch00 路线图更新

Ch00 的学习路线图更新为：

```
第一阶段：基础
- Ch1.1-1.4: Agent 核心概念 + 30 行 demo
- Ch1.5: 100 行桥梁（新增）← 这是进入 Ch2 的前置

第二阶段：深入
- Ch2-4: 核心循环 + 工具系统 + 流式处理

第三阶段：集成
- Ch5: 多模型统一
- Ch6.1-6.5: 构建完整 Agent
- Ch6.6: 成本与约束（新增）

第四阶段：毕业
- Ch6.8: 毕业项目 — 构建你自己的 Agent（新增）
- Ch7: 框架对比
- Ch8: 进阶扩展
```

### 修正 8：毕业项目加一个完整的小示例

在 Ch6.8 的三个参考方向之前，先给一个 **50 行完整示例** —— "天气查询 Agent"：

```typescript
// 一个最小的非编码 Agent：天气查询
const tools = [{
  name: "get_weather",
  description: "查询城市天气",
  input_schema: {
    type: "object",
    properties: { city: { type: "string" } },
    required: ["city"]
  }
}];

function executeTool(name: string, input: any): string {
  if (name === "get_weather") {
    // 模拟天气 API
    return `${input.city}: 晴，25°C，湿度 60%`;
  }
  return "Unknown tool";
}

// Agent Loop（和 Ch01 的 30 行版本一模一样）
// ...
```

关键标注："看到了吗？Agent Loop 完全不变，你只需要换工具和 prompt。这就是通用框架的力量。"

---

## 验证

1. `npx astro build` — 17 pages（新增 appendix G）
2. 所有 demo typecheck 通过（包括 04-bridge-100 和 09-graduation）
3. 从 Ch00 开始按顺序阅读，每个概念在使用前已被解释
4. 每章末尾有 2-3 个"改代码"练习（每个有预期行为描述）
5. Ch06 毕业项目有 50 行完整示例 + 3 个方向 + 脚手架 + 测试数据
6. 附录 G 覆盖 6 种调试场景，与附录 C 交叉引用
7. Ch00 路线图反映所有新增小节
8. 练习标注是否需要 API Key
