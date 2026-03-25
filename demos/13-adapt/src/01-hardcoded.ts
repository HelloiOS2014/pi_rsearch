import { printSection, printEvent } from "@pi-tutorial/shared";

printSection("Demo 13-01: 硬编码的 Agent");

// === 1. Hardcoded system prompt ===
const SYSTEM_PROMPT = `You are a coding assistant.
Always use 2-space indentation.
Prefer functional programming style.
Use TypeScript strict mode.
Run tests with: npm test
Build with: npm run build`;

console.log("📋 System Prompt（硬编码）:");
console.log(`   ${SYSTEM_PROMPT.split("\n").length} 行指令`);

// === 2. Hardcoded tools ===
const TOOLS = ["read", "write", "edit", "bash"];
console.log(`\n🔧 工具集（硬编码）: [${TOOLS.join(", ")}]`);

// === 3. Problem: new project needs different config ===
console.log("\n--- 换到新项目 ---\n");

console.log("❌ 新项目用 4-space 缩进 → 硬编码的 '2-space' 生成错误代码");
console.log("❌ 新项目用 OOP 风格 → 硬编码的 'functional' 风格不适用");
console.log("❌ 新项目用 pnpm → 硬编码的 'npm test' 命令失败");
console.log("❌ 团队要求禁用 bash 工具 → 硬编码的工具集无法修改");
console.log("❌ 想添加 'code-review' 工作流 → 必须修改源码");

// === 4. Problem: can't switch models ===
console.log("\n--- 同事要换模型 ---\n");
console.log("❌ 模型硬编码为 claude-sonnet → 想用 gpt-4o 要改代码");

console.log("\n" + "=".repeat(60));
console.log("每换一个场景就要改代码 — 这不是产品，是脚本。");
console.log("运行 02-configurable.ts 看看配置化如何解决这些问题。");
