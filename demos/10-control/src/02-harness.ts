/**
 * Demo 02: AgentHarness — 控制回路让 Agent 从错误中恢复
 * 对比 01-no-control：相同的 API 错误，但控制回路让 Agent 恢复并完成任务。
 *
 * AgentHarness 提供：
 * 1. 事件系统 — 可观测每一步
 * 2. 重试机制 — 指数退避自动恢复
 * 3. Turn 限制 — 防止无限循环
 * 4. Steering — 运行时注入指令
 * 5. Abort — 优雅中止
 *
 * 运行: npx tsx src/02-harness.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, isMockMode, printSection, printEvent } from "@pi-tutorial/shared";

printSection("Demo 02: AgentHarness（控制回路）");

// ============================
// 类型定义
// ============================
type HarnessEvent = {
  type: string;
  data?: Record<string, unknown>;
  timestamp: number;
};

type ToolExecutor = (name: string, input: Record<string, unknown>) => string;

interface HarnessConfig {
  apiKey: string;
  tools: Anthropic.Tool[];
  toolExecutor: ToolExecutor;
  maxTurns?: number;
  maxRetries?: number;
  baseDelay?: number;
}

// ============================
// AgentHarness 类
// ============================
class AgentHarness {
  private client: Anthropic;
  private tools: Anthropic.Tool[];
  private toolExecutor: ToolExecutor;
  private maxTurns: number;
  private maxRetries: number;
  private baseDelay: number;
  private listeners: Array<(event: HarnessEvent) => void> = [];
  private steerQueue: string[] = [];
  private abortController = new AbortController();
  private stats = { turns: 0, retries: 0, toolCalls: 0 };

  constructor(config: HarnessConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.tools = config.tools;
    this.toolExecutor = config.toolExecutor;
    this.maxTurns = config.maxTurns ?? 10;
    this.maxRetries = config.maxRetries ?? 3;
    this.baseDelay = config.baseDelay ?? 1000;
  }

  /** 订阅事件 */
  subscribe(listener: (event: HarnessEvent) => void): void {
    this.listeners.push(listener);
  }

  /** 发射事件 */
  private emit(type: string, data?: Record<string, unknown>): void {
    const event: HarnessEvent = { type, data, timestamp: Date.now() };
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /** 运行时注入指令（下一轮生效） */
  steer(message: string): void {
    this.steerQueue.push(message);
  }

  /** 优雅中止 */
  abort(): void {
    this.abortController.abort();
    this.emit("abort");
  }

  /** 判断错误是否可重试 */
  private isRetriable(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.includes("429") || msg.includes("500") || msg.includes("overloaded");
  }

  /** 带重试的 API 调用（指数退避） */
  private async callWithRetry(
    messages: Anthropic.MessageParam[]
  ): Promise<Anthropic.Message> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.client.messages.create({
          model: "claude-sonnet-4-5-20250514",
          max_tokens: 1024,
          tools: this.tools,
          messages,
        });
      } catch (err) {
        if (attempt === this.maxRetries || !this.isRetriable(err)) {
          throw err;
        }
        const delay = this.baseDelay * Math.pow(2, attempt);
        this.stats.retries++;
        this.emit("retry", { attempt: attempt + 1, delay, error: (err as Error).message });
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    // TypeScript 需要这行（逻辑上不可达）
    throw new Error("Unreachable");
  }

  /** 主运行循环 */
  async run(prompt: string): Promise<string> {
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: prompt },
    ];

    // Turn 限制 — 不是 while(true)
    for (let turn = 0; turn < this.maxTurns; turn++) {
      if (this.abortController.signal.aborted) {
        this.emit("abort");
        return "[aborted]";
      }

      this.stats.turns++;
      this.emit("turn_start", { turn: turn + 1 });

      // 注入 steering 指令
      if (this.steerQueue.length > 0) {
        const steerMsg = this.steerQueue.shift()!;
        messages.push({ role: "user", content: `[System steering]: ${steerMsg}` });
        this.emit("steer", { message: steerMsg });
      }

      // 带重试的 API 调用
      const response = await this.callWithRetry(messages);

      messages.push({ role: "assistant", content: response.content });
      this.emit("turn_end", { turn: turn + 1, stopReason: response.stop_reason });

      // Agent 完成
      if (response.stop_reason !== "tool_use") {
        const text = response.content.find((b) => b.type === "text");
        const result = text && text.type === "text" ? text.text : "";
        this.emit("complete", { result, stats: { ...this.stats } });
        return result;
      }

      // 执行工具调用
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          this.stats.toolCalls++;
          this.emit("tool_call", { name: block.name, input: block.input as Record<string, unknown> });
          const result = this.toolExecutor(block.name, block.input as Record<string, unknown>);
          this.emit("tool_result", { name: block.name, result });
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    }

    this.emit("error", { message: `Reached max turns (${this.maxTurns})` });
    return `[max turns reached: ${this.maxTurns}]`;
  }

  /** 清理资源 */
  shutdown(): void {
    this.listeners = [];
    this.steerQueue = [];
    this.emit("shutdown");
  }
}

// ============================
// 工具定义（和 01 相同）
// ============================
const tools: Anthropic.Tool[] = [
  {
    name: "calculator",
    description: "计算数学表达式",
    input_schema: {
      type: "object" as const,
      properties: {
        expression: { type: "string", description: "数学表达式" },
      },
      required: ["expression"],
    },
  },
];

function executeTool(name: string, input: Record<string, unknown>): string {
  if (name === "calculator") {
    const expr = input.expression as string;
    try {
      return String(Function(`"use strict"; return (${expr})`)());
    } catch {
      return `Error: cannot evaluate "${expr}"`;
    }
  }
  return `Error: unknown tool "${name}"`;
}

// ============================
// Mock 模式：模拟 Harness 行为（含重试恢复）
// ============================
if (isMockMode()) {
  console.log("Mock 模式 — 模拟 AgentHarness 控制回路\n");

  const stats = { turns: 0, retries: 0, toolCalls: 0 };

  // Turn 1: 正常
  stats.turns++;
  printEvent("turn_start", "turn 1");
  console.log("Assistant: 让我先计算 15 * 7。");
  printEvent("tool_call", 'calculator({ expression: "15 * 7" })');
  printEvent("tool_result", "105");
  stats.toolCalls++;
  printEvent("turn_end", "turn 1, stop_reason=tool_use");

  // Turn 2: 正常
  stats.turns++;
  printEvent("turn_start", "turn 2");
  console.log("Assistant: 现在计算 23 * 4。");
  printEvent("tool_call", 'calculator({ expression: "23 * 4" })');
  printEvent("tool_result", "92");
  stats.toolCalls++;
  printEvent("turn_end", "turn 2, stop_reason=tool_use");

  // Turn 3: API 错误 — 但重试机制恢复了！
  stats.turns++;
  printEvent("turn_start", "turn 3");
  console.log("\n\u{26A0}\u{FE0F}  模拟 API 429 错误...");
  stats.retries++;
  printEvent("retry", "attempt 1, delay 1000ms (429 Too Many Requests)");
  console.log("   ...等待 1000ms 后重试...");
  printEvent("retry_success", "第 1 次重试成功");
  console.log("Assistant: 最后把两个结果相加：105 + 92。");
  printEvent("tool_call", 'calculator({ expression: "105 + 92" })');
  printEvent("tool_result", "197");
  stats.toolCalls++;
  printEvent("turn_end", "turn 3, stop_reason=tool_use");

  // Turn 4: 完成
  stats.turns++;
  printEvent("turn_start", "turn 4");
  console.log("\nAssistant: 计算完成！15 * 7 = 105，23 * 4 = 92，两者之和 = 197。");
  printEvent("turn_end", "turn 4, stop_reason=end_turn");
  printEvent("complete", "任务完成");

  console.log(`\n\u{2705} Agent 完成`);
  console.log(`\u{1F4CA} 统计: ${stats.turns} turns, ${stats.retries} retry, ${stats.toolCalls} tool calls`);
  console.log("\n对比 01-no-control：相同的 API 错误，但控制回路让 Agent 恢复并完成了任务。");
  console.log("\nAgentHarness 提供的保护：");
  console.log("  1. 重试机制（指数退避） \u2192 自动从 429 错误恢复");
  console.log("  2. Turn 限制 \u2192 最多 10 轮，防止无限循环");
  console.log("  3. 事件系统 \u2192 每一步都可观测");
  console.log("  4. Steering \u2192 运行时可注入指令");
  console.log("  5. Abort \u2192 随时可优雅中止");
  process.exit(0);
}

// ============================
// 真实模式：使用 AgentHarness 运行
// ============================
const harness = new AgentHarness({
  apiKey: getApiKey("anthropic"),
  tools,
  toolExecutor: executeTool,
  maxTurns: 10,
  maxRetries: 3,
  baseDelay: 1000,
});

// 订阅事件 — 完整的可观测性
harness.subscribe((event) => {
  switch (event.type) {
    case "turn_start":
      printEvent("turn_start", `turn ${event.data?.turn}`);
      break;
    case "turn_end":
      printEvent("turn_end", `turn ${event.data?.turn}, stop_reason=${event.data?.stopReason}`);
      break;
    case "tool_call":
      printEvent("tool_call", `${event.data?.name}(${JSON.stringify(event.data?.input)})`);
      break;
    case "tool_result":
      printEvent("tool_result", `${event.data?.name} => ${event.data?.result}`);
      break;
    case "retry":
      printEvent("retry", `attempt ${event.data?.attempt}, delay ${event.data?.delay}ms`);
      break;
    case "error":
      printEvent("error", `${event.data?.message}`);
      break;
    case "complete":
      printEvent("complete", "任务完成");
      const stats = event.data?.stats as Record<string, number> | undefined;
      if (stats) {
        console.log(`\n\u{2705} Agent 完成`);
        console.log(`\u{1F4CA} 统计: ${stats.turns} turns, ${stats.retries} retries, ${stats.toolCalls} tool calls`);
      }
      break;
  }
});

try {
  const result = await harness.run("计算 15 * 7，然后计算 23 * 4，最后把两个结果相加");
  console.log("\nAssistant:", result);
} catch (err) {
  console.error(`Error: ${(err as Error).message}`);
} finally {
  harness.shutdown();
}
