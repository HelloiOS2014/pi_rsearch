/**
 * Demo 07 — Pi-style approach: manual agentic loop
 *
 * Task: "Read a file, count lines, report the result"
 * Shows: explicit while loop, manual tool definitions, event emission at each step.
 * You control every step of the process.
 */

import { printSection, printEvent } from "@pi-tutorial/shared";

// ── Tool definitions (explicit, you own them) ──────────────────────────
const tools = [
  {
    name: "read_file",
    description: "Read the contents of a file",
    input_schema: {
      type: "object" as const,
      properties: { path: { type: "string" as const } },
      required: ["path"],
    },
  },
  {
    name: "count_lines",
    description: "Count the number of lines in text",
    input_schema: {
      type: "object" as const,
      properties: { text: { type: "string" as const } },
      required: ["text"],
    },
  },
];

// ── Mock tool executor ─────────────────────────────────────────────────
function executeTool(name: string, input: Record<string, string>): string {
  if (name === "read_file") {
    return "line 1\nline 2\nline 3\nline 4\nline 5\n";
  }
  if (name === "count_lines") {
    const count = input.text.split("\n").filter(Boolean).length;
    return `The file has ${count} lines.`;
  }
  return `Unknown tool: ${name}`;
}

// ── Event emitter (you control what gets emitted) ──────────────────────
type EventHandler = (data: Record<string, unknown>) => void;
const listeners: Record<string, EventHandler[]> = {};

function on(event: string, handler: EventHandler) {
  (listeners[event] ??= []).push(handler);
}

function emit(event: string, data: Record<string, unknown>) {
  for (const handler of listeners[event] ?? []) handler(data);
}

// ── Register event listeners ───────────────────────────────────────────
on("loop_start", () => printEvent("LOOP", "Agent loop started"));
on("tool_call", (d) => printEvent("TOOL_CALL", `${d.name}(${JSON.stringify(d.input)})`));
on("tool_result", (d) => printEvent("TOOL_RESULT", String(d.result).slice(0, 80)));
on("done", (d) => printEvent("DONE", String(d.message)));

// ── The agentic loop — fully explicit ──────────────────────────────────
async function piStyleAgent(task: string) {
  printSection("Pi-Style: Manual Agentic Loop");
  console.log(`Task: ${task}\n`);

  // Simulated plan: the LLM would decide these steps
  const plan: Array<{ tool: string; input: Record<string, string> }> = [
    { tool: "read_file", input: { path: "data.txt" } },
    { tool: "count_lines", input: { text: "" } },  // filled after step 1
  ];

  let lastResult = "";
  emit("loop_start", {});

  // While loop — you see and control every iteration
  let step = 0;
  while (step < plan.length) {
    const action = plan[step];

    // If count_lines, feed the previous result
    if (action.tool === "count_lines") {
      action.input.text = lastResult;
    }

    emit("tool_call", { name: action.tool, input: action.input });
    lastResult = executeTool(action.tool, action.input);
    emit("tool_result", { result: lastResult });

    step++;
  }

  emit("done", { message: lastResult });
}

// ── Run ────────────────────────────────────────────────────────────────
piStyleAgent("Read data.txt, count lines, report the result");
