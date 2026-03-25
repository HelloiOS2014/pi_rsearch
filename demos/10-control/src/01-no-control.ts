/**
 * Demo 01: 没有控制回路的 Agent（崩溃演示）
 * 展示一个没有任何保护机制的 raw agent loop：
 * - 没有错误处理 — API 错误直接崩溃
 * - 没有 turn 限制 — 可能无限循环
 * - 没有事件系统 — 无法观测内部状态
 *
 * 运行: npx tsx src/01-no-control.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, isMockMode, printSection, printEvent } from "@pi-tutorial/shared";

printSection("Demo 01: 没有控制回路的 Agent（崩溃演示）");

// ============================
// 工具定义
// ============================
const tools: Anthropic.Tool[] = [
  {
    name: "calculator",
    description: "计算数学表达式",
    input_schema: {
      type: "object" as const,
      properties: {
        expression: { type: "string", description: "数学表达式" },
      },
      required: ["expression"],
    },
  },
];

// 工具执行器
function executeTool(name: string, input: Record<string, unknown>): string {
  if (name === "calculator") {
    const expr = input.expression as string;
    try {
      return String(Function(`"use strict"; return (${expr})`)());
    } catch {
      return `Error: cannot evaluate "${expr}"`;
    }
  }
  return `Error: unknown tool "${name}"`;
}

// ============================
// Mock 模式：模拟 2 轮正常 + 第 3 轮崩溃
// ============================
if (isMockMode()) {
  console.log("Mock 模式 — 模拟没有控制回路的 Agent\n");

  try {
    // Turn 1: 正常调用工具
    printEvent("turn_1", "调用 LLM...");
    console.log("Assistant: 让我先计算 15 * 7。");
    printEvent("tool_use", 'calculator({ expression: "15 * 7" })');
    printEvent("tool_result", "105");

    // Turn 2: 正常调用工具
    printEvent("turn_2", "调用 LLM...");
    console.log("Assistant: 现在计算 23 * 4。");
    printEvent("tool_use", 'calculator({ expression: "23 * 4" })');
    printEvent("tool_result", "92");

    // Turn 3: API 错误！没有错误处理，直接崩溃
    printEvent("turn_3", "调用 LLM...");
    throw new Error("429 Too Many Requests - Rate limit exceeded");
  } catch (err) {
    console.error(`\n\u{1F4A5} Agent 崩溃了: ${(err as Error).message}`);
    console.log("\n--- 教训 ---");
    console.log("没有控制回路的 Agent 就像没有安全带的汽车：");
    console.log("  - 没有重试机制 \u2192 一次 API 错误就崩溃");
    console.log("  - 没有 turn 限制 \u2192 可能无限循环烧钱");
    console.log("  - 没有事件系统 \u2192 崩溃了都不知道为什么");
    console.log("\n\u{1F449} 运行 02-harness.ts 看控制回路如何解决这些问题。");
    process.exit(1);
  }
}

// ============================
// 真实模式：raw agent loop（没有任何保护）
// ============================
const client = new Anthropic({ apiKey: getApiKey("anthropic") });

async function runAgent(prompt: string): Promise<void> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: prompt },
  ];

  // 没有 turn 限制 — while(true) 可能无限循环
  while (true) {
    // 没有错误处理 — API 错误直接崩溃
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 1024,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      const text = response.content.find((b) => b.type === "text");
      if (text && text.type === "text") {
        console.log("\nAssistant:", text.text);
      }
      break;
    }

    // 执行工具调用
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        printEvent("tool_use", `${block.name}(${JSON.stringify(block.input)})`);
        const result = executeTool(block.name, block.input as Record<string, unknown>);
        printEvent("tool_result", result);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
    // 没有事件系统 — 无法观测内部状态
  }
}

try {
  await runAgent("计算 15 * 7，然后计算 23 * 4，最后把两个结果相加");
} catch (err) {
  console.error(`\n\u{1F4A5} Agent 崩溃了: ${(err as Error).message}`);
  process.exit(1);
}
