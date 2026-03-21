/**
 * Demo 02: Tool Registry
 * 工具注册表 — 注册、发现、生成 system prompt。
 *
 * 运行: npx tsx src/02-tool-registry.ts
 */
import { Type, type TObject, type TProperties } from "@sinclair/typebox";
import { printSection, printEvent } from "@pi-tutorial/shared";

// ─── ToolDefinition 类型 ─────────────────────────────────────────
interface ToolDefinition {
  name: string;
  description: string;
  parameters: TObject<TProperties>;
  execute: (input: Record<string, unknown>) => Promise<string>;
}

// ─── ToolRegistry 类 ────────────────────────────────────────────
class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered. Name conflict!`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * 生成 system prompt 片段 — 把所有注册的工具描述给 LLM。
   */
  generateToolPrompt(): string {
    const lines: string[] = ["You have access to the following tools:"];
    for (const tool of this.tools.values()) {
      lines.push("");
      lines.push(`## ${tool.name}`);
      lines.push(tool.description);
      lines.push("Parameters:");
      lines.push("```json");
      lines.push(JSON.stringify(tool.parameters, null, 2));
      lines.push("```");
    }
    return lines.join("\n");
  }

  /**
   * 转换为 Anthropic API 格式的 tools 数组。
   */
  toAnthropicTools(): Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }> {
    return this.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as unknown as Record<string, unknown>,
    }));
  }
}

// ─── 注册工具 ────────────────────────────────────────────────────
printSection("Demo 02: Tool Registry");

const registry = new ToolRegistry();

// 工具 1: calculator
registry.register({
  name: "calculator",
  description: "计算数学表达式，返回数值结果。",
  parameters: Type.Object({
    expression: Type.String({ description: "数学表达式，如 '2 + 3 * 4'" }),
  }),
  execute: async (input) => {
    const expr = input.expression as string;
    const result = Function(`"use strict"; return (${expr})`)();
    return String(result);
  },
});
printEvent("注册", "calculator");

// 工具 2: file_reader
registry.register({
  name: "file_reader",
  description: "读取指定路径的文件内容。",
  parameters: Type.Object({
    path: Type.String({ description: "文件路径" }),
    encoding: Type.Optional(Type.String({ description: "编码格式，默认 utf-8" })),
  }),
  execute: async (input) => {
    return `[模拟] 读取文件: ${input.path}，编码: ${input.encoding ?? "utf-8"}`;
  },
});
printEvent("注册", "file_reader");

// 工具 3: web_search
registry.register({
  name: "web_search",
  description: "搜索互联网，返回相关结果摘要。",
  parameters: Type.Object({
    query: Type.String({ description: "搜索关键词" }),
    maxResults: Type.Optional(Type.Number({ description: "最大结果数", minimum: 1, maximum: 20 })),
  }),
  execute: async (input) => {
    return `[模拟] 搜索 "${input.query}"，返回 ${input.maxResults ?? 5} 条结果`;
  },
});
printEvent("注册", "web_search");

// ─── 列出所有工具 ────────────────────────────────────────────────
printSection("已注册工具列表");

for (const tool of registry.list()) {
  console.log(`  - ${tool.name}: ${tool.description}`);
}

// ─── 生成 system prompt ──────────────────────────────────────────
printSection("生成的 System Prompt 片段");

const prompt = registry.generateToolPrompt();
console.log(prompt);

// ─── 转换为 Anthropic API 格式 ───────────────────────────────────
printSection("Anthropic API 工具格式");

const anthropicTools = registry.toAnthropicTools();
console.log(JSON.stringify(anthropicTools[0], null, 2));
console.log(`... 共 ${anthropicTools.length} 个工具`);

// ─── 冲突检测 ────────────────────────────────────────────────────
printSection("冲突检测: 注册同名工具");

try {
  registry.register({
    name: "calculator",
    description: "另一个计算器",
    parameters: Type.Object({
      expr: Type.String(),
    }),
    execute: async () => "nope",
  });
  console.log("  意外: 没有抛出异常");
} catch (err) {
  printEvent("捕获异常", (err as Error).message);
  console.log("  正确! 同名工具注册被拒绝。");
}

// ─── 导出供其他 demo 使用 ────────────────────────────────────────
export { ToolRegistry, type ToolDefinition };
