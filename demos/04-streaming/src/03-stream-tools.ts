/**
 * Demo 04-03: Stream Tools — 增量流式工具调用参数
 *
 * 使用 Anthropic streaming 和工具定义，观察工具调用参数如何逐步构建。
 * 实现 parsePartialJson：尝试 JSON.parse，失败时提取已知字段。
 * 展示："Searching for: wea..." → "weather..." → "weather in Tokyo"
 *
 * 运行: npx tsx src/03-stream-tools.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, isMockMode, printSection, printEvent } from "@pi-tutorial/shared";

// ── Partial JSON Parser ─────────────────────────────────────────
// Tool arguments arrive as incomplete JSON fragments during streaming.
// We need to extract whatever we can from partial JSON strings.
function parsePartialJson(incomplete: string): Record<string, unknown> | null {
  // First, try parsing as valid JSON
  try {
    return JSON.parse(incomplete);
  } catch {
    // Not valid JSON yet — try to extract fields
  }

  // Try to close the JSON object and parse
  let attempt = incomplete.trim();
  if (!attempt.endsWith("}")) {
    // Remove trailing incomplete value (e.g., `"query": "weath` → close it)
    // Strategy: add closing quote if in a string, then close braces
    const lastQuoteIdx = attempt.lastIndexOf('"');
    const lastColonIdx = attempt.lastIndexOf(":");

    if (lastColonIdx > -1 && lastQuoteIdx > lastColonIdx) {
      // We're in the middle of a string value
      attempt = attempt + '"}';
    } else if (lastColonIdx > -1) {
      // We're between colon and value, or in a non-string value
      attempt = attempt + 'null}';
    } else {
      attempt = attempt + "}";
    }
  }

  try {
    return JSON.parse(attempt);
  } catch {
    // Still can't parse — extract with regex
  }

  // Fallback: regex extraction for string fields
  const result: Record<string, unknown> = {};
  const fieldPattern = /"(\w+)"\s*:\s*"([^"]*)"?/g;
  let match;
  while ((match = fieldPattern.exec(incomplete)) !== null) {
    result[match[1]] = match[2];
  }

  return Object.keys(result).length > 0 ? result : null;
}

// ── Tool Definitions ────────────────────────────────────────────
const tools: Anthropic.Tool[] = [
  {
    name: "search_web",
    description: "Search the web for information about a topic.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "The search query" },
        max_results: { type: "number", description: "Maximum results to return (default 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_weather",
    description: "Get current weather for a city.",
    input_schema: {
      type: "object" as const,
      properties: {
        city: { type: "string", description: "City name" },
        units: { type: "string", enum: ["celsius", "fahrenheit"], description: "Temperature units" },
      },
      required: ["city"],
    },
  },
];

// ── Stream tools with real API ──────────────────────────────────
async function streamToolsWithApi(client: Anthropic): Promise<void> {
  printSection("Streaming Tool Call Arguments (流式工具参数)");

  printEvent("STREAM_START", "Asking Claude to use tools...");
  console.log("");

  const stream = client.messages.stream({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 1024,
    tools,
    messages: [
      {
        role: "user",
        content: "Search for weather in Tokyo and tell me the results.",
      },
    ],
  });

  let currentToolName = "";
  let accumulatedJson = "";
  let lastDisplayed = "";

  stream.on("inputJson", (partialJson: string) => {
    // partialJson is the accumulated JSON string so far
    accumulatedJson = partialJson;
    const parsed = parsePartialJson(accumulatedJson);

    if (parsed) {
      const display = JSON.stringify(parsed);
      if (display !== lastDisplayed) {
        // Clear line and show progressive argument building
        process.stdout.write(`\r  ${currentToolName}(${display})`);
        lastDisplayed = display;
      }
    }
  });

  stream.on("contentBlock", (block: Anthropic.ContentBlock) => {
    if (block.type === "tool_use") {
      if (currentToolName) {
        console.log(""); // newline after previous tool
      }
      currentToolName = block.name;
      accumulatedJson = "";
      lastDisplayed = "";
      printEvent("TOOL_USE", `${block.name} — final args: ${JSON.stringify(block.input)}`);
    }
  });

  stream.on("text", (text: string) => {
    process.stdout.write(text);
  });

  const finalMessage = await stream.finalMessage();

  console.log("\n");
  printEvent("STREAM_END", `stop_reason=${finalMessage.stop_reason}`);
}

// ── Mock Mode ───────────────────────────────────────────────────
async function streamToolsMock(): Promise<void> {
  printSection("Streaming Tool Call Arguments — Mock Mode (流式工具参数)");

  // Simulate the partial JSON arriving character by character
  const mockPartials = [
    '{"',
    '{"q',
    '{"qu',
    '{"que',
    '{"quer',
    '{"query',
    '{"query"',
    '{"query":',
    '{"query": "',
    '{"query": "w',
    '{"query": "we',
    '{"query": "wea',
    '{"query": "weat',
    '{"query": "weath',
    '{"query": "weathe',
    '{"query": "weather',
    '{"query": "weather ',
    '{"query": "weather i',
    '{"query": "weather in',
    '{"query": "weather in ',
    '{"query": "weather in T',
    '{"query": "weather in To',
    '{"query": "weather in Tok',
    '{"query": "weather in Toky',
    '{"query": "weather in Tokyo',
    '{"query": "weather in Tokyo"',
    '{"query": "weather in Tokyo",',
    '{"query": "weather in Tokyo", "',
    '{"query": "weather in Tokyo", "m',
    '{"query": "weather in Tokyo", "ma',
    '{"query": "weather in Tokyo", "max',
    '{"query": "weather in Tokyo", "max_',
    '{"query": "weather in Tokyo", "max_r',
    '{"query": "weather in Tokyo", "max_re',
    '{"query": "weather in Tokyo", "max_res',
    '{"query": "weather in Tokyo", "max_resu',
    '{"query": "weather in Tokyo", "max_resul',
    '{"query": "weather in Tokyo", "max_result',
    '{"query": "weather in Tokyo", "max_results',
    '{"query": "weather in Tokyo", "max_results"',
    '{"query": "weather in Tokyo", "max_results":',
    '{"query": "weather in Tokyo", "max_results": ',
    '{"query": "weather in Tokyo", "max_results": 5',
    '{"query": "weather in Tokyo", "max_results": 5}',
  ];

  console.log("");
  printEvent("TOOL_USE_START", "search_web — arguments arriving incrementally:");
  console.log("");

  let lastParsed = "";
  for (const partial of mockPartials) {
    const parsed = parsePartialJson(partial);
    if (parsed) {
      const display = JSON.stringify(parsed);
      if (display !== lastParsed) {
        process.stdout.write(`\r  search_web(${display})`);
        lastParsed = display;
      }
    }
    await new Promise((r) => setTimeout(r, 30));
  }

  console.log(""); // newline
  printEvent("TOOL_USE_END", "search_web — final: {\"query\": \"weather in Tokyo\", \"max_results\": 5}");
  console.log("");

  // Show the parsePartialJson behavior
  printSection("parsePartialJson Behavior (部分 JSON 解析)");

  const testCases = [
    '{"query": "wea',
    '{"query": "weather in Tokyo"',
    '{"query": "weather in Tokyo", "max_results": 5}',
    '{"city": "Berlin", "units": "cel',
  ];

  for (const tc of testCases) {
    const result = parsePartialJson(tc);
    console.log(`  Input:  ${tc}`);
    console.log(`  Parsed: ${JSON.stringify(result)}`);
    console.log("");
  }
}

// ── Main ────────────────────────────────────────────────────────
printSection("Demo 04-03: Stream Tools (流式工具调用)");

if (isMockMode()) {
  console.log("[Mock 模式 — 使用模拟流]\n");
  await streamToolsMock();
} else {
  const client = new Anthropic({ apiKey: getApiKey("anthropic") });
  await streamToolsWithApi(client);
}

printSection("How Tool Streaming Works (工具流式原理)");

console.log("  Non-streaming tool call:");
console.log('    Response: { tool_use: { name: "search_web", input: {query: "..."} } }');
console.log("    You get the complete input object all at once.\n");

console.log("  Streaming tool call:");
console.log("    content_block_start  → tool name known");
console.log('    input_json_delta     → \'{"q\'');
console.log('    input_json_delta     → \'uer\'');
console.log('    input_json_delta     → \'y": "weath\'');
console.log("    input_json_delta     → 'er in Tokyo\"}'");
console.log("    content_block_stop   → tool call complete\n");

console.log("  Why stream tool arguments?");
console.log("    - Show progress: user sees what the agent is about to do");
console.log("    - Start preparation: begin loading resources before args complete");
console.log("    - Cancel early: abort if the query looks wrong\n");

printSection("Key Learning");
console.log("  流式工具调用的核心挑战：");
console.log("  1. 参数以 JSON 片段到达 — 需要 partial JSON parser");
console.log("  2. 可以边解析边展示 — 提升用户感知速度");
console.log("  3. content_block_start 就知道工具名 — 可以提前准备");
console.log("  4. inputJson 事件提供累积的 JSON 字符串");
