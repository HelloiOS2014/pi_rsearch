/**
 * Demo 02-04: Steering — 中途注入指令
 *
 * 实现 steeringQueue，在工具执行之后、下一次 LLM 调用之前
 * 检查是否有新的指令，如果有就注入到消息中。
 *
 * 运行: npx tsx src/04-steering.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, isMockMode, printSection, printEvent } from "@pi-tutorial/shared";

// ── Steering Queue ──────────────────────────────────────────────
// A simple queue of user messages that can be injected mid-run
const steeringQueue: string[] = [];

function addSteering(message: string): void {
  steeringQueue.push(message);
  printEvent("STEERING_ADDED", `"${message}"`);
}

function drainSteering(): string[] {
  const messages = [...steeringQueue];
  steeringQueue.length = 0;
  return messages;
}

// ── Tool Definitions ────────────────────────────────────────────
const tools: Anthropic.Tool[] = [
  {
    name: "search",
    description: "Search for information about a topic. Returns relevant results.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "summarize",
    description: "Create a summary of provided text with a specific format.",
    input_schema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "Text to summarize" },
        format: { type: "string", description: "Output format: bullet_points | paragraph | one_line" },
      },
      required: ["text", "format"],
    },
  },
];

function executeTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "search":
      return JSON.stringify({
        results: [
          { title: "Agent Loop Pattern", snippet: "The agent loop is a while(true) that calls LLM and tools alternately." },
          { title: "Tool Use in LLMs", snippet: "Tools extend LLM capabilities by allowing real-world interactions." },
          { title: "Event-Driven Architecture", snippet: "Events decouple producers from consumers for flexible systems." },
        ],
      });
    case "summarize":
      return `Summary (${input.format}): The agent loop pattern involves calling LLMs in a loop, executing tools, and using events for observability.`;
    default:
      return `Unknown tool: ${name}`;
  }
}

// ── Agent Loop with Steering ────────────────────────────────────
async function runAgentWithSteering(
  client: Anthropic,
  task: string,
): Promise<void> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: task },
  ];

  let turnCount = 0;
  const MAX_TURNS = 10;

  while (turnCount < MAX_TURNS) {
    turnCount++;

    // ── Check steering queue before each LLM call ─────────────
    const steering = drainSteering();
    if (steering.length > 0) {
      printEvent("STEERING_INJECT", `Injecting ${steering.length} steering message(s)`);
      for (const msg of steering) {
        // Inject steering as a user message
        // We need to ensure message alternation: if last message is "user", combine them
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.role === "user") {
          // Append to existing user message
          if (typeof lastMsg.content === "string") {
            lastMsg.content = lastMsg.content + "\n\n[Steering]: " + msg;
          } else if (Array.isArray(lastMsg.content)) {
            (lastMsg.content as Anthropic.ContentBlockParam[]).push({ type: "text", text: "\n\n[Steering]: " + msg });
          }
        } else {
          messages.push({ role: "user", content: "[Steering]: " + msg });
        }
        console.log(`  Injected: "${msg}"\n`);
      }
    }

    printEvent(`Turn ${turnCount}`, "调用 LLM...");

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 1024,
      tools,
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

    if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
      printEvent("Done", `Agent 完成 (${turnCount} turns)`);
      break;
    }

    // Execute tools
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      printEvent("Tool", `${toolUse.name}(${JSON.stringify(toolUse.input).slice(0, 60)})`);
      const result = executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
      console.log(`  <- ${result.slice(0, 80)}...\n`);

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }
}

// ── Main ────────────────────────────────────────────────────────
printSection("Demo 02-04: Steering (中途注入指令)");

if (isMockMode()) {
  console.log("[Mock 模式 — 跳过 API 调用]\n");

  console.log("模拟：Agent 开始搜索任务\n");

  printEvent("Turn 1", "LLM 调用 search({ query: 'agent loop' })");
  console.log("  <- 搜索到 3 条结果\n");

  printEvent("STEERING_ADDED", '"请用中文输出，格式用 bullet points"');
  printEvent("STEERING_INJECT", "Injecting 1 steering message(s)");
  console.log('  Injected: "请用中文输出，格式用 bullet points"\n');

  printEvent("Turn 2", "LLM 收到 steering，调用 summarize({ format: 'bullet_points' })");
  console.log("  <- Summary (bullet_points): ...\n");

  printEvent("Turn 3", "LLM 返回最终结果（中文 + bullet points）");
  console.log("  Assistant: 以下是 Agent Loop 的要点：");
  console.log("  - Agent 循环是一个 while(true) 循环");
  console.log("  - 交替调用 LLM 和工具");
  console.log("  - 事件系统提供可观测性\n");

  printEvent("Done", "Agent 完成 (3 turns)");

  printSection("Key Learning");
  console.log("  Steering 允许用户在 Agent 运行中途注入新指令：");
  console.log("  1. 维护一个 steeringQueue 数组");
  console.log("  2. 每轮循环开始前检查队列");
  console.log("  3. 如果有消息，注入到对话中（LLM 会看到它）");
  console.log("  这实现了类似「中断」的通信模式。");
  process.exit(0);
}

const client = new Anthropic({ apiKey: getApiKey("anthropic") });

// Simulate user adding steering mid-way
// We use setTimeout because the agent loop is async
setTimeout(() => {
  addSteering("请用中文输出结果，格式使用 bullet points。");
}, 2000);

await runAgentWithSteering(
  client,
  "Search for information about the agent loop pattern and then summarize the results.",
);

printSection("Key Learning");
console.log("  Steering 允许用户在 Agent 运行中途注入新指令：");
console.log("  1. 维护一个 steeringQueue 数组");
console.log("  2. 每轮循环开始前检查队列");
console.log("  3. 如果有消息，注入到对话中（LLM 会看到它）");
console.log("  这实现了类似「中断」的通信模式。");
