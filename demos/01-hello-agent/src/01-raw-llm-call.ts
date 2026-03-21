/**
 * Demo 01: 裸调 LLM
 * 最简单的 LLM 调用 — 输入一句话，得到一段回复。
 *
 * 运行: npx tsx src/01-raw-llm-call.ts
 * 需要: ANTHROPIC_API_KEY 环境变量
 */
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, isMockMode, printSection } from "@pi-tutorial/shared";

printSection("Demo 01: 裸调 LLM");

if (isMockMode()) {
  console.log("Mock 模式 — 跳过 API 调用");
  console.log("Assistant: Agent 是一种能自主使用工具完成任务的 AI 系统...");
  process.exit(0);
}

const client = new Anthropic({ apiKey: getApiKey("anthropic") });

const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250514",
  max_tokens: 512,
  messages: [
    { role: "user", content: "用一句话解释什么是 AI Agent。" }
  ],
});

console.log("Assistant:", response.content[0].type === "text" ? response.content[0].text : "");
console.log("\nStop reason:", response.stop_reason);
console.log("Tokens:", response.usage.input_tokens, "in /", response.usage.output_tokens, "out");
