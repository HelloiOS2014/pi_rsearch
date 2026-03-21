/**
 * Demo 02-05: Abort — AbortController 中止 Agent
 *
 * 通过 AbortSignal 在循环中传播中止信号。
 * 演示：启动一个长任务，3 秒后中止。
 * 当前操作完成后，循环优雅退出。
 *
 * 运行: npx tsx src/05-abort.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, isMockMode, printSection, printEvent } from "@pi-tutorial/shared";

// ── Tool Definitions ────────────────────────────────────────────
const tools: Anthropic.Tool[] = [
  {
    name: "slow_task",
    description: "Simulate a slow task that takes some time to complete. Returns a result.",
    input_schema: {
      type: "object" as const,
      properties: {
        step: { type: "number", description: "Step number to process" },
        description: { type: "string", description: "Description of what this step does" },
      },
      required: ["step", "description"],
    },
  },
];

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  if (name === "slow_task") {
    // Simulate a slow operation
    await new Promise((r) => setTimeout(r, 800));
    return `Step ${input.step} completed: ${input.description}`;
  }
  return `Unknown tool: ${name}`;
}

// ── Agent Loop with Abort ───────────────────────────────────────
async function runAgentWithAbort(
  client: Anthropic,
  task: string,
  signal: AbortSignal,
): Promise<{ completed: boolean; turns: number }> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: task },
  ];

  let turnCount = 0;
  const MAX_TURNS = 20;

  while (turnCount < MAX_TURNS) {
    // ── Check abort before LLM call ─────────────────────────
    if (signal.aborted) {
      printEvent("ABORT", "Signal detected before LLM call — exiting loop");
      return { completed: false, turns: turnCount };
    }

    turnCount++;
    printEvent(`Turn ${turnCount}`, "调用 LLM...");

    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 1024,
        tools,
        messages,
      });
    } catch (err) {
      if (signal.aborted) {
        printEvent("ABORT", "LLM call interrupted by abort signal");
        return { completed: false, turns: turnCount };
      }
      throw err;
    }

    // ── Check abort after LLM call ──────────────────────────
    if (signal.aborted) {
      printEvent("ABORT", "Signal detected after LLM call — exiting loop");
      return { completed: false, turns: turnCount };
    }

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        console.log(`  Assistant: ${block.text}\n`);
      }
    }

    if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
      printEvent("Done", `Agent 自然完成 (${turnCount} turns)`);
      return { completed: true, turns: turnCount };
    }

    // Execute tools
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      // ── Check abort before each tool execution ────────────
      if (signal.aborted) {
        printEvent("ABORT", `Signal detected before tool ${toolUse.name} — exiting`);
        return { completed: false, turns: turnCount };
      }

      printEvent("Tool", `${toolUse.name}(${JSON.stringify(toolUse.input).slice(0, 60)})`);
      const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
      console.log(`  <- ${result}\n`);

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  return { completed: true, turns: turnCount };
}

// ── Main ────────────────────────────────────────────────────────
printSection("Demo 02-05: Abort (AbortController 中止)");

if (isMockMode()) {
  console.log("[Mock 模式 — 跳过 API 调用]\n");

  console.log("模拟：Agent 执行 5 步任务，3 秒后中止\n");

  printEvent("Turn 1", "LLM 调用 slow_task({ step: 1 })");
  console.log("  <- Step 1 completed: 数据收集\n");

  printEvent("Turn 2", "LLM 调用 slow_task({ step: 2 })");
  console.log("  <- Step 2 completed: 数据清洗\n");

  printEvent("Turn 3", "LLM 调用 slow_task({ step: 3 })");
  console.log("  <- Step 3 completed: 数据分析\n");

  printEvent("ABORT", "3 秒到期 — 中止信号发出!");
  printEvent("ABORT", "Signal detected before LLM call — exiting loop");

  console.log("\nResult: { completed: false, turns: 3 }");
  console.log("Agent 执行了 3 轮后被优雅中止（没有执行 Step 4 和 Step 5）。\n");

  printSection("Key Learning");
  console.log("  AbortController 让我们可以优雅地停止 Agent：");
  console.log("  1. 创建 AbortController，把 signal 传入循环");
  console.log("  2. 在每次 LLM 调用前后、每次工具执行前检查 signal.aborted");
  console.log("  3. 当前操作完成后，循环自然退出");
  console.log("  4. 不会在工具执行一半时强制中断");
  console.log("  关键：abort 是协作式的，不是强制 kill。");
  process.exit(0);
}

const client = new Anthropic({ apiKey: getApiKey("anthropic") });

// Create AbortController
const controller = new AbortController();

// Set a 3-second timeout to abort
const abortTimeout = setTimeout(() => {
  printEvent("ABORT", "3 秒到期 — 发出中止信号!");
  controller.abort();
}, 3000);

const task = `请完成以下 5 个步骤，每个步骤都使用 slow_task 工具：
1. 数据收集 (step: 1)
2. 数据清洗 (step: 2)
3. 数据分析 (step: 3)
4. 生成报告 (step: 4)
5. 发送通知 (step: 5)
请按顺序执行每个步骤。`;

const result = await runAgentWithAbort(client, task, controller.signal);

clearTimeout(abortTimeout);

console.log(`\nResult: ${JSON.stringify(result)}`);
if (!result.completed) {
  console.log(`Agent 执行了 ${result.turns} 轮后被优雅中止。`);
}

printSection("Key Learning");
console.log("  AbortController 让我们可以优雅地停止 Agent：");
console.log("  1. 创建 AbortController，把 signal 传入循环");
console.log("  2. 在每次 LLM 调用前后、每次工具执行前检查 signal.aborted");
console.log("  3. 当前操作完成后，循环自然退出");
console.log("  4. 不会在工具执行一半时强制中断");
console.log("  关键：abort 是协作式的，不是强制 kill。");
