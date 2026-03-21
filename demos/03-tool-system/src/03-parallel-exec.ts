/**
 * Demo 03: Parallel vs Sequential Tool Execution
 * 并行执行工具 vs 串行执行，对比耗时差异。
 *
 * 运行: npx tsx src/03-parallel-exec.ts
 *
 * 关键: 并行结果按原始顺序返回（不是完成顺序）。
 */
import { printSection, printEvent } from "@pi-tutorial/shared";

// ─── 定义 3 个带延迟的模拟工具 ───────────────────────────────────

interface ToolCall {
  name: string;
  id: string;
  delayMs: number;
}

async function executeTool(call: ToolCall): Promise<{ id: string; name: string; result: string }> {
  const start = Date.now();
  await new Promise((r) => setTimeout(r, call.delayMs));
  const elapsed = Date.now() - start;
  printEvent("完成", `${call.name} (${elapsed}ms)`);
  return {
    id: call.id,
    name: call.name,
    result: `${call.name} result (took ${elapsed}ms)`,
  };
}

const toolCalls: ToolCall[] = [
  { name: "web_search", id: "call_1", delayMs: 100 },
  { name: "file_reader", id: "call_2", delayMs: 200 },
  { name: "calculator", id: "call_3", delayMs: 50 },
];

// ─── 串行执行 ────────────────────────────────────────────────────
printSection("串行执行 (Sequential)");

const seqStart = Date.now();
const seqResults: Array<{ id: string; name: string; result: string }> = [];

for (const call of toolCalls) {
  printEvent("开始", call.name);
  const result = await executeTool(call);
  seqResults.push(result);
}

const seqTotal = Date.now() - seqStart;
printEvent("总耗时", `${seqTotal}ms (预期 ~350ms)`);

console.log("\n结果顺序:");
for (const r of seqResults) {
  console.log(`  ${r.id}: ${r.result}`);
}

// ─── 并行执行 ────────────────────────────────────────────────────
printSection("并行执行 (Parallel)");

const parStart = Date.now();

printEvent("开始", `同时启动 ${toolCalls.length} 个工具`);
const parResults = await Promise.all(toolCalls.map((call) => executeTool(call)));

const parTotal = Date.now() - parStart;
printEvent("总耗时", `${parTotal}ms (预期 ~200ms)`);

console.log("\n结果顺序 (按原始顺序，不是完成顺序!):");
for (const r of parResults) {
  console.log(`  ${r.id}: ${r.result}`);
}

// ─── 对比 ────────────────────────────────────────────────────────
printSection("对比总结");

const speedup = (seqTotal / parTotal).toFixed(1);
console.log(`  串行: ${seqTotal}ms`);
console.log(`  并行: ${parTotal}ms`);
console.log(`  加速: ${speedup}x`);
console.log("");
console.log("  关键点:");
console.log("  1. Promise.all 让所有工具同时开始执行");
console.log("  2. 总耗时 = max(各工具耗时)，而非 sum");
console.log("  3. 结果数组保持原始顺序 (call_1, call_2, call_3)");
console.log("     即使 calculator(50ms) 先完成，它仍然在 index 2");
