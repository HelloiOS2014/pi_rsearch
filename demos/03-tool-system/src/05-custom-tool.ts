/**
 * Demo 05: Custom Tool + Agent Loop
 * 构建一个完整的自定义工具，集成到 agent loop 中。
 *
 * 运行: npx tsx src/05-custom-tool.ts
 * 需要: ANTHROPIC_API_KEY 环境变量 (无则使用 mock 模式)
 */
import Anthropic from "@anthropic-ai/sdk";
import { Type, type TObject, type TProperties } from "@sinclair/typebox";
import { getApiKey, isMockMode, printSection, printEvent } from "@pi-tutorial/shared";

// ─── ToolRegistry (复用 Demo 02 的设计) ──────────────────────────

interface ToolDefinition {
  name: string;
  description: string;
  parameters: TObject<TProperties>;
  execute: (input: Record<string, unknown>) => Promise<string>;
}

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  toAnthropicTools(): Anthropic.Tool[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as unknown as Anthropic.Tool.InputSchema,
    }));
  }
}

// ─── 定义 word_count 工具 ────────────────────────────────────────

printSection("Demo 05: Custom Tool + Agent Loop");

const registry = new ToolRegistry();

registry.register({
  name: "word_count",
  description: "统计给定文本中的单词数量。按空格分词。",
  parameters: Type.Object({
    text: Type.String({ description: "要统计单词数的文本" }),
  }),
  execute: async (input) => {
    const text = input.text as string;
    const words = text.trim().split(/\s+/).filter(Boolean);
    return JSON.stringify({ wordCount: words.length, text: text.slice(0, 50) + "..." });
  },
});

printEvent("注册", "word_count 工具已注册");

// ─── Mock 模式 ───────────────────────────────────────────────────

if (isMockMode()) {
  printSection("Mock 模式 — 模拟 Agent Loop");

  printEvent("user", "请统计这段话的单词数: Hello world this is a test");
  printEvent("LLM", "决定调用 word_count 工具");
  printEvent("tool_use", 'word_count({ text: "Hello world this is a test" })');

  const tool = registry.get("word_count")!;
  const result = await tool.execute({ text: "Hello world this is a test" });
  printEvent("tool_result", result);

  printEvent("LLM", '这段话有 6 个单词。');
  console.log("\n完整流程: user → LLM → tool_use → execute → tool_result → LLM → 最终回复");
  process.exit(0);
}

// ─── 真实 Agent Loop ─────────────────────────────────────────────

printSection("Agent Loop (真实 API 调用)");

const client = new Anthropic({ apiKey: getApiKey("anthropic") });
const tools = registry.toAnthropicTools();

const messages: Anthropic.MessageParam[] = [
  {
    role: "user",
    content:
      "请帮我统计这段话有多少个单词: The quick brown fox jumps over the lazy dog near the riverbank",
  },
];

printEvent("user", messages[0].content as string);

let continueLoop = true;

while (continueLoop) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 1024,
    tools,
    messages,
  });

  printEvent("stop_reason", response.stop_reason ?? "null");

  // 收集本轮回复内容
  const assistantContent: Anthropic.ContentBlock[] = response.content;
  messages.push({ role: "assistant", content: assistantContent });

  if (response.stop_reason === "tool_use") {
    // 找到所有 tool_use 块
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks) {
      printEvent("tool_use", `${block.name}(${JSON.stringify(block.input)})`);

      const tool = registry.get(block.name);
      if (!tool) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Error: unknown tool "${block.name}"`,
          is_error: true,
        });
        continue;
      }

      try {
        const result = await tool.execute(block.input as Record<string, unknown>);
        printEvent("tool_result", result);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      } catch (err) {
        const errMsg = (err as Error).message;
        printEvent("tool_error", errMsg);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: errMsg,
          is_error: true,
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  } else {
    // stop_reason === "end_turn" — LLM 完成回复
    continueLoop = false;
    for (const block of response.content) {
      if (block.type === "text") {
        printEvent("assistant", block.text);
      }
    }
  }
}

console.log("\nAgent loop 完成!");
