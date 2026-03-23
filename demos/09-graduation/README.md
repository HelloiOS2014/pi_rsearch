# Demo 09: 毕业项目 — 设计你自己的 Agent

恭喜完成 6 章的学习！现在是时候构建一个属于你自己的 Agent 了。

## 核心洞察

Agent 的本质就是 **LLM + 工具 + 循环**。你不需要从零开始 — `src/agent.ts` 已经提供了一个可用的 Agent Loop，你只需要：

1. 设计你的工具
2. 写你的 System Prompt
3. 注册到 agent 中

## 选择你的方向

| 方向 | 推荐工具 | System Prompt 重点 | 测试数据 |
|------|---------|-------------------|---------|
| 数据分析 Agent | read_csv, query, summarize | "你是数据分析师，先理解数据结构再分析" | `fixtures/data-analysis/sales.csv` |
| DevOps Agent | read_logs, check_status, exec_cmd | "你是运维工程师，优先检查日志，谨慎执行命令" | `fixtures/devops/mock-logs.txt` |
| 内容创作 Agent | read_file, write_file, search_web | "你是内容创作者，先调研再写作" | `fixtures/content/topic.txt` |
| 自由发挥 | 你自己决定 | 你自己设计 | 你自己准备 |

## Step 1: 设计你的工具

从 `src/tools/template.ts` 复制，创建你的工具文件：

```bash
cp src/tools/template.ts src/tools/my-tool.ts
```

每个工具需要两样东西：
- **Schema**：告诉 LLM 这个工具叫什么、接受什么参数
- **Execute 函数**：实际执行逻辑

参考 `src/tools/template.ts` 中的注释，填入你的工具逻辑。

## Step 2: 写你的 System Prompt

编辑 `src/prompt.ts`：

```typescript
// 修改角色定义
const ROLE = "你是一个数据分析助手...";

// 添加工具使用指南
const TOOL_GUIDELINES = {
  read_csv: "- 先读取 CSV 的前几行了解结构，再进行分析",
  // ...
};
```

好的 System Prompt 应该包含：
- 明确的角色定义（你是谁）
- 工具使用指南（什么时候用什么工具）
- 行为约束（不要做什么）

## Step 3: 注册到 agent.ts

在 `src/agent.ts` 中：

```typescript
import { myToolSchema, executeMyTool } from "./tools/my-tool.js";

// 添加到工具列表
const ALL_TOOLS = [myToolSchema, /* 其他工具... */];

// 添加到执行器映射
const TOOL_EXECUTORS: Record<string, (input: any) => Promise<string>> = {
  my_tool: (input) => executeMyTool(input),
  // ...
};
```

## Step 4: 测试

### Mock 模式（无需 API Key）

```bash
npm start
# 输入任务，观察 Agent 是否尝试调用你的工具
```

### 真实 API

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm start
# 输入一个需要你的工具的任务
```

## 验收标准

- [ ] Agent 能在 3 轮内完成一个典型任务
- [ ] 至少有 2 个自定义工具
- [ ] System Prompt 包含工具使用指南
- [ ] 能处理工具执行失败（返回错误信息而不是崩溃）
- [ ] 能在 mock 模式下演示完整流程

## 进阶挑战

完成基础版本后，可以尝试：

- **Session 持久化**：把对话保存到文件，下次可以 `--continue` 恢复
- **Retry 机制**：API 调用失败时自动重试（参考 Demo 06 的 `retry.ts`）
- **多模型支持**：通过命令行参数切换不同的 LLM（参考 Chapter 5）
- **Compaction**：对话太长时自动压缩历史（参考 Chapter 6.3）
- **流式输出**：把 `create()` 改成 `stream()`，实时显示 LLM 输出（参考 Chapter 4）

## 项目结构

```
demos/09-graduation/
├── src/
│   ├── main.ts           ← REPL 入口（已实现）
│   ├── agent.ts          ← Agent 循环（已实现，可扩展）
│   ├── prompt.ts         ← System Prompt（需要你修改）
│   └── tools/
│       └── template.ts   ← 工具模板（复制并修改）
├── fixtures/
│   ├── data-analysis/
│   │   └── sales.csv     ← 销售数据样本
│   ├── devops/
│   │   └── mock-logs.txt ← 模拟服务器日志
│   └── content/
│       └── topic.txt     ← 写作主题
├── package.json
├── tsconfig.json
└── README.md             ← 你正在看的文件
```
