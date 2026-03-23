/**
 * 毕业项目 Agent — 简化的 Agent Loop
 *
 * 基于 Ch01 的 30 行模式扩展：
 * - 多工具支持（ALL_TOOLS + TOOL_EXECUTORS）
 * - 事件发射（turn_start, tool_call, tool_result, turn_end）
 * - try/catch 错误处理
 *
 * TODO: 在这里注册你的自定义工具
 */
import Anthropic from "@anthropic-ai/sdk";
import { printEvent } from "@pi-tutorial/shared";
import { buildSystemPrompt } from "./prompt.js";

// ── 工具注册（在这里添加你的工具）──────────────────────────────
import { readCsvSchema, executeReadCsv } from "./tools/read_csv.js";
// import { myToolSchema, executeMyTool } from "./tools/my-tool.js";

const ALL_TOOLS: Anthropic.Tool[] = [
  readCsvSchema,
  // TODO: 把你的工具 schema 加到这里
  // myToolSchema,
];

const TOOL_EXECUTORS: Record<string, (input: Record<string, unknown>) => Promise<string>> = {
  read_csv: (input) => executeReadCsv(input as any),
  // TODO: 把你的工具执行器加到这里
  // my_tool: (input) => executeMyTool(input as any),
};

// ── Agent 核心循环 ───────────────────────────────────────────
export async function runAgent(
  client: Anthropic,
  userMessage: string,
  model: string = "claude-sonnet-4-5-20250514",
): Promise<string> {
  const systemPrompt = buildSystemPrompt(ALL_TOOLS.map((t) => t.name));
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let turn = 0;
  const MAX_TURNS = 10;

  while (turn < MAX_TURNS) {
    turn++;
    printEvent("turn_start", `Turn ${turn}`);

    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      tools: ALL_TOOLS.length > 0 ? ALL_TOOLS : undefined,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    // 没有工具调用 → 返回文本
    if (response.stop_reason !== "tool_use") {
      printEvent("turn_end", "最终回复");
      const text = response.content.find((b) => b.type === "text");
      return text && text.type === "text" ? text.text : "(no text response)";
    }

    // 执行工具调用
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        printEvent("tool_call", `${block.name}(${JSON.stringify(block.input)})`);
        let result: string;
        try {
          const executor = TOOL_EXECUTORS[block.name];
          result = executor
            ? await executor(block.input as Record<string, unknown>)
            : `Error: unknown tool "${block.name}"`;
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }
        printEvent("tool_result", result.slice(0, 200));
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
    }

    messages.push({ role: "user", content: toolResults });
    printEvent("turn_end", `${toolResults.length} 个工具结果已返回`);
  }

  return "(达到最大轮数限制)";
}
