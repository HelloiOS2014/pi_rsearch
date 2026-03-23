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
  `[Mock 模式] 模拟 Agent 执行流程:
  1. LLM 决定调用工具 read_csv({path: "fixtures/data-analysis/sales.csv"})
  2. 工具返回: 文件: sales.csv, 总行数: 20
  3. LLM 根据结果回答: "这个CSV包含20条销售记录..."

提示: 配置 ANTHROPIC_API_KEY 后可使用真实 LLM。
提示: 直接测试工具逻辑: npx tsx -e "import {executeReadCsv} from './src/tools/read_csv.js'; executeReadCsv({path:'fixtures/data-analysis/sales.csv'}).then(console.log)"`,
  `[Mock 模式] 模拟 Agent 执行流程:
  1. LLM 决定调用工具 list_files({directory: "."})
  2. 工具返回: ["src/", "fixtures/", "package.json", "tsconfig.json"]
  3. LLM 根据结果回答: "当前目录包含 4 个条目..."

提示: 配置 ANTHROPIC_API_KEY 后可使用真实 LLM。
提示: 直接测试工具逻辑: npx tsx -e "import {executeListFiles} from './src/tools/list_files.js'; executeListFiles({directory:'.'}).then(console.log)"`,
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
