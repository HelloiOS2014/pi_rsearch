/**
 * Demo 02-02: Multi-Turn Agent Loop — 完整的 while 循环
 *
 * 实现完整的 agent 循环：while(true) 直到 LLM 停止调用工具。
 * 使用 read_file 和 write_file 工具，让 LLM 自主完成：
 * 读取文件 -> 计算行数 -> 写入结果
 *
 * 运行: npx tsx src/02-multi-turn.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { getApiKey, isMockMode, printSection, printEvent } from "@pi-tutorial/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = path.resolve(__dirname, "..");

// ── Tool Definitions ────────────────────────────────────────────
const tools: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "Read the contents of a file. Returns the file content as text.",
    input_schema: {
      type: "object" as const,
      properties: {
        filepath: { type: "string", description: "Path to the file to read (relative to demo directory)" },
      },
      required: ["filepath"],
    },
  },
  {
    name: "write_file",
    description: "Write content to a file. Creates the file if it doesn't exist, overwrites if it does.",
    input_schema: {
      type: "object" as const,
      properties: {
        filepath: { type: "string", description: "Path to the file to write (relative to demo directory)" },
        content: { type: "string", description: "Content to write to the file" },
      },
      required: ["filepath", "content"],
    },
  },
];

// ── Tool Implementations ────────────────────────────────────────
function executeTool(name: string, input: Record<string, unknown>): string {
  const filepath = path.resolve(DEMO_DIR, input.filepath as string);

  switch (name) {
    case "read_file": {
      try {
        return fs.readFileSync(filepath, "utf-8");
      } catch (err) {
        return `Error reading file: ${(err as Error).message}`;
      }
    }
    case "write_file": {
      try {
        fs.writeFileSync(filepath, input.content as string, "utf-8");
        return `Successfully wrote to ${input.filepath}`;
      } catch (err) {
        return `Error writing file: ${(err as Error).message}`;
      }
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

// ── Main ────────────────────────────────────────────────────────
printSection("Demo 02-02: Multi-Turn Agent Loop (完整 while 循环)");

if (isMockMode()) {
  console.log("[Mock 模式 — 跳过 API 调用]\n");

  printEvent("Turn 1", "LLM 决定调用 read_file");
  console.log('  -> read_file({ filepath: "demo-input.txt" })');
  console.log("  <- (文件内容: 10 行文本)\n");

  printEvent("Turn 2", "LLM 决定调用 write_file");
  console.log('  -> write_file({ filepath: "demo-output.txt", content: "Line count: 10" })');
  console.log("  <- Successfully wrote to demo-output.txt\n");

  printEvent("Turn 3", "LLM 返回 end_turn — 循环结束");
  console.log("  Assistant: 我读取了 demo-input.txt，数了 10 行，并将结果写入了 demo-output.txt。\n");

  console.log("Agent 自主执行了 3 轮:");
  console.log("  Turn 1: read_file  (观察)");
  console.log("  Turn 2: write_file (行动)");
  console.log("  Turn 3: end_turn   (完成)\n");

  printSection("Key Learning");
  console.log("  while 循环 IS the agent.");
  console.log("  LLM 在每轮决定：继续调用工具，还是结束。");
  console.log("  我们只需要：发送 -> 检查 stop_reason -> 执行 -> 循环。");
  process.exit(0);
}

const client = new Anthropic({ apiKey: getApiKey("anthropic") });

const task = `请完成以下任务：
1. 读取文件 demo-input.txt
2. 数一下有多少行
3. 把行数写入 demo-output.txt（格式：Line count: N）
4. 告诉我你做了什么`;

const messages: Anthropic.MessageParam[] = [
  { role: "user", content: task },
];

let turnCount = 0;

// ── The Agent Loop ──────────────────────────────────────────────
// This is the core pattern: while(true), call LLM, check if done, execute tools, repeat
while (true) {
  turnCount++;
  printEvent(`Turn ${turnCount}`, "调用 LLM...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 1024,
    tools,
    messages,
  });

  // Collect all tool_use blocks from this response
  const toolUseBlocks = response.content.filter(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  // Print any text blocks
  for (const block of response.content) {
    if (block.type === "text" && block.text.trim()) {
      console.log(`  Assistant: ${block.text}`);
    }
  }

  // If no tool calls, the agent is done
  if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
    printEvent("Done", `Agent 完成 (stop_reason=${response.stop_reason})`);
    break;
  }

  // Execute each tool call and collect results
  const toolResults: Anthropic.ToolResultBlockParam[] = [];
  for (const toolUse of toolUseBlocks) {
    printEvent("Tool", `${toolUse.name}(${JSON.stringify(toolUse.input)})`);
    const result = executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
    console.log(`  <- ${result.slice(0, 100)}${result.length > 100 ? "..." : ""}\n`);

    toolResults.push({
      type: "tool_result",
      tool_use_id: toolUse.id,
      content: result,
    });
  }

  // Add assistant response and tool results to message history
  messages.push({ role: "assistant", content: response.content });
  messages.push({ role: "user", content: toolResults });
}

console.log(`\nAgent 总共执行了 ${turnCount} 轮。\n`);

// Verify the output
try {
  const output = fs.readFileSync(path.resolve(DEMO_DIR, "demo-output.txt"), "utf-8");
  console.log(`验证 demo-output.txt 内容: "${output.trim()}"`);
} catch {
  console.log("(demo-output.txt 未创建)");
}

printSection("Key Learning");
console.log("  while 循环 IS the agent.");
console.log("  LLM 在每轮决定：继续调用工具，还是结束。");
console.log("  我们只需要：发送 -> 检查 stop_reason -> 执行 -> 循环。");
