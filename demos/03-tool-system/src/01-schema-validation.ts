/**
 * Demo 01: TypeBox Schema Validation
 * 用 TypeBox 定义工具参数的 JSON Schema，并获得 TypeScript 类型安全。
 *
 * 运行: npx tsx src/01-schema-validation.ts
 *
 * 关键: TypeBox 直接生成 JSON Schema（LLM 需要的格式），
 *       而 Zod 需要额外的转换步骤。
 */
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { printSection, printEvent } from "@pi-tutorial/shared";

printSection("Demo 01: TypeBox Schema Validation");

// ─── 1. 用 TypeBox 定义工具参数 schema ───────────────────────────
printEvent("定义", "用 TypeBox 创建 search 工具的参数 schema");

const SearchParamsSchema = Type.Object({
  query: Type.String({ description: "搜索关键词" }),
  maxResults: Type.Optional(
    Type.Number({ minimum: 1, maximum: 100, description: "最大返回结果数" })
  ),
});

// Static<typeof schema> 自动推导出 TypeScript 类型
// 等价于: { query: string; maxResults?: number }
type SearchParams = Static<typeof SearchParamsSchema>;

// ─── 2. 查看生成的 JSON Schema ────────────────────────────────────
printEvent("JSON Schema", "TypeBox 直接输出 LLM 可用的 JSON Schema");
console.log(JSON.stringify(SearchParamsSchema, null, 2));

// ─── 3. 验证合法输入 ─────────────────────────────────────────────
printSection("验证合法输入");

const validInput: SearchParams = { query: "TypeBox vs Zod", maxResults: 10 };
printEvent("输入", JSON.stringify(validInput));

const isValid = Value.Check(SearchParamsSchema, validInput);
printEvent("结果", isValid ? "PASS - 验证通过" : "FAIL - 验证失败");

// ─── 4. 验证非法输入 ─────────────────────────────────────────────
printSection("验证非法输入");

const invalidInputs = [
  { label: "缺少必填字段 query", input: { maxResults: 5 } },
  { label: "query 类型错误 (number)", input: { query: 123 } },
  { label: "maxResults 超出范围", input: { query: "test", maxResults: 999 } },
  { label: "多余字段", input: { query: "test", unknown: true } },
];

for (const { label, input } of invalidInputs) {
  printEvent("输入", `${label}: ${JSON.stringify(input)}`);
  const ok = Value.Check(SearchParamsSchema, input);
  if (!ok) {
    const errors = [...Value.Errors(SearchParamsSchema, input)];
    const firstError = errors[0];
    printEvent("结果", `FAIL - ${firstError.message} (path: ${firstError.path})`);
  } else {
    printEvent("结果", "PASS (意外通过)");
  }
}

// ─── 5. 为什么选 TypeBox 而不是 Zod ──────────────────────────────
printSection("TypeBox vs Zod");

console.log(`
  TypeBox:
    - 定义 schema → 直接就是 JSON Schema (LLM 原生格式)
    - Static<typeof schema> → TypeScript 类型
    - 一步到位，零转换

  Zod:
    - 定义 schema → Zod 内部格式
    - 需要 zod-to-json-schema 才能给 LLM 用
    - 多一步转换，多一个依赖

  结论: 在 AI Agent 场景下，TypeBox 是更自然的选择。
`);
