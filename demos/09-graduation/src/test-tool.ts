/**
 * 工具测试脚本 — 直接测试你的工具逻辑（不需要 API Key）
 *
 * 用法: npx tsx src/test-tool.ts
 *
 * 修改下面的 import 和调用来测试你自己的工具。
 */
import { executeReadCsv } from "./tools/read_csv.js";

console.log("=== 测试 read_csv 工具 ===\n");

const result = await executeReadCsv({
  path: "fixtures/data-analysis/sales.csv",
  limit: 5,
});
console.log(result);

console.log("\n=== 测试错误处理 ===\n");

const errorResult = await executeReadCsv({
  path: "not-exist.csv",
});
console.log(errorResult);

console.log("\n✅ 工具测试完成。如果输出符合预期，就可以注册到 agent.ts 中了。");
