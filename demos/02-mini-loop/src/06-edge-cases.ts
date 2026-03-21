/**
 * Demo 02-06: Edge Cases — 真实 Agent 框架要处理的边界情况
 *
 * 测试三个场景：
 * 1. 工具抛出错误 -> 错误成为 tool_result，LLM 会重试或调整
 * 2. Steering 队列的 "逐条" vs "全部" 模式
 * 3. LLM 返回空内容
 *
 * 运行: npx tsx src/06-edge-cases.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, isMockMode, printSection, printEvent } from "@pi-tutorial/shared";

// ── Tool Definitions ────────────────────────────────────────────
const tools: Anthropic.Tool[] = [
  {
    name: "divide",
    description: "Divide two numbers. May throw an error for division by zero.",
    input_schema: {
      type: "object" as const,
      properties: {
        a: { type: "number", description: "Numerator" },
        b: { type: "number", description: "Denominator" },
      },
      required: ["a", "b"],
    },
  },
  {
    name: "read_data",
    description: "Read data from a named dataset. Some datasets may not exist.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Dataset name" },
      },
      required: ["name"],
    },
  },
];

function executeTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "divide": {
      const a = input.a as number;
      const b = input.b as number;
      if (b === 0) {
        throw new Error("Division by zero is not allowed");
      }
      return String(a / b);
    }
    case "read_data": {
      const datasets: Record<string, string> = {
        users: '[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]',
        config: '{"theme":"dark","lang":"zh"}',
      };
      const data = datasets[input.name as string];
      if (!data) {
        throw new Error(`Dataset "${input.name}" not found. Available: ${Object.keys(datasets).join(", ")}`);
      }
      return data;
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

// Safe wrapper: catches tool errors and returns them as error messages
function safeExecuteTool(name: string, input: Record<string, unknown>): { result: string; isError: boolean } {
  try {
    const result = executeTool(name, input);
    return { result, isError: false };
  } catch (err) {
    return { result: `Error: ${(err as Error).message}`, isError: true };
  }
}

// ── Agent Loop (reusable) ───────────────────────────────────────
async function runAgent(
  client: Anthropic,
  task: string,
  agentTools: Anthropic.Tool[],
  toolExecutor: (name: string, input: Record<string, unknown>) => { result: string; isError: boolean },
  maxTurns: number = 10,
): Promise<void> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: task },
  ];

  let turnCount = 0;

  while (turnCount < maxTurns) {
    turnCount++;
    printEvent(`Turn ${turnCount}`, "调用 LLM...");

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 1024,
      tools: agentTools,
      messages,
    });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    // Print text
    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        console.log(`  Assistant: ${block.text}\n`);
      }
    }

    // Handle empty content
    if (response.content.length === 0) {
      printEvent("WARNING", "LLM returned empty content");
      break;
    }

    if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
      printEvent("Done", `Agent 完成 (${turnCount} turns)`);
      break;
    }

    // Execute tools with error handling
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      printEvent("Tool", `${toolUse.name}(${JSON.stringify(toolUse.input)})`);
      const { result, isError } = toolExecutor(toolUse.name, toolUse.input as Record<string, unknown>);

      if (isError) {
        printEvent("TOOL_ERROR", result);
      } else {
        console.log(`  <- ${result.slice(0, 80)}\n`);
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
        is_error: isError,
      });
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }
}

// ── Test 1: Tool Error Recovery ─────────────────────────────────
async function testToolErrorRecovery(client: Anthropic): Promise<void> {
  printSection("Test 1: Tool Error Recovery (工具错误恢复)");
  console.log("场景: LLM 尝试除以 0，收到错误后应该自己调整。\n");

  await runAgent(
    client,
    '请计算 10 / 0。如果出错，请计算 10 / 2 代替，并解释发生了什么。',
    tools,
    safeExecuteTool,
  );
}

// ── Test 2: Steering Queue Modes ────────────────────────────────
function testSteeringModes(): void {
  printSection("Test 2: Steering Queue Modes (队列模式)");

  // Mode 1: One-at-a-time — only inject the first message
  console.log("模式 1: One-at-a-time (逐条注入)\n");
  const queue1 = ["请用中文回答", "格式用表格", "加上总结"];
  console.log(`  队列中有 ${queue1.length} 条消息: ${JSON.stringify(queue1)}`);
  const oneAtATime = queue1.shift();
  console.log(`  本轮注入: "${oneAtATime}"`);
  console.log(`  队列剩余: ${JSON.stringify(queue1)}`);
  console.log("  优点: LLM 不会被太多指令淹没");
  console.log("  缺点: 可能需要更多轮次\n");

  // Mode 2: Drain all — inject all messages at once
  console.log("模式 2: Drain-all (全部注入)\n");
  const queue2 = ["请用中文回答", "格式用表格", "加上总结"];
  console.log(`  队列中有 ${queue2.length} 条消息: ${JSON.stringify(queue2)}`);
  const allMessages = queue2.splice(0, queue2.length);
  console.log(`  本轮注入: ${JSON.stringify(allMessages)}`);
  console.log(`  队列剩余: ${JSON.stringify(queue2)}`);
  console.log("  优点: 一次性给全部上下文");
  console.log("  缺点: 太多指令可能让 LLM 困惑\n");

  console.log("Pi 的选择: drain-all，因为 steering 通常是紧急的、上下文相关的。");
}

// ── Test 3: Empty Content Handling ──────────────────────────────
function testEmptyContent(): void {
  printSection("Test 3: Empty Content Handling (空内容处理)");

  console.log("场景: LLM 返回 content: []\n");
  console.log("  可能原因:");
  console.log("  - max_tokens 设为 0");
  console.log("  - API 返回格式异常");
  console.log("  - 网络问题导致的不完整响应\n");

  // Simulate the check
  const emptyResponse = { content: [], stop_reason: "end_turn" };
  const hasContent = emptyResponse.content.length > 0;
  console.log(`  content.length === 0 → ${!hasContent}`);
  console.log("  处理方式: 打印警告，退出循环\n");

  // Simulate non-empty with no text
  const noTextResponse = {
    content: [{ type: "tool_use", id: "123", name: "test", input: {} }],
    stop_reason: "tool_use",
  };
  const hasText = noTextResponse.content.some((b) => b.type === "text");
  console.log(`  content 有 tool_use 但没有 text → hasText=${hasText}`);
  console.log("  处理方式: 正常执行工具，不需要显示 Assistant 文本");
}

// ── Main ────────────────────────────────────────────────────────
printSection("Demo 02-06: Edge Cases (边界情况)");

if (isMockMode()) {
  console.log("[Mock 模式 — 跳过 API 调用]\n");

  // Test 1 mock
  printSection("Test 1: Tool Error Recovery (工具错误恢复)");
  console.log("场景: LLM 尝试除以 0，收到错误后应该自己调整。\n");

  printEvent("Turn 1", "调用 LLM...");
  printEvent("Tool", 'divide({"a":10,"b":0})');
  printEvent("TOOL_ERROR", "Error: Division by zero is not allowed");
  console.log("  -> 错误作为 tool_result 发回给 LLM (is_error: true)\n");

  printEvent("Turn 2", "调用 LLM...");
  printEvent("Tool", 'divide({"a":10,"b":2})');
  console.log("  <- 5\n");

  printEvent("Turn 3", "LLM 返回最终回复");
  console.log("  Assistant: 10/0 无法计算（除以零错误），改为计算 10/2 = 5。\n");
  printEvent("Done", "Agent 完成 (3 turns)");

  // Test 2
  testSteeringModes();

  // Test 3
  testEmptyContent();

  printSection("Key Learning");
  console.log("  真实的 Agent 框架需要处理很多边界情况：");
  console.log("  1. 工具错误 → 把错误当 tool_result 返回，LLM 会自适应");
  console.log("  2. Steering 队列 → 选择合适的注入策略");
  console.log("  3. 空内容 → 防御性检查，优雅退出");
  console.log("  4. 使用 is_error 标记让 LLM 知道工具调用失败了");
  process.exit(0);
}

const client = new Anthropic({ apiKey: getApiKey("anthropic") });

// Run all tests
await testToolErrorRecovery(client);
testSteeringModes();
testEmptyContent();

printSection("Key Learning");
console.log("  真实的 Agent 框架需要处理很多边界情况：");
console.log("  1. 工具错误 → 把错误当 tool_result 返回，LLM 会自适应");
console.log("  2. Steering 队列 → 选择合适的注入策略");
console.log("  3. 空内容 → 防御性检查，优雅退出");
console.log("  4. 使用 is_error 标记让 LLM 知道工具调用失败了");
