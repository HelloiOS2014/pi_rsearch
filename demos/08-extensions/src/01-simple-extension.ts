/**
 * Demo 08 — Simple Audit Extension
 *
 * Intercept all tool calls, log them, and block dangerous ones.
 * Shows the extension pattern: on(event, handler).
 */

import { printSection, printEvent } from "@pi-tutorial/shared";

// ── Extension interface ────────────────────────────────────────────────
type EventHandler = (data: ToolCallEvent) => ToolCallEvent | null;

interface ExtensionContext {
  on: (event: string, handler: EventHandler) => void;
}

interface ToolCallEvent {
  name: string;
  input: Record<string, string>;
  blocked?: boolean;
  reason?: string;
}

// ── Extension host (core agent would provide this) ─────────────────────
class ExtensionHost {
  private handlers: Record<string, EventHandler[]> = {};

  createContext(): ExtensionContext {
    return {
      on: (event: string, handler: EventHandler) => {
        (this.handlers[event] ??= []).push(handler);
      },
    };
  }

  emit(event: string, data: ToolCallEvent): ToolCallEvent | null {
    let current: ToolCallEvent | null = data;
    for (const handler of this.handlers[event] ?? []) {
      if (!current) break;
      current = handler(current);
    }
    return current;
  }
}

// ── The Audit Extension ────────────────────────────────────────────────
function auditExtension(ctx: ExtensionContext) {
  const log: Array<{ timestamp: string; name: string; blocked: boolean }> = [];

  ctx.on("tool_call", (event) => {
    const timestamp = new Date().toISOString().slice(11, 23);

    // Block dangerous operations
    const BLOCKED_TOOLS = ["delete_database", "drop_table"];
    const BLOCKED_PATTERNS = ["rm -rf /", "format c:", "sudo rm"];

    if (BLOCKED_TOOLS.includes(event.name)) {
      log.push({ timestamp, name: event.name, blocked: true });
      printEvent("BLOCKED", `Tool "${event.name}" is not allowed`);
      return null; // null = blocked
    }

    const inputStr = JSON.stringify(event.input);
    for (const pattern of BLOCKED_PATTERNS) {
      if (inputStr.includes(pattern)) {
        log.push({ timestamp, name: event.name, blocked: true });
        printEvent("BLOCKED", `Input contains dangerous pattern: "${pattern}"`);
        return null;
      }
    }

    // Allow and log
    log.push({ timestamp, name: event.name, blocked: false });
    printEvent("AUDIT", `Allowed: ${event.name}(${inputStr.slice(0, 50)})`);
    return event;
  });

  return { getLog: () => log };
}

// ── Demo: simulate tool calls through the extension ────────────────────
printSection("Audit Extension: Intercept & Block");

const host = new ExtensionHost();
const audit = auditExtension(host.createContext());

const testCalls: ToolCallEvent[] = [
  { name: "read_file", input: { path: "readme.md" } },
  { name: "write_file", input: { path: "out.txt", content: "hello" } },
  { name: "delete_database", input: { target: "production" } },
  { name: "run_command", input: { cmd: "rm -rf / --no-preserve-root" } },
  { name: "search", input: { query: "TODO" } },
];

console.log("Processing 5 tool calls through audit extension...\n");

for (const call of testCalls) {
  host.emit("tool_call", call);
}

console.log(`\nAudit log: ${audit.getLog().length} entries`);
console.log(`Blocked: ${audit.getLog().filter((e) => e.blocked).length}`);
console.log(`Allowed: ${audit.getLog().filter((e) => !e.blocked).length}`);
