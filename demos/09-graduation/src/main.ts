/**
 * 毕业项目入口 — 简单的 readline REPL
 *
 * 支持 Mock 模式（无 API Key 自动切换）
 */
import { createInterface } from "node:readline";
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, isMockMode, printSection } from "@pi-tutorial/shared";
import { runAgent } from "./agent.js";

printSection("毕业项目 Agent");

const mock = isMockMode();
console.log(`模式: ${mock ? "Mock（未设置 ANTHROPIC_API_KEY）" : "Live"}`);
console.log(`输入你的问题，输入 /exit 退出。\n`);

// ── Mock 模式响应 ─────────────────────────────────────────────
const MOCK_RESPONSES = [
  "Mock 模式：我会调用你定义的工具来完成这个任务。\n" +
    "设置 ANTHROPIC_API_KEY 环境变量以使用真实 API。",
  "Mock 模式：在真实模式下，我会：\n" +
    "1. 分析你的请求\n" +
    "2. 选择合适的工具\n" +
    "3. 执行工具并返回结果",
];

// ── REPL ─────────────────────────────────────────────────────
const client = mock ? null : new Anthropic({ apiKey: getApiKey("anthropic") });

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

let mockIdx = 0;

const promptUser = () => {
  rl.question("> ", async (input) => {
    const trimmed = input.trim();
    if (!trimmed) { promptUser(); return; }
    if (trimmed === "/exit" || trimmed === "/quit") {
      console.log("再见！");
      process.exit(0);
    }

    if (mock) {
      console.log(`\n${MOCK_RESPONSES[mockIdx % MOCK_RESPONSES.length]}\n`);
      mockIdx++;
      promptUser();
      return;
    }

    try {
      const result = await runAgent(client!, trimmed);
      console.log(`\nAssistant: ${result}\n`);
    } catch (err) {
      console.error(`\n[Error] ${err instanceof Error ? err.message : String(err)}\n`);
    }

    promptUser();
  });
};

promptUser();
