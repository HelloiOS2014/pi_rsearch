/**
 * Demo 07 — Vercel AI SDK style (simulated): one-liner convenience
 *
 * Task: "Read a file, count lines, report the result"
 * Shows: streamText() one-liner — framework handles the loop internally.
 * Convenience vs control tradeoff.
 *
 * No real Vercel AI SDK dependency — we simulate the pattern.
 */

import { printSection, printEvent } from "@pi-tutorial/shared";

// ── Simulated Vercel AI SDK types ──────────────────────────────────────
interface ToolDef {
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, string>) => Promise<string>;
}

interface StreamTextOptions {
  model: string;
  system: string;
  prompt: string;
  tools: Record<string, ToolDef>;
  maxSteps: number;
}

// ── Simulated streamText — the framework handles the loop ──────────────
async function streamText(options: StreamTextOptions) {
  printEvent("STREAM", `model=${options.model}, maxSteps=${options.maxSteps}`);

  // Internally, the framework runs the agentic loop for you
  const steps: Array<{ tool: string; args: Record<string, string> }> = [
    { tool: "readFile", args: { path: "data.txt" } },
    { tool: "countLines", args: { text: "" } },
  ];

  const results: string[] = [];

  for (let i = 0; i < Math.min(steps.length, options.maxSteps); i++) {
    const step = steps[i];
    const tool = options.tools[step.tool];
    if (!tool) continue;

    if (step.tool === "countLines" && results.length > 0) {
      step.args.text = results[results.length - 1];
    }

    printEvent("STEP", `${i + 1}/${options.maxSteps}: ${step.tool}`);
    const result = await tool.execute(step.args);
    results.push(result);
  }

  return {
    text: results[results.length - 1] ?? "No result",
    steps: results.length,
  };
}

// ── The one-liner approach ─────────────────────────────────────────────
async function main() {
  printSection("Vercel AI Style: One-liner streamText()");
  console.log("Just call streamText() — the framework handles everything.\n");

  // This is all you write — one function call
  const result = await streamText({
    model: "claude-sonnet-4-20250514",
    system: "You are a helpful file analysis assistant.",
    prompt: "Read data.txt, count lines, report the result",
    tools: {
      readFile: {
        description: "Read a file",
        parameters: { path: { type: "string" } },
        execute: async () => "line 1\nline 2\nline 3\nline 4\nline 5\n",
      },
      countLines: {
        description: "Count lines in text",
        parameters: { text: { type: "string" } },
        execute: async (args) => {
          const count = args.text.split("\n").filter(Boolean).length;
          return `The file has ${count} lines.`;
        },
      },
    },
    maxSteps: 5,
  });

  printEvent("RESULT", `${result.text} (completed in ${result.steps} steps)`);
}

main();
