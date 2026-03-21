/**
 * Demo 02-03: Agent Loop with Events — 给循环添加事件系统
 *
 * 定义事件类型，创建 EventEmitter，在循环的各关键点发射事件。
 * 事件驱动架构让 UI/日志/监控可以在不修改循环的情况下接入。
 *
 * 运行: npx tsx src/03-with-events.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, isMockMode, printSection, printEvent } from "@pi-tutorial/shared";

// ── Event Types ─────────────────────────────────────────────────
type AgentEvent =
  | { type: "agent_start"; task: string }
  | { type: "agent_end"; turnCount: number }
  | { type: "turn_start"; turn: number }
  | { type: "turn_end"; turn: number; stopReason: string }
  | { type: "message_start" }
  | { type: "message_end"; stopReason: string }
  | { type: "tool_start"; name: string; input: unknown }
  | { type: "tool_end"; name: string; result: string };

// ── Simple EventEmitter ─────────────────────────────────────────
// Just an array of callbacks — the simplest event system possible
type EventHandler = (event: AgentEvent) => void;

class SimpleEventEmitter {
  private handlers: EventHandler[] = [];

  on(handler: EventHandler): void {
    this.handlers.push(handler);
  }

  emit(event: AgentEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }
}

// ── Tool Definitions ────────────────────────────────────────────
const tools: Anthropic.Tool[] = [
  {
    name: "get_weather",
    description: "Get the current weather for a city.",
    input_schema: {
      type: "object" as const,
      properties: {
        city: { type: "string", description: "City name" },
      },
      required: ["city"],
    },
  },
  {
    name: "get_time",
    description: "Get the current time for a timezone.",
    input_schema: {
      type: "object" as const,
      properties: {
        timezone: { type: "string", description: "IANA timezone, e.g. Asia/Shanghai" },
      },
      required: ["timezone"],
    },
  },
];

function executeTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "get_weather":
      return JSON.stringify({ city: input.city, temp: 22, condition: "sunny", humidity: 45 });
    case "get_time": {
      const now = new Date();
      return JSON.stringify({ timezone: input.timezone, time: now.toLocaleTimeString("zh-CN", { timeZone: input.timezone as string }) });
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

// ── Agent Loop with Events ──────────────────────────────────────
async function runAgentWithEvents(
  client: Anthropic,
  task: string,
  emitter: SimpleEventEmitter,
): Promise<void> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: task },
  ];

  let turnCount = 0;
  emitter.emit({ type: "agent_start", task });

  while (true) {
    turnCount++;
    emitter.emit({ type: "turn_start", turn: turnCount });
    emitter.emit({ type: "message_start" });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 1024,
      tools,
      messages,
    });

    emitter.emit({ type: "message_end", stopReason: response.stop_reason ?? "unknown" });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    // Print text output
    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        console.log(`  Assistant: ${block.text}`);
      }
    }

    if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
      emitter.emit({ type: "turn_end", turn: turnCount, stopReason: response.stop_reason ?? "unknown" });
      break;
    }

    // Execute tools
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      emitter.emit({ type: "tool_start", name: toolUse.name, input: toolUse.input });

      const result = executeTool(toolUse.name, toolUse.input as Record<string, unknown>);

      emitter.emit({ type: "tool_end", name: toolUse.name, result });
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });

    emitter.emit({ type: "turn_end", turn: turnCount, stopReason: response.stop_reason ?? "unknown" });
  }

  emitter.emit({ type: "agent_end", turnCount });
}

// ── Main ────────────────────────────────────────────────────────
printSection("Demo 02-03: Agent Loop with Events (事件系统)");

if (isMockMode()) {
  console.log("[Mock 模式 — 跳过 API 调用]\n");

  const emitter = new SimpleEventEmitter();

  // Subscribe to events
  emitter.on((event) => {
    printEvent(event.type, JSON.stringify(event).slice(0, 80));
  });

  console.log("模拟事件流:\n");

  emitter.emit({ type: "agent_start", task: "北京天气和时间" });
  emitter.emit({ type: "turn_start", turn: 1 });
  emitter.emit({ type: "message_start" });
  emitter.emit({ type: "message_end", stopReason: "tool_use" });
  emitter.emit({ type: "tool_start", name: "get_weather", input: { city: "Beijing" } });
  emitter.emit({ type: "tool_end", name: "get_weather", result: '{"temp":22}' });
  emitter.emit({ type: "tool_start", name: "get_time", input: { timezone: "Asia/Shanghai" } });
  emitter.emit({ type: "tool_end", name: "get_time", result: '{"time":"14:30:00"}' });
  emitter.emit({ type: "turn_end", turn: 1, stopReason: "tool_use" });
  emitter.emit({ type: "turn_start", turn: 2 });
  emitter.emit({ type: "message_start" });
  emitter.emit({ type: "message_end", stopReason: "end_turn" });
  emitter.emit({ type: "turn_end", turn: 2, stopReason: "end_turn" });
  emitter.emit({ type: "agent_end", turnCount: 2 });

  printSection("Key Learning");
  console.log("  事件系统让我们可以：");
  console.log("  1. 不修改循环代码就能添加 UI/日志/监控");
  console.log("  2. 追踪每个阶段的耗时和状态");
  console.log("  3. 多个订阅者可以同时监听相同事件");
  console.log("  核心原则：分离关注点 (Separation of Concerns)");
  process.exit(0);
}

const client = new Anthropic({ apiKey: getApiKey("anthropic") });
const emitter = new SimpleEventEmitter();

// ── Subscribe: Log all events ───────────────────────────────────
emitter.on((event) => {
  switch (event.type) {
    case "agent_start":
      printEvent("AGENT_START", `Task: "${event.task}"`);
      break;
    case "agent_end":
      printEvent("AGENT_END", `Completed in ${event.turnCount} turns`);
      break;
    case "turn_start":
      printEvent("TURN_START", `Turn ${event.turn}`);
      break;
    case "turn_end":
      printEvent("TURN_END", `Turn ${event.turn} (${event.stopReason})`);
      break;
    case "message_start":
      printEvent("MSG_START", "Calling LLM...");
      break;
    case "message_end":
      printEvent("MSG_END", `stop_reason=${event.stopReason}`);
      break;
    case "tool_start":
      printEvent("TOOL_START", `${event.name}(${JSON.stringify(event.input)})`);
      break;
    case "tool_end":
      printEvent("TOOL_END", `${event.name} -> ${event.result.slice(0, 60)}`);
      break;
  }
});

// ── Subscribe: Count events (separate subscriber) ───────────────
const counts: Record<string, number> = {};
emitter.on((event) => {
  counts[event.type] = (counts[event.type] ?? 0) + 1;
});

await runAgentWithEvents(
  client,
  "查一下北京的天气和当前时间（时区 Asia/Shanghai），然后汇总告诉我。",
  emitter,
);

console.log("\n事件统计:", counts);

printSection("Key Learning");
console.log("  事件系统让我们可以：");
console.log("  1. 不修改循环代码就能添加 UI/日志/监控");
console.log("  2. 追踪每个阶段的耗时和状态");
console.log("  3. 多个订阅者可以同时监听相同事件");
console.log("  核心原则：分离关注点 (Separation of Concerns)");
