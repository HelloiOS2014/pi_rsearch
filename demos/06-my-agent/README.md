# Demo 06: My Agent — 完整 Coding Agent

整个教程的 capstone 项目。整合前 5 章所有概念，构建一个完整可用的 coding agent。

## 快速开始

### 使用 API Key

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm start
```

### Mock 模式（无需 API Key）

```bash
npm start
```

如果没有设置 `ANTHROPIC_API_KEY`，Agent 会自动进入 mock 模式，模拟 Agent 的响应流程。你可以用 mock 模式了解 Agent 的交互方式和命令系统。

## 可用工具

Agent 内置 4 个工具：

| 工具 | 说明 | 示例请求 |
|------|------|---------|
| `read_file` | 读取文件内容（支持 offset/limit） | "读取 package.json" |
| `write_file` | 写入/创建文件 | "创建一个 hello.ts 文件" |
| `bash` | 执行 Shell 命令 | "运行 ls -la" |
| `search` | 搜索代码模式 | "搜索所有包含 TODO 的文件" |

## CLI 命令

在 REPL 中输入以下命令：

| 命令 | 说明 |
|------|------|
| `/exit` 或 `/quit` | 退出 Agent |
| `/clear` | 清空对话历史 |
| `/session` | 显示会话信息（消息数、文件路径） |
| `/help` | 显示帮助信息 |

## 命令行参数

```bash
# 指定模型
npm start -- --model claude-sonnet-4-5-20250514

# 单次执行（非交互模式）
npx tsx src/main.ts "list files in current directory"

# 恢复上次会话
npm start -- --continue

# 不持久化会话
npm start -- --no-session
```

## 如何添加新工具

### 第 1 步：定义 Schema 和 Executor

在 `src/tools/` 下创建新文件，如 `http-get.ts`：

```typescript
import Anthropic from "@anthropic-ai/sdk";

export const httpGetToolSchema: Anthropic.Tool = {
  name: "http_get",
  description: "发送 HTTP GET 请求并返回响应内容",
  input_schema: {
    type: "object",
    properties: {
      url: { type: "string", description: "目标 URL" },
    },
    required: ["url"],
  },
};

export async function executeHttpGet(input: { url: string }): Promise<string> {
  const response = await fetch(input.url);
  const text = await response.text();
  return text.length > 10000 ? text.slice(0, 10000) + "\n...(truncated)" : text;
}
```

### 第 2 步：注册到 agent.ts

```typescript
// 在 agent.ts 中添加 import
import { httpGetToolSchema, executeHttpGet } from "./tools/http-get.js";

// 添加到 ALL_TOOLS 数组
const ALL_TOOLS = [readToolSchema, writeToolSchema, bashToolSchema, searchToolSchema, httpGetToolSchema];

// 添加到 TOOL_EXECUTORS
const TOOL_EXECUTORS: Record<string, (input: Record<string, unknown>) => Promise<string>> = {
  // ...existing tools
  http_get: (input) => executeHttpGet(input as any),
};
```

### 第 3 步：在 prompt.ts 添加使用指南

```typescript
const TOOL_GUIDELINES: Record<string, string> = {
  // ...existing guidelines
  http_get:
    "- Use http_get to fetch web page content.\n" +
    "- Only use for public URLs, never for internal/private endpoints.",
};
```

## 如何修改 System Prompt

编辑 `src/prompt.ts` 中的 `buildSystemPrompt` 函数：

- **修改角色定义**：编辑开头的 `You are a helpful coding assistant...` 部分
- **添加全局规则**：在 `Guidelines:` 区块下添加新的行为约束
- **添加工具专属规则**：在 `TOOL_GUIDELINES` 对象中按工具名添加

例如，添加安全规则：

```typescript
let prompt = `You are a careful coding assistant...

Guidelines:
- Before running any bash command, read relevant files first to understand context.
- Never execute destructive commands (rm -rf, git reset --hard) without confirmation.
`;
```

## 架构概览

```
src/
├── main.ts           ← 入口 + Interactive REPL
├── agent.ts          ← Agent 核心循环 + 事件系统
├── prompt.ts         ← 动态 System Prompt 构建
├── session.ts        ← JSONL 会话持久化
├── retry.ts          ← 指数退避重试
├── config-resolver.ts ← 三级配置解析
├── auth-manager.ts   ← API Key 管理
└── tools/
    ├── read.ts       ← 文件读取
    ├── write.ts      ← 文件写入
    ├── bash.ts       ← Shell 执行
    └── search.ts     ← 代码搜索
```
