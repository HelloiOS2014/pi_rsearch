import { printSection, printEvent } from "@pi-tutorial/shared";

printSection("Demo 14-02: 多模式交付");

// ===== Event-driven Agent Core (mode-agnostic) =====

type AgentEvent = {
  type: "turn_start" | "turn_end" | "text" | "tool_call" | "tool_result" | "complete";
  data?: Record<string, unknown>;
  timestamp: number;
};

type EventListener = (event: AgentEvent) => void;

class AgentCore {
  private listeners: EventListener[] = [];

  subscribe(listener: EventListener): void {
    this.listeners.push(listener);
  }

  private emit(type: AgentEvent["type"], data?: Record<string, unknown>): void {
    const event: AgentEvent = { type, data, timestamp: Date.now() };
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  // Simulate agent processing a prompt
  async process(prompt: string): Promise<string> {
    this.emit("turn_start", { prompt });
    this.emit("text", { chunk: "让我分析一下..." });

    // Simulate tool call
    this.emit("tool_call", { name: "read", args: { path: "src/main.ts" } });

    // Hook check point (external hook can intercept here)
    this.emit("tool_result", { name: "read", result: "// file contents..." });

    this.emit("text", { chunk: `对于 "${prompt}"，分析完成。代码结构合理，建议添加错误处理。` });
    this.emit("turn_end", { tokenCount: 150 });

    const result = `分析完成：${prompt} — 建议添加错误处理`;
    this.emit("complete", { result });
    return result;
  }
}

// ===== Mode 1: Print Mode (CLI) =====

async function printMode(agent: AgentCore, prompt: string): Promise<void> {
  console.log("\n📋 === Print Mode (CLI) ===\n");

  agent.subscribe((event) => {
    if (event.type === "text") {
      process.stdout.write(event.data?.chunk as string);
    }
  });

  const result = await agent.process(prompt);
  console.log("\n\n结果:", result);
}

// ===== Mode 2: RPC Mode (JSON) =====

async function rpcMode(agent: AgentCore, prompt: string): Promise<void> {
  console.log("\n📡 === RPC Mode (JSON Protocol) ===\n");

  const events: AgentEvent[] = [];
  agent.subscribe((event) => {
    events.push(event);
    // In real RPC: JSON.stringify to stdout
    console.log(JSON.stringify({ type: event.type, data: event.data }));
  });

  await agent.process(prompt);
  console.log(`\n共 ${events.length} 个事件（IDE 可以程序化解析每一个）`);
}

// ===== Mode 3: With Hooks =====

interface HookResult {
  allow: boolean;
  reason?: string;
}

type PreToolUseHook = (toolName: string, args: Record<string, unknown>) => HookResult;

async function hookedMode(
  agent: AgentCore,
  prompt: string,
  hooks: { preToolUse?: PreToolUseHook },
): Promise<void> {
  console.log("\n🔒 === Hooked Mode (安全审批) ===\n");

  agent.subscribe((event) => {
    if (event.type === "tool_call" && hooks.preToolUse) {
      const result = hooks.preToolUse(
        event.data?.name as string,
        event.data?.args as Record<string, unknown>,
      );
      if (!result.allow) {
        printEvent("BLOCKED", `${event.data?.name as string} — ${result.reason}`);
      } else {
        printEvent("ALLOWED", event.data?.name as string);
      }
    }
    if (event.type === "text") {
      process.stdout.write(event.data?.chunk as string);
    }
  });

  await agent.process(prompt);
}

// ===== Mode 4: HTML Export =====

function htmlExport(events: AgentEvent[]): string {
  const content = events
    .filter((e) => e.type === "text" || e.type === "tool_call")
    .map((e) => {
      if (e.type === "text") return `<p>${e.data?.chunk as string}</p>`;
      return `<div class="tool-call">🔧 ${e.data?.name as string}(${JSON.stringify(e.data?.args)})</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html><head><title>Agent Session Export</title>
<style>body{font-family:system-ui;max-width:800px;margin:0 auto;padding:20px}
.tool-call{background:#f0f0f0;padding:8px;border-radius:4px;margin:8px 0}</style>
</head><body><h1>Agent Session</h1>${content}</body></html>`;
}

// ===== Demo Execution =====

const prompt = "review the authentication module";

// Demo 1: Print Mode
const agent1 = new AgentCore();
await printMode(agent1, prompt);

// Demo 2: RPC Mode
const agent2 = new AgentCore();
await rpcMode(agent2, prompt);

// Demo 3: Hooked Mode
const agent3 = new AgentCore();
await hookedMode(agent3, prompt, {
  preToolUse: (name, args) => {
    // Block dangerous operations
    const command = args?.command;
    if (name === "bash" && typeof command === "string" && command.includes("rm")) {
      return { allow: false, reason: "rm 命令需要管理员审批" };
    }
    return { allow: true };
  },
});

// Demo 4: HTML Export
const exportEvents: AgentEvent[] = [];
const agent4 = new AgentCore();
agent4.subscribe((event) => exportEvents.push(event));
await agent4.process(prompt);

const html = htmlExport(exportEvents);
console.log("\n\n📄 === HTML Export ===\n");
console.log(`生成了 ${html.length} 字符的自包含 HTML`);
console.log("（在实际使用中，这会写入文件并可在浏览器中打开）");

// Summary
console.log("\n" + "=".repeat(60));
console.log("四种交付模式，同一个 AgentCore：");
console.log("1. Print Mode — CLI pipe 输入/输出（~20 行）");
console.log("2. RPC Mode — JSON 事件流，IDE 可解析（~20 行）");
console.log("3. Hooked Mode — PreToolUse 安全审批（~20 行）");
console.log("4. HTML Export — 自包含离线会话分享");
console.log("\n核心洞见：一个 subscribe 就是一种交付模式。");
console.log("Agent 核心不需要知道谁在消费它的事件。");
