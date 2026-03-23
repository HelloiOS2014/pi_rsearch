/**
 * 工具模板 — 复制这个文件来创建你的自定义工具
 *
 * 每个工具需要两样东西：
 * 1. Schema（Anthropic.Tool 格式）— 告诉 LLM 工具的名称、描述、参数
 * 2. Execute 函数 — 实际执行逻辑，接收参数，返回字符串结果
 */
import type Anthropic from "@anthropic-ai/sdk";

// ── Schema：LLM 通过这个 JSON 了解你的工具 ─────────────────────
export const myToolSchema: Anthropic.Tool = {
  name: "my_tool",                    // 工具名（LLM 调用时用这个名字）
  description: "描述这个工具做什么",      // 描述（帮助 LLM 判断何时使用）
  input_schema: {
    type: "object",
    properties: {
      // TODO: 定义你的参数
      param1: { type: "string", description: "参数 1 的说明" },
    },
    required: ["param1"],             // 必填参数列表
  },
};

// ── Execute：实际执行逻辑 ────────────────────────────────────
export async function executeMyTool(
  input: { param1: string },
): Promise<string> {
  // TODO: 实现你的工具逻辑
  // 返回字符串 — 这就是 LLM 收到的工具结果
  return `执行 my_tool，参数: ${input.param1}`;
}
