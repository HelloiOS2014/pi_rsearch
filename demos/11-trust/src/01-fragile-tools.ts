import { printSection, printEvent } from "@pi-tutorial/shared";
import * as path from "path";
import { fileURLToPath } from "url";

printSection("Demo 11-01: 脆弱的工具");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ===== Test 1: Edit with exact matching (fragile) =====
console.log("\n📝 测试 1：精确匹配编辑\n");

// File content has smart quotes (common in copy-pasted code)
const fileContent = `const message = \u201CHello World\u201D;  // Unicode smart quotes`;
// LLM outputs ASCII quotes (common in LLM output)
const oldText = `const message = "Hello World";`;

function fragileEdit(content: string, old: string, replacement: string): string {
  const idx = content.indexOf(old);
  if (idx === -1) throw new Error("Error: no match found");
  return content.slice(0, idx) + replacement + content.slice(idx + old.length);
}

try {
  fragileEdit(fileContent, oldText, `const message = "Hi World";`);
  console.log("✅ 编辑成功");
} catch (e) {
  console.log(`❌ 编辑失败: ${(e as Error).message}`);
  console.log(`   文件中: ${fileContent}`);
  console.log(`   LLM 给的: ${oldText}`);
  console.log(`   差异: 智能引号 \u201C\u201D vs ASCII 引号 ""`);
}

// ===== Test 2: Bash with no timeout (fragile) =====
console.log("\n⚡ 测试 2：无超时的命令执行\n");

console.log("模拟执行: sleep 3600 (一小时的命令)");
console.log("❌ 没有超时机制 — 你必须手动 Ctrl+C");
console.log("   (这里跳过实际执行，但生产中这会卡住整个 Agent)");

// ===== Test 3: No output truncation (fragile) =====
console.log("\n📄 测试 3：无截断的输出\n");

const hugeOutput = "x".repeat(100_000); // 100KB of output
console.log(`模拟工具输出: ${hugeOutput.length} 字符`);
console.log(
  `❌ 直接注入上下文将消耗 ~${Math.ceil(hugeOutput.length / 4)} tokens`
);
console.log("   一次 grep 结果就能填满整个上下文窗口");

// Summary
console.log("\n" + "=".repeat(60));
console.log("三个失败，三个教训：");
console.log("1. 精确匹配在 Unicode 世界中是脆弱的");
console.log("2. 没有超时的命令执行是危险的");
console.log("3. 不截断的输出会摧毁上下文窗口");
console.log("运行 02-defensive-tools.ts 看看如何修复这些问题。");
