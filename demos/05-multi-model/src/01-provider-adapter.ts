/**
 * Demo 05-01: Provider Adapter
 *
 * Wrap a single provider (Anthropic) into a unified streaming interface.
 * This is the foundation for multi-provider support — every provider
 * emits the same event types, so consumers never see provider differences.
 */

import Anthropic from "@anthropic-ai/sdk";
import { printSection, printEvent } from "@pi-tutorial/shared";

// ── Unified event types ─────────────────────────────────────────────

export type UnifiedStreamEvent =
  | { type: "text_delta"; delta: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "done"; text: string; usage: { inputTokens: number; outputTokens: number } };

// ── Anthropic adapter ───────────────────────────────────────────────

export interface StreamConfig {
  model: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
}

/**
 * Wraps Anthropic's streaming API into our unified event interface.
 *
 * Mapping:
 *   Anthropic content_block_delta (text)  → UnifiedStreamEvent "text_delta"
 *   Anthropic content_block_delta (tool)  → (accumulated, emitted on stop)
 *   Anthropic message_stop                → UnifiedStreamEvent "done"
 */
export async function* streamAnthropic(
  config: StreamConfig,
): AsyncIterable<UnifiedStreamEvent> {
  const client = new Anthropic();

  const stream = client.messages.stream({
    model: config.model,
    max_tokens: config.maxTokens ?? 1024,
    messages: config.messages,
  });

  let fullText = "";
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const event of stream) {
    // Text delta — the most common event
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      const delta = event.delta.text;
      fullText += delta;
      yield { type: "text_delta", delta };
    }

    // Tool use — accumulate input JSON, emit when the block ends
    if (
      event.type === "content_block_stop"
    ) {
      // Check the accumulated content for tool use blocks
      const message = await stream.finalMessage();
      for (const block of message.content) {
        if (block.type === "tool_use") {
          yield {
            type: "tool_call",
            name: block.name,
            args: block.input as Record<string, unknown>,
          };
        }
      }
    }

    // Usage info comes with the final message
    if (event.type === "message_delta") {
      outputTokens = event.usage?.output_tokens ?? 0;
    }

    if (event.type === "message_start") {
      inputTokens = event.message.usage?.input_tokens ?? 0;
    }
  }

  yield {
    type: "done",
    text: fullText,
    usage: { inputTokens, outputTokens },
  };
}

// ── Mock adapter (for running without API keys) ─────────────────────

export async function* streamMock(
  config: StreamConfig,
): AsyncIterable<UnifiedStreamEvent> {
  const mockResponse = `Hello! I'm a mock ${config.model} response. You asked: "${config.messages.at(-1)?.content}"`;
  const words = mockResponse.split(" ");

  let fullText = "";
  for (const word of words) {
    const delta = word + " ";
    fullText += delta;
    yield { type: "text_delta", delta };
    await new Promise((r) => setTimeout(r, 30));
  }

  yield {
    type: "done",
    text: fullText.trim(),
    usage: { inputTokens: 25, outputTokens: words.length * 2 },
  };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  printSection("Demo 05-01: Provider Adapter — Unified Streaming Interface");

  console.log("UnifiedStreamEvent types:");
  console.log('  { type: "text_delta", delta: string }');
  console.log('  { type: "tool_call", name: string, args: Record }');
  console.log('  { type: "done", text: string, usage: { inputTokens, outputTokens } }');
  console.log();

  // Always use mock adapter for the demo
  printSection("Streaming via Mock Adapter");

  const config: StreamConfig = {
    model: "claude-sonnet-4-5-20250514",
    messages: [{ role: "user", content: "What is TypeScript?" }],
  };

  console.log(`Model: ${config.model}`);
  console.log(`Prompt: "${config.messages[0].content}"\n`);

  let output = "";
  for await (const event of streamMock(config)) {
    switch (event.type) {
      case "text_delta":
        printEvent("TEXT_DELTA", JSON.stringify(event.delta));
        output += event.delta;
        break;
      case "tool_call":
        printEvent("TOOL_CALL", `${event.name}(${JSON.stringify(event.args)})`);
        break;
      case "done":
        printEvent("DONE", `${event.usage.inputTokens} in / ${event.usage.outputTokens} out`);
        break;
    }
  }

  console.log(`\nFull output: "${output.trim()}"`);

  printSection("Key Insight");
  console.log("Every provider adapter emits the SAME event types.");
  console.log("Consumers never need to know which provider is behind the stream.");
  console.log("Next: Demo 02 builds a registry to dispatch to the right adapter.");
}

main().catch(console.error);
