/**
 * Demo 03: 完整 Agent Loop（30 行核心）
 * Agent 的本质 — 一个 while 循环。
 *
 * 运行: npx tsx src/03-agent-loop.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, isMockMode, printSection, printEvent } from "@pi-tutorial/shared";

printSection("Demo 03: 完整 Agent Loop");

if (isMockMode()) {
  console.log("Mock 模式 — 模拟 Agent Loop");
  printEvent("turn_1", "LLM 决定调用 calculator");
  printEvent("tool_use", "calculator({ expression: '15 * 23 + 7' })");
  printEvent("tool_result", "352");
  printEvent("turn_2", "LLM 用工具结果生成最终回复");
  console.log("\nAssistant: 15 × 23 + 7 = 352");
  process.exit(0);
}

const client = new Anthropic({ apiKey: getApiKey("anthropic") });

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

// 执行工具的简单实现
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

// ========================================
// 这就是 Agent 的核心 — 一个 while 循环
// ========================================
const messages: Anthropic.MessageParam[] = [
  { role: "user", content: "计算 (15 * 23 + 7) 的结果，然后再算这个结果的平方根" }
];

let turn = 0;
while (true) {
  turn++;
  printEvent(`turn_${turn}`, "调用 LLM...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 1024,
    tools,
    messages,
  });

  // 追加 assistant 回复到上下文
  messages.push({ role: "assistant", content: response.content });

  // 没有工具调用 → Agent 完成
  if (response.stop_reason !== "tool_use") {
    const text = response.content.find(b => b.type === "text");
    if (text && text.type === "text") {
      console.log("\nAssistant:", text.text);
    }
    break;
  }

  // 执行每个工具调用，收集结果
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

  // 追加工具结果到上下文，继续循环
  messages.push({ role: "user", content: toolResults });
}

console.log(`\n共 ${turn} 轮对话。这就是 Agent 的本质 — 一个 while 循环。`);
