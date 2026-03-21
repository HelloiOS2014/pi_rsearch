/**
 * Demo 02: 加入工具调用
 * 定义一个 calculator 工具，LLM 自己决定何时调用。
 *
 * 运行: npx tsx src/02-add-tool-call.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, isMockMode, printSection, printEvent } from "@pi-tutorial/shared";

printSection("Demo 02: 加入工具调用");

if (isMockMode()) {
  console.log("Mock 模式 — 模拟工具调用");
  printEvent("tool_use", "calculator({ expression: '237 * 891 + 42' })");
  printEvent("tool_result", "211209");
  console.log("\nAssistant: 237 × 891 + 42 = 211,209");
  process.exit(0);
}

const client = new Anthropic({ apiKey: getApiKey("anthropic") });

// 定义工具 — 告诉 LLM 它可以使用的能力
const tools: Anthropic.Tool[] = [
  {
    name: "calculator",
    description: "计算数学表达式，返回数值结果",
    input_schema: {
      type: "object" as const,
      properties: {
        expression: { type: "string", description: "要计算的数学表达式，如 '2 + 3 * 4'" },
      },
      required: ["expression"],
    },
  },
];

const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250514",
  max_tokens: 1024,
  tools,
  messages: [
    { role: "user", content: "计算 237 * 891 + 42" }
  ],
});

console.log("Stop reason:", response.stop_reason);
// stop_reason === "tool_use" 说明 LLM 决定调用工具

for (const block of response.content) {
  if (block.type === "text") {
    console.log("Text:", block.text);
  } else if (block.type === "tool_use") {
    printEvent("tool_use", `${block.name}(${JSON.stringify(block.input)})`);

    // 执行工具
    const input = block.input as { expression: string };
    const result = Function(`"use strict"; return (${input.expression})`)();
    printEvent("tool_result", String(result));
  }
}

console.log("\n关键发现: LLM 返回了 stop_reason='tool_use'，它自己决定要调用计算器！");
