/**
 * Demo 05-04: Unified Thinking Level Across Providers
 *
 * Different providers expose "thinking" / "reasoning" with different
 * parameter names and value ranges. We define a single ThinkingLevel
 * enum and map it to each provider's native config.
 */

import { printSection, printEvent } from "@pi-tutorial/shared";

// ── Thinking level abstraction ──────────────────────────────────────

export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

/**
 * Anthropic: uses `thinking.budget_tokens` with an effort level.
 * The "thinking" feature must be enabled and a budget set.
 */
interface AnthropicThinkingConfig {
  thinking: { type: "enabled"; budget_tokens: number } | { type: "disabled" };
}

/**
 * OpenAI: uses `reasoning_effort` parameter (low, medium, high).
 */
interface OpenAIThinkingConfig {
  reasoning_effort?: "low" | "medium" | "high";
}

/**
 * Google: uses `thinking_config` with a thinking budget.
 */
interface GoogleThinkingConfig {
  thinking_config?: { thinking_budget: number } | { include_thoughts: false };
}

// ── Mapping tables ──────────────────────────────────────────────────

const ANTHROPIC_THINKING_MAP: Record<ThinkingLevel, AnthropicThinkingConfig> = {
  off:     { thinking: { type: "disabled" } },
  minimal: { thinking: { type: "enabled", budget_tokens: 1024 } },
  low:     { thinking: { type: "enabled", budget_tokens: 2048 } },
  medium:  { thinking: { type: "enabled", budget_tokens: 4096 } },
  high:    { thinking: { type: "enabled", budget_tokens: 8192 } },
  xhigh:   { thinking: { type: "enabled", budget_tokens: 16384 } },
};

const OPENAI_THINKING_MAP: Record<ThinkingLevel, OpenAIThinkingConfig> = {
  off:     {},
  minimal: { reasoning_effort: "low" },
  low:     { reasoning_effort: "low" },
  medium:  { reasoning_effort: "medium" },
  high:    { reasoning_effort: "high" },
  xhigh:   { reasoning_effort: "high" },
};

const GOOGLE_THINKING_MAP: Record<ThinkingLevel, GoogleThinkingConfig> = {
  off:     { thinking_config: { include_thoughts: false } },
  minimal: { thinking_config: { thinking_budget: 1024 } },
  low:     { thinking_config: { thinking_budget: 2048 } },
  medium:  { thinking_config: { thinking_budget: 4096 } },
  high:    { thinking_config: { thinking_budget: 8192 } },
  xhigh:   { thinking_config: { thinking_budget: 16384 } },
};

// ── Unified mapping function ────────────────────────────────────────

export function getThinkingConfig(
  level: ThinkingLevel,
  provider: string,
): Record<string, unknown> {
  switch (provider) {
    case "anthropic":
      return ANTHROPIC_THINKING_MAP[level] as unknown as Record<string, unknown>;
    case "openai":
      return OPENAI_THINKING_MAP[level] as unknown as Record<string, unknown>;
    case "google":
      return GOOGLE_THINKING_MAP[level] as unknown as Record<string, unknown>;
    default:
      console.warn(`Unknown provider "${provider}" — thinking disabled`);
      return {};
  }
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  printSection("Demo 05-04: Unified Thinking Level Across Providers");

  console.log("ThinkingLevel: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'");
  console.log();

  // Show the full mapping table
  printSection("Mapping Table");

  const levels: ThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh"];
  const providers = ["anthropic", "openai", "google"];

  // Header
  console.log(
    "Level".padEnd(10) +
    "Anthropic".padEnd(30) +
    "OpenAI".padEnd(25) +
    "Google",
  );
  console.log("-".repeat(95));

  for (const level of levels) {
    const anthropic = ANTHROPIC_THINKING_MAP[level];
    const openai = OPENAI_THINKING_MAP[level];
    const google = GOOGLE_THINKING_MAP[level];

    const anthropicStr =
      anthropic.thinking.type === "disabled"
        ? "disabled"
        : `budget: ${anthropic.thinking.budget_tokens}`;

    const openaiStr = openai.reasoning_effort ?? "—";

    const googleConfig = google.thinking_config;
    const googleStr =
      googleConfig && "thinking_budget" in googleConfig
        ? `budget: ${googleConfig.thinking_budget}`
        : "disabled";

    console.log(
      level.padEnd(10) +
      anthropicStr.padEnd(30) +
      openaiStr.padEnd(25) +
      googleStr,
    );
  }

  // Show concrete example
  printSection('Example: thinking = "high"');

  const level: ThinkingLevel = "high";

  for (const provider of providers) {
    const config = getThinkingConfig(level, provider);
    console.log(`\n${provider}:`);
    console.log(`  API params: ${JSON.stringify(config, null, 4).split("\n").join("\n  ")}`);
    printEvent("MAP", `thinking="${level}" → ${provider} config applied`);
  }

  // Show how it would be used in a unified call
  printSection("Usage in Unified API");

  console.log("// Set thinking level once:");
  console.log('const thinkingLevel: ThinkingLevel = "high";');
  console.log();
  console.log("// Each provider receives the right config:");
  console.log("const params = {");
  console.log("  model: selectedModel,");
  console.log("  messages,");
  console.log("  ...getThinkingConfig(thinkingLevel, provider),");
  console.log("};");
  console.log();
  console.log("// Result: provider-specific thinking params are injected automatically.");

  printSection("Key Insight");
  console.log("One thinking level controls ALL providers.");
  console.log('  thinking="high" →');
  console.log("    Anthropic: budget_tokens=8192");
  console.log("    OpenAI:    reasoning_effort='high'");
  console.log("    Google:    thinking_budget=8192");
  console.log("\nUsers don't need to know provider-specific parameter names.");
}

main().catch(console.error);
