/**
 * Demo 05-05: Token Counting and Cost Calculation
 *
 * Track tokens and costs across providers and models.
 * Essential for budgeting and optimizing LLM usage.
 */

import { printSection, printEvent } from "@pi-tutorial/shared";

// ── Cost table ──────────────────────────────────────────────────────

interface ModelCost {
  inputPerMillion: number;   // $ per 1M input tokens
  outputPerMillion: number;  // $ per 1M output tokens
  provider: string;
}

const MODEL_COSTS: Record<string, ModelCost> = {
  // Anthropic
  "claude-sonnet-4-5-20250514": { inputPerMillion: 3.0, outputPerMillion: 15.0, provider: "anthropic" },
  "claude-haiku-3-5-20241022": { inputPerMillion: 0.8, outputPerMillion: 4.0, provider: "anthropic" },
  "claude-opus-4-20250514": { inputPerMillion: 15.0, outputPerMillion: 75.0, provider: "anthropic" },

  // OpenAI
  "gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10.0, provider: "openai" },
  "gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6, provider: "openai" },
  "o1": { inputPerMillion: 15.0, outputPerMillion: 60.0, provider: "openai" },

  // Google
  "gemini-2.0-flash": { inputPerMillion: 0.1, outputPerMillion: 0.4, provider: "google" },
  "gemini-2.5-pro": { inputPerMillion: 1.25, outputPerMillion: 10.0, provider: "google" },
};

// ── Cost calculation ────────────────────────────────────────────────

interface Usage {
  inputTokens: number;
  outputTokens: number;
}

interface CostResult {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
  usage: Usage;
}

export function calculateCost(model: string, usage: Usage): CostResult {
  const cost = MODEL_COSTS[model];
  if (!cost) {
    return {
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      model,
      usage,
    };
  }

  const inputCost = (usage.inputTokens / 1_000_000) * cost.inputPerMillion;
  const outputCost = (usage.outputTokens / 1_000_000) * cost.outputPerMillion;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    model,
    usage,
  };
}

function formatCost(dollars: number): string {
  if (dollars < 0.01) return `$${dollars.toFixed(6)}`;
  return `$${dollars.toFixed(4)}`;
}

function formatTokens(count: number): string {
  return count.toLocaleString();
}

function formatCostLine(result: CostResult): string {
  return [
    `Input: ${formatTokens(result.usage.inputTokens)} tokens (${formatCost(result.inputCost)})`,
    `Output: ${formatTokens(result.usage.outputTokens)} tokens (${formatCost(result.outputCost)})`,
    `Total: ${formatCost(result.totalCost)}`,
  ].join(" | ");
}

// ── Conversation cost tracker ───────────────────────────────────────

class CostTracker {
  private turns: CostResult[] = [];

  addTurn(model: string, usage: Usage): CostResult {
    const result = calculateCost(model, usage);
    this.turns.push(result);
    return result;
  }

  get totalCost(): number {
    return this.turns.reduce((sum, t) => sum + t.totalCost, 0);
  }

  get totalInputTokens(): number {
    return this.turns.reduce((sum, t) => sum + t.usage.inputTokens, 0);
  }

  get totalOutputTokens(): number {
    return this.turns.reduce((sum, t) => sum + t.usage.outputTokens, 0);
  }

  printSummary(): void {
    console.log(`\nConversation Summary:`);
    console.log(`  Turns: ${this.turns.length}`);
    console.log(`  Total input tokens:  ${formatTokens(this.totalInputTokens)}`);
    console.log(`  Total output tokens: ${formatTokens(this.totalOutputTokens)}`);
    console.log(`  Total cost:          ${formatCost(this.totalCost)}`);
  }
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  printSection("Demo 05-05: Token Counting & Cost Calculation");

  // Show the cost table
  console.log("Model Cost Table (per 1M tokens):\n");
  console.log(
    "Model".padEnd(35) +
    "Provider".padEnd(12) +
    "Input".padEnd(10) +
    "Output",
  );
  console.log("-".repeat(70));

  for (const [model, cost] of Object.entries(MODEL_COSTS)) {
    console.log(
      model.padEnd(35) +
      cost.provider.padEnd(12) +
      `$${cost.inputPerMillion.toFixed(2)}`.padEnd(10) +
      `$${cost.outputPerMillion.toFixed(2)}`,
    );
  }

  // Simulate a multi-turn conversation
  printSection("Simulated Conversation Cost Tracking");

  const tracker = new CostTracker();

  const turns = [
    { model: "claude-sonnet-4-5-20250514", usage: { inputTokens: 1234, outputTokens: 567 } },
    { model: "claude-sonnet-4-5-20250514", usage: { inputTokens: 2100, outputTokens: 892 } },
    { model: "claude-sonnet-4-5-20250514", usage: { inputTokens: 3500, outputTokens: 1203 } },
    { model: "claude-sonnet-4-5-20250514", usage: { inputTokens: 5200, outputTokens: 445 } },
  ];

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    const result = tracker.addTurn(turn.model, turn.usage);
    printEvent(`TURN ${i + 1}`, formatCostLine(result));
  }

  tracker.printSummary();

  // Compare models for the same task
  printSection("Cost Comparison: Same Task, Different Models");

  const taskUsage: Usage = { inputTokens: 2000, outputTokens: 800 };

  console.log(`Task: 2,000 input tokens, 800 output tokens\n`);

  const comparisonModels = [
    "claude-opus-4-20250514",
    "claude-sonnet-4-5-20250514",
    "claude-haiku-3-5-20241022",
    "gpt-4o",
    "gpt-4o-mini",
    "gemini-2.0-flash",
  ];

  const results = comparisonModels
    .map((model) => calculateCost(model, taskUsage))
    .sort((a, b) => a.totalCost - b.totalCost);

  for (const result of results) {
    const bar = "#".repeat(Math.ceil(result.totalCost * 1000));
    console.log(
      `  ${result.model.padEnd(35)} ${formatCost(result.totalCost).padEnd(12)} ${bar}`,
    );
  }

  // Show cost of a full coding session
  printSection("Projected Session Costs");

  const scenarios = [
    { name: "Quick question (5 turns)", turns: 5, avgInput: 1500, avgOutput: 600 },
    { name: "Bug investigation (20 turns)", turns: 20, avgInput: 3000, avgOutput: 1200 },
    { name: "Feature build (50 turns)", turns: 50, avgInput: 5000, avgOutput: 2000 },
  ];

  for (const scenario of scenarios) {
    const totalUsage: Usage = {
      inputTokens: scenario.turns * scenario.avgInput,
      outputTokens: scenario.turns * scenario.avgOutput,
    };

    const sonnet = calculateCost("claude-sonnet-4-5-20250514", totalUsage);
    const haiku = calculateCost("claude-haiku-3-5-20241022", totalUsage);

    console.log(`\n${scenario.name}:`);
    console.log(`  Claude Sonnet: ${formatCost(sonnet.totalCost)}`);
    console.log(`  Claude Haiku:  ${formatCost(haiku.totalCost)} (${((haiku.totalCost / sonnet.totalCost) * 100).toFixed(0)}% of Sonnet)`);
  }

  printSection("Key Insight");
  console.log("Cost tracking enables informed model selection:");
  console.log("  - Use expensive models (Opus) for complex reasoning");
  console.log("  - Use cheap models (Haiku, Flash) for simple tasks");
  console.log("  - Monitor cumulative costs across a session");
  console.log("  - Set budget limits to prevent runaway costs");
}

main().catch(console.error);
