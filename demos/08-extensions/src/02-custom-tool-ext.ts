/**
 * Demo 08 — Custom Tool Extension
 *
 * Register a custom tool via the extension API.
 * Shows how extensions add capabilities without modifying core.
 */

import { printSection, printEvent } from "@pi-tutorial/shared";

// ── Tool registry (core agent provides this) ──────────────────────────
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, string>) => string;
}

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
    printEvent("REGISTER", `Tool "${tool.name}" registered`);
  }

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  executeTool(name: string, input: Record<string, string>): string {
    const tool = this.tools.get(name);
    if (!tool) return `Error: unknown tool "${name}"`;
    return tool.execute(input);
  }
}

// ── Extension context with registerTool capability ─────────────────────
interface ExtensionContext {
  registerTool: (tool: ToolDefinition) => void;
  listTools: () => string[];
}

// ── Timestamp extension — adds a "timestamp" tool ──────────────────────
function timestampExtension(ctx: ExtensionContext) {
  ctx.registerTool({
    name: "timestamp",
    description: "Returns the current date and time in ISO format",
    inputSchema: {
      type: "object",
      properties: {
        format: { type: "string", enum: ["iso", "unix", "human"] },
      },
    },
    execute: (input) => {
      const now = new Date();
      switch (input.format) {
        case "unix":
          return String(Math.floor(now.getTime() / 1000));
        case "human":
          return now.toLocaleString("en-US", {
            weekday: "long", year: "numeric", month: "long",
            day: "numeric", hour: "2-digit", minute: "2-digit",
          });
        case "iso":
        default:
          return now.toISOString();
      }
    },
  });
}

// ── Demo ───────────────────────────────────────────────────────────────
printSection("Custom Tool Extension: Add Capabilities");

const registry = new ToolRegistry();

// Core tools (built-in)
registry.registerTool({
  name: "read_file",
  description: "Read a file",
  inputSchema: { type: "object", properties: { path: { type: "string" } } },
  execute: (input) => `Contents of ${input.path}: hello world`,
});

console.log(`\nBefore extension: [${registry.listTools().join(", ")}]`);

// Load extension — it adds tools without touching core code
timestampExtension({
  registerTool: (tool) => registry.registerTool(tool),
  listTools: () => registry.listTools(),
});

console.log(`After extension:  [${registry.listTools().join(", ")}]\n`);

// Execute the extension-provided tool
for (const format of ["iso", "unix", "human"] as const) {
  const result = registry.executeTool("timestamp", { format });
  printEvent("EXEC", `timestamp(${format}) => ${result}`);
}
