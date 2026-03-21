/**
 * Demo 02-01: Single Turn — 单次 LLM 调用 + 单次工具执行
 *
 * 这不是一个循环 — 而是循环的基本构件。
 * 1. 调用 LLM，带上工具定义
 * 2. 如果 LLM 返回 tool_use，执行工具
 * 3. 把工具结果发回 LLM，拿到最终回复
 *
 * 运行: npx tsx src/01-single-turn.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, isMockMode, printSection, printEvent } from "@pi-tutorial/shared";

// ── Tool Definition ─────────────────────────────────────────────
// A simple calculator tool that adds two numbers
const calculatorTool: Anthropic.Tool = {
  name: "add",
  description: "Add two numbers together and return the sum.",
  input_schema: {
    type: "object" as const,
    properties: {
      a: { type: "number", description: "First number" },
      b: { type: "number", description: "Second number" },
    },
    required: ["a", "b"],
  },
};

// ── Tool Implementation ─────────────────────────────────────────
function executeTool(name: string, input: Record<string, unknown>): string {
  if (name === "add") {
    const a = input.a as number;
    const b = input.b as number;
    return String(a + b);
  }
  return `Unknown tool: ${name}`;
}

// ── Main ────────────────────────────────────────────────────────
printSection("Demo 02-01: Single Turn (单次调用 + 单次工具)");

if (isMockMode()) {
  console.log("[Mock 模式 — 跳过 API 调用]\n");

  printEvent("Step 1", "发送请求给 LLM，附带 add 工具定义");
  console.log('  User: "42 + 58 等于多少？"\n');

  printEvent("Step 2", "LLM 返回 tool_use");
  console.log("  LLM 想调用: add({ a: 42, b: 58 })");
  console.log("  stop_reason: tool_use\n");

  printEvent("Step 3", "执行工具");
  console.log("  add(42, 58) = 100\n");

  printEvent("Step 4", "把工具结果发回 LLM");
  console.log("  tool_result: 100\n");

  printEvent("Step 5", "LLM 返回最终回复");
  console.log("  Assistant: 42 + 58 = 100。");
  console.log("  stop_reason: end_turn\n");

  printSection("Key Learning");
  console.log("  单次调用是 Agent 循环的基本构件：");
  console.log("  请求 → tool_use → 执行 → tool_result → 最终回复");
  console.log("  下一步：把这个流程放进 while 循环，就是 Agent！");
  process.exit(0);
}

const client = new Anthropic({ apiKey: getApiKey("anthropic") });
const messages: Anthropic.MessageParam[] = [
  { role: "user", content: "42 + 58 等于多少？" },
];

// Step 1: 第一次 LLM 调用
printEvent("Step 1", "发送请求给 LLM，附带 add 工具定义");
console.log('  User: "42 + 58 等于多少？"\n');

const response1 = await client.messages.create({
  model: "claude-sonnet-4-5-20250514",
  max_tokens: 1024,
  tools: [calculatorTool],
  messages,
});

printEvent("Step 2", `LLM 返回 stop_reason=${response1.stop_reason}`);

// Step 2: 检查是否有 tool_use
const toolUseBlock = response1.content.find(
  (block): block is Anthropic.ContentBlockParam & { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
    block.type === "tool_use"
);

if (!toolUseBlock) {
  console.log("  LLM 没有调用工具，直接给出了回复。");
  const textBlock = response1.content.find((b) => b.type === "text") as Anthropic.TextBlock | undefined;
  console.log("  Assistant:", textBlock?.text ?? "(empty)");
  process.exit(0);
}

console.log(`  LLM 想调用: ${toolUseBlock.name}(${JSON.stringify(toolUseBlock.input)})`);
console.log("");

// Step 3: 执行工具
printEvent("Step 3", "执行工具");
const toolResult = executeTool(toolUseBlock.name, toolUseBlock.input);
console.log(`  ${toolUseBlock.name}(${(toolUseBlock.input as Record<string, number>).a}, ${(toolUseBlock.input as Record<string, number>).b}) = ${toolResult}\n`);

// Step 4: 把工具结果发回 LLM
printEvent("Step 4", "把工具结果发回 LLM");
messages.push({ role: "assistant", content: response1.content });
messages.push({
  role: "user",
  content: [
    {
      type: "tool_result",
      tool_use_id: toolUseBlock.id,
      content: toolResult,
    },
  ],
});

const response2 = await client.messages.create({
  model: "claude-sonnet-4-5-20250514",
  max_tokens: 1024,
  tools: [calculatorTool],
  messages,
});

// Step 5: 最终回复
printEvent("Step 5", `LLM 返回最终回复 (stop_reason=${response2.stop_reason})`);
const finalText = response2.content.find((b) => b.type === "text") as Anthropic.TextBlock | undefined;
console.log(`  Assistant: ${finalText?.text ?? "(empty)"}\n`);

printSection("Key Learning");
console.log("  单次调用是 Agent 循环的基本构件：");
console.log("  请求 -> tool_use -> 执行 -> tool_result -> 最终回复");
console.log("  下一步：把这个流程放进 while 循环，就是 Agent！");
