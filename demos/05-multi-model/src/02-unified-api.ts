/**
 * Demo 05-02: Unified API — Provider Registry
 *
 * Build a registry that dispatches to the right adapter based on
 * a provider name. This is how a multi-model system picks the right
 * backend without callers needing to know the specifics.
 */

import { printSection, printEvent } from "@pi-tutorial/shared";
import type { UnifiedStreamEvent, StreamConfig } from "./01-provider-adapter.js";
import { streamMock } from "./01-provider-adapter.js";

// ── Provider registry ───────────────────────────────────────────────

type StreamFn = (config: StreamConfig) => AsyncIterable<UnifiedStreamEvent>;

export class ProviderRegistry {
  private providers = new Map<string, StreamFn>();

  /** Register a provider adapter under a name */
  register(name: string, streamFn: StreamFn): void {
    this.providers.set(name, streamFn);
    console.log(`  Registered provider: "${name}"`);
  }

  /** List all registered providers */
  list(): string[] {
    return [...this.providers.keys()];
  }

  /** Stream from a specific provider */
  async *stream(
    provider: string,
    model: string,
    messages: StreamConfig["messages"],
    options?: { maxTokens?: number },
  ): AsyncIterable<UnifiedStreamEvent> {
    const streamFn = this.providers.get(provider);
    if (!streamFn) {
      throw new Error(
        `Unknown provider "${provider}". Available: ${this.list().join(", ")}`,
      );
    }

    yield* streamFn({
      model,
      messages,
      maxTokens: options?.maxTokens,
    });
  }
}

// ── Mock adapters for each provider ─────────────────────────────────

async function* mockOpenAIStream(
  config: StreamConfig,
): AsyncIterable<UnifiedStreamEvent> {
  const response = `[OpenAI/${config.model}] Mock response for: "${config.messages.at(-1)?.content}"`;
  const words = response.split(" ");
  let fullText = "";

  for (const word of words) {
    const delta = word + " ";
    fullText += delta;
    yield { type: "text_delta", delta };
    await new Promise((r) => setTimeout(r, 20));
  }

  yield {
    type: "done",
    text: fullText.trim(),
    usage: { inputTokens: 30, outputTokens: words.length * 3 },
  };
}

async function* mockGoogleStream(
  config: StreamConfig,
): AsyncIterable<UnifiedStreamEvent> {
  const response = `[Google/${config.model}] Mock response for: "${config.messages.at(-1)?.content}"`;
  const words = response.split(" ");
  let fullText = "";

  for (const word of words) {
    const delta = word + " ";
    fullText += delta;
    yield { type: "text_delta", delta };
    await new Promise((r) => setTimeout(r, 20));
  }

  yield {
    type: "done",
    text: fullText.trim(),
    usage: { inputTokens: 28, outputTokens: words.length * 2 },
  };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  printSection("Demo 05-02: Unified API — Provider Registry");

  // Build the registry
  console.log("Building provider registry...\n");
  const registry = new ProviderRegistry();

  registry.register("anthropic", streamMock);
  registry.register("openai", mockOpenAIStream);
  registry.register("google", mockGoogleStream);

  console.log(`\nRegistered providers: [${registry.list().join(", ")}]\n`);

  // Dispatch to different providers using the SAME interface
  const messages: StreamConfig["messages"] = [
    { role: "user", content: "Explain async/await in one sentence." },
  ];

  const providers = [
    { name: "anthropic", model: "claude-sonnet-4-5-20250514" },
    { name: "openai", model: "gpt-4o" },
    { name: "google", model: "gemini-2.0-flash" },
  ];

  for (const { name, model } of providers) {
    printSection(`Streaming from: ${name} / ${model}`);

    let fullText = "";
    for await (const event of registry.stream(name, model, messages)) {
      switch (event.type) {
        case "text_delta":
          process.stdout.write(event.delta);
          fullText += event.delta;
          break;
        case "done":
          console.log();
          printEvent("DONE", `${event.usage.inputTokens} in / ${event.usage.outputTokens} out`);
          break;
      }
    }
  }

  // Show error handling for unknown provider
  printSection("Error Handling: Unknown Provider");
  try {
    const gen = registry.stream("mistral", "mistral-large", messages);
    // Consume the first value to trigger the error
    await gen[Symbol.asyncIterator]().next();
  } catch (err) {
    console.log(`Caught: ${(err as Error).message}`);
  }

  printSection("Key Insight");
  console.log("The ProviderRegistry gives you ONE call pattern for ALL providers:");
  console.log('  registry.stream("anthropic", "claude-sonnet-4-5-20250514", messages)');
  console.log('  registry.stream("openai", "gpt-4o", messages)');
  console.log('  registry.stream("google", "gemini-2.0-flash", messages)');
  console.log("\nSwitch models by changing TWO strings — no code changes needed.");
}

main().catch(console.error);
