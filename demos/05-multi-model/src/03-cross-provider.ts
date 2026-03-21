/**
 * Demo 05-03: Cross-Provider Message Transformation
 *
 * When switching providers mid-conversation, messages need to be
 * transformed. Provider-specific features (thinking blocks, tool IDs)
 * must be normalized or converted.
 */

import { printSection, printEvent } from "@pi-tutorial/shared";

// ── Message types ───────────────────────────────────────────────────

interface ThinkingBlock {
  type: "thinking";
  thinking: string;
}

interface TextBlock {
  type: "text";
  text: string;
}

interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
}

type ContentBlock = ThinkingBlock | TextBlock | ToolUseBlock | ToolResultBlock;

interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

// ── Transform functions ─────────────────────────────────────────────

/**
 * Normalize tool call IDs across providers.
 *
 * Anthropic uses: "toolu_01ABC..."  (26 chars)
 * OpenAI uses:    "call_ABC..."     (variable length)
 * Google uses:    function call names directly
 *
 * We normalize to a consistent format when switching providers.
 */
function normalizeToolId(id: string, toProvider: string): string {
  switch (toProvider) {
    case "anthropic":
      // Anthropic expects "toolu_" prefix
      if (id.startsWith("toolu_")) return id;
      return `toolu_${id.replace(/^call_/, "").slice(0, 20).padEnd(20, "0")}`;

    case "openai":
      // OpenAI expects "call_" prefix
      if (id.startsWith("call_")) return id;
      return `call_${id.replace(/^toolu_/, "").slice(0, 24)}`;

    default:
      return id;
  }
}

/**
 * Convert thinking blocks when switching providers.
 *
 * - Same provider: keep thinking blocks as-is
 * - Different provider: convert to text blocks (most providers don't support thinking)
 */
function convertThinkingBlock(
  block: ThinkingBlock,
  fromProvider: string,
  toProvider: string,
): ContentBlock {
  if (fromProvider === toProvider) {
    return block; // Keep as-is
  }

  // Convert thinking to a text block for other providers
  return {
    type: "text",
    text: `[Internal reasoning]: ${block.thinking}`,
  };
}

/**
 * Find orphaned tool calls — tool_use blocks without matching tool_result.
 * Insert synthetic error results so the conversation stays valid.
 */
function fixOrphanedToolCalls(messages: Message[]): Message[] {
  const result: Message[] = [];

  // Collect all tool_use IDs and tool_result IDs
  const toolUseIds = new Set<string>();
  const toolResultIds = new Set<string>();

  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "tool_use") toolUseIds.add(block.id);
        if (block.type === "tool_result") toolResultIds.add(block.tool_use_id);
      }
    }
  }

  // Find orphans: tool_use without matching tool_result
  const orphanIds = [...toolUseIds].filter((id) => !toolResultIds.has(id));

  // Copy messages, inserting synthetic results after orphaned tool calls
  for (const msg of messages) {
    result.push(msg);

    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      const orphansInMsg = msg.content
        .filter((b): b is ToolUseBlock => b.type === "tool_use" && orphanIds.includes(b.id));

      if (orphansInMsg.length > 0) {
        // Insert a user message with synthetic tool results
        result.push({
          role: "user",
          content: orphansInMsg.map((toolUse) => ({
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: `[Error: Tool call to "${toolUse.name}" was not executed — provider switch occurred]`,
          })),
        });
      }
    }
  }

  return result;
}

/**
 * Transform a full conversation when switching providers.
 */
export function transformMessages(
  messages: Message[],
  fromProvider: string,
  toProvider: string,
): Message[] {
  let transformed = messages.map((msg) => {
    if (typeof msg.content === "string") return msg;

    const newContent: ContentBlock[] = msg.content.map((block) => {
      switch (block.type) {
        case "thinking":
          return convertThinkingBlock(block, fromProvider, toProvider);

        case "tool_use":
          return {
            ...block,
            id: normalizeToolId(block.id, toProvider),
          };

        case "tool_result":
          return {
            ...block,
            tool_use_id: normalizeToolId(block.tool_use_id, toProvider),
          };

        default:
          return block;
      }
    });

    return { ...msg, content: newContent };
  });

  // Fix any orphaned tool calls
  transformed = fixOrphanedToolCalls(transformed);

  return transformed;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  printSection("Demo 05-03: Cross-Provider Message Transformation");

  // Example conversation with Anthropic-specific features
  const conversation: Message[] = [
    {
      role: "user",
      content: "What's the weather in San Francisco?",
    },
    {
      role: "assistant",
      content: [
        {
          type: "thinking",
          thinking: "The user wants weather data. I should use the get_weather tool.",
        },
        {
          type: "text",
          text: "Let me check the weather for you.",
        },
        {
          type: "tool_use",
          id: "toolu_01ABCdef123456789012",
          name: "get_weather",
          input: { city: "San Francisco" },
        },
      ],
    },
    {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: "toolu_01ABCdef123456789012",
          content: '{"temp": 62, "condition": "foggy"}',
        },
      ],
    },
    {
      role: "assistant",
      content: [
        {
          type: "text",
          text: "It's 62°F and foggy in San Francisco.",
        },
      ],
    },
  ];

  console.log("Original conversation (Anthropic format):");
  console.log(JSON.stringify(conversation, null, 2));

  // Transform to OpenAI
  printSection("Transform: Anthropic → OpenAI");

  const openaiMessages = transformMessages(conversation, "anthropic", "openai");
  console.log(JSON.stringify(openaiMessages, null, 2));

  // Highlight the changes
  printEvent("THINKING", "Converted to [Internal reasoning] text block");
  printEvent("TOOL_ID", 'toolu_01ABCdef... → call_01ABCdef...');

  // Example with orphaned tool call
  printSection("Handling Orphaned Tool Calls");

  const orphanedConversation: Message[] = [
    { role: "user", content: "Search for TypeScript tutorials" },
    {
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: "toolu_orphan123456789012345",
          name: "web_search",
          input: { query: "TypeScript tutorials" },
        },
      ],
    },
    // No tool_result! The tool call was never executed.
    // This happens when switching providers mid-conversation.
  ];

  console.log("Conversation with orphaned tool call:");
  console.log(JSON.stringify(orphanedConversation, null, 2));

  const fixed = transformMessages(orphanedConversation, "anthropic", "openai");
  console.log("\nAfter fixOrphanedToolCalls:");
  console.log(JSON.stringify(fixed, null, 2));

  printEvent("FIX", "Inserted synthetic tool_result for orphaned web_search call");

  printSection("Key Insight");
  console.log("Cross-provider switching requires three transformations:");
  console.log("  1. Thinking blocks  → convert to text for non-supporting providers");
  console.log("  2. Tool call IDs    → normalize to target provider's format");
  console.log("  3. Orphaned calls   → insert synthetic error results");
  console.log("\nWithout these, the conversation would be rejected by the target API.");
}

main().catch(console.error);
