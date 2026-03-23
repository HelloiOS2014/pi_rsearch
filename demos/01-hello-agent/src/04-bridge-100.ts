/**
 * Demo 04: 100 行 Agent（从 30 行到完整桥梁）
 *
 * 在 Demo 03 的 30 行 Agent Loop 基础上，增加：
 * - 多工具支持（calculator + read_file）
 * - 事件发射（turn_start, tool_call, tool_result, turn_end）
 * - try/catch 错误处理（工具执行失败不崩溃）
 * - Mock 模式
 *
 * 运行: npx tsx src/04-bridge-100.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { getApiKey, isMockMode, printSection, printEvent } from "@pi-tutorial/shared";

printSection("Demo 04: 100 行 Bridge Agent");

// ── Mock 模式 ────────────────────────────────────────────────
if (isMockMode()) {
  console.log("Mock 模式 — 模拟多工具 Agent Loop\n");
  printEvent("turn_start", "Turn 1");
  printEvent("tool_call", "calculator({ expression: '42 * 58' })");
  printEvent("tool_result", "2436");
  printEvent("tool_call", "read_file({ path: 'package.json' })");
  printEvent("tool_result", '{ "name": "@pi-tutorial/demo-01-hello-agent", ... }');
  printEvent("turn_end", "LLM 收到工具结果，继续推理");
  printEvent("turn_start", "Turn 2");
  printEvent("turn_end", "LLM 生成最终回复");
  console.log("\nAssistant: 42 × 58 = 2436，项目名称是 @pi-tutorial/demo-01-hello-agent。");
  process.exit(0);
}

// ── 工具定义 ─────────────────────────────────────────────────
const tools: Anthropic.Tool[] = [
  {
    name: "calculator",
    description: "计算数学表达式，返回结果",
    input_schema: {
      type: "object" as const,
      properties: {
        expression: { type: "string", description: "数学表达式，如 '2 + 3 * 4'" },
      },
      required: ["expression"],
    },
  },
  {
    name: "read_file",
    description: "读取文件内容",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "文件路径" },
      },
      required: ["path"],
    },
  },
];

// ── 工具执行（带 try/catch）────────────────────────────────────
function executeTool(name: string, input: Record<string, unknown>): string {
  try {
    if (name === "calculator") {
      const expr = input.expression as string;
      return String(Function(`"use strict"; return (${expr})`)());
    }
    if (name === "read_file") {
      const path = input.path as string;
      const content = readFileSync(path, "utf-8");
      return content.length > 5000 ? content.slice(0, 5000) + "\n...(truncated)" : content;
    }
    return `Error: unknown tool "${name}"`;
  } catch (err) {
    // 错误变成工具结果文本，不会让 Agent 崩溃
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ── Agent Loop（和 Demo 03 结构相同，多了事件和错误处理）──────────
const client = new Anthropic({ apiKey: getApiKey("anthropic") });
const messages: Anthropic.MessageParam[] = [
  { role: "user", content: "计算 42 * 58，然后读取 package.json 告诉我项目名称" },
];

let turn = 0;
const MAX_TURNS = 10;

while (turn < MAX_TURNS) {
  turn++;
  printEvent("turn_start", `Turn ${turn}`);

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 1024,
    tools,
    messages,
  });

  messages.push({ role: "assistant", content: response.content });

  if (response.stop_reason !== "tool_use") {
    printEvent("turn_end", "最终回复");
    const text = response.content.find((b) => b.type === "text");
    if (text && text.type === "text") console.log("\nAssistant:", text.text);
    break;
  }

  // 执行所有工具调用，收集结果
  const toolResults: Anthropic.ToolResultBlockParam[] = [];
  for (const block of response.content) {
    if (block.type === "tool_use") {
      printEvent("tool_call", `${block.name}(${JSON.stringify(block.input)})`);
      const result = executeTool(block.name, block.input as Record<string, unknown>);
      printEvent("tool_result", result.slice(0, 200));
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
    }
  }

  messages.push({ role: "user", content: toolResults });
  printEvent("turn_end", `${toolResults.length} 个工具结果已返回`);
}

console.log(`\n共 ${turn} 轮。`);
// 这个 100 行版本就是 Chapter 2 的起点。Pi 在此基础上加了 steering、follow-up、abort。
