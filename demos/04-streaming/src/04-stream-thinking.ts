/**
 * Demo 04-04: Stream Thinking — 流式展示 Claude 的思维过程
 *
 * 使用 extended thinking (thinking budget) 让 Claude 先思考再回答。
 * 流式传输 thinking_delta 事件，用灰色文字展示推理过程，
 * 最终回复用正常颜色展示。
 *
 * 事件序列: thinking_start → thinking_delta(n) → thinking_end → text_start → text_delta(n) → done
 *
 * 运行: npx tsx src/04-stream-thinking.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, isMockMode, printSection, printEvent } from "@pi-tutorial/shared";

// ── ANSI color helpers ──────────────────────────────────────────
const DIM = "\x1b[2m";       // dimmed/gray text
const RESET = "\x1b[0m";     // reset to normal
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";

// ── Stream thinking with real API ───────────────────────────────
async function streamThinkingWithApi(client: Anthropic): Promise<void> {
  printSection("Streaming Thinking + Response (思维链流式输出)");

  printEvent("STREAM_START", "Sending request with extended thinking...");
  console.log("");

  let thinkingDeltaCount = 0;
  let textDeltaCount = 0;
  let thinkingChars = 0;
  let responseChars = 0;
  const startTime = Date.now();
  let thinkingStartTime: number | null = null;
  let thinkingEndTime: number | null = null;
  let firstTextTime: number | null = null;

  const stream = await client.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 16000,
    thinking: {
      type: "enabled",
      budget_tokens: 5000,
    },
    messages: [
      {
        role: "user",
        content: "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Think step by step.",
      },
    ],
    stream: true,
  });

  for await (const event of stream) {
    switch (event.type) {
      case "content_block_start": {
        if (event.content_block.type === "thinking") {
          thinkingStartTime = Date.now();
          printEvent("THINKING_START", "Claude is reasoning...");
          process.stdout.write(`  ${DIM}`);
        } else if (event.content_block.type === "text") {
          firstTextTime = Date.now();
          printEvent("TEXT_START", "Final response beginning...");
          process.stdout.write(`  ${GREEN}`);
        }
        break;
      }

      case "content_block_delta": {
        if (event.delta.type === "thinking_delta") {
          process.stdout.write(event.delta.thinking);
          thinkingChars += event.delta.thinking.length;
          thinkingDeltaCount++;
        } else if (event.delta.type === "text_delta") {
          process.stdout.write(event.delta.text);
          responseChars += event.delta.text.length;
          textDeltaCount++;
        }
        break;
      }

      case "content_block_stop": {
        process.stdout.write(RESET);
        console.log("");
        if (thinkingEndTime === null && thinkingStartTime !== null) {
          thinkingEndTime = Date.now();
          printEvent("THINKING_END", `${thinkingDeltaCount} deltas, ${thinkingChars} chars`);
        }
        break;
      }

      case "message_stop":
        break;
    }
  }

  const endTime = Date.now();

  // ── Statistics ────────────────────────────────────────────
  printSection("Thinking Stream Statistics (思维流统计)");

  console.log(`  ${CYAN}Thinking phase:${RESET}`);
  console.log(`    Deltas received:       ${thinkingDeltaCount}`);
  console.log(`    Characters:            ${thinkingChars}`);
  console.log(`    Duration:              ${thinkingEndTime && thinkingStartTime ? thinkingEndTime - thinkingStartTime : "N/A"}ms`);
  console.log("");
  console.log(`  ${GREEN}Response phase:${RESET}`);
  console.log(`    Deltas received:       ${textDeltaCount}`);
  console.log(`    Characters:            ${responseChars}`);
  console.log(`    Time to first text:    ${firstTextTime ? firstTextTime - startTime : "N/A"}ms`);
  console.log("");
  console.log(`  Total time:              ${endTime - startTime}ms`);
}

// ── Mock Mode ───────────────────────────────────────────────────
async function streamThinkingMock(): Promise<void> {
  printSection("Streaming Thinking + Response — Mock Mode (思维链流式输出)");

  // Simulate the thinking process
  const thinkingText =
    "Let me work through this step by step.\n" +
    "Let x = cost of the ball\n" +
    "Then the bat costs x + $1.00\n" +
    "Total: x + (x + $1.00) = $1.10\n" +
    "2x + $1.00 = $1.10\n" +
    "2x = $0.10\n" +
    "x = $0.05\n" +
    "So the ball costs $0.05 (5 cents).\n" +
    "Check: bat = $1.05, ball = $0.05, total = $1.10. The bat costs $1.00 more. Correct!";

  const responseText =
    "The ball costs **$0.05** (5 cents).\n\n" +
    "Here's the reasoning:\n" +
    "- Let the ball's cost = x\n" +
    "- The bat costs $1.00 more than the ball, so bat = x + $1.00\n" +
    "- Together: x + (x + $1.00) = $1.10\n" +
    "- Solving: 2x = $0.10, so x = $0.05\n\n" +
    "Many people intuitively answer $0.10, but that would make the bat $1.10 and the total $1.20.";

  const startTime = Date.now();

  // ── Thinking phase ──────────────────────────────────────
  printEvent("THINKING_START", "Claude is reasoning...");
  process.stdout.write(`  ${DIM}`);

  let thinkingDeltaCount = 0;
  const thinkingWords = thinkingText.split(" ");
  for (const word of thinkingWords) {
    process.stdout.write(word + " ");
    thinkingDeltaCount++;
    await new Promise((r) => setTimeout(r, 25));
  }

  process.stdout.write(RESET);
  console.log("");
  const thinkingEndTime = Date.now();
  printEvent("THINKING_END", `${thinkingDeltaCount} deltas, ${thinkingText.length} chars`);

  // ── Response phase ──────────────────────────────────────
  const firstTextTime = Date.now();
  printEvent("TEXT_START", "Final response beginning...");
  process.stdout.write(`  ${GREEN}`);

  let textDeltaCount = 0;
  const responseWords = responseText.split(" ");
  for (const word of responseWords) {
    process.stdout.write(word + " ");
    textDeltaCount++;
    await new Promise((r) => setTimeout(r, 30));
  }

  process.stdout.write(RESET);
  console.log("");

  const endTime = Date.now();

  // ── Statistics ────────────────────────────────────────────
  printSection("Thinking Stream Statistics (思维流统计)");

  console.log(`  ${CYAN}Thinking phase:${RESET}`);
  console.log(`    Deltas received:       ${thinkingDeltaCount}`);
  console.log(`    Characters:            ${thinkingText.length}`);
  console.log(`    Duration:              ${thinkingEndTime - startTime}ms`);
  console.log("");
  console.log(`  ${GREEN}Response phase:${RESET}`);
  console.log(`    Deltas received:       ${textDeltaCount}`);
  console.log(`    Characters:            ${responseText.length}`);
  console.log(`    Time to first text:    ${firstTextTime - startTime}ms`);
  console.log("");
  console.log(`  Total time:              ${endTime - startTime}ms`);
}

// ── Main ────────────────────────────────────────────────────────
printSection("Demo 04-04: Stream Thinking (流式思维链)");

if (isMockMode()) {
  console.log("[Mock 模式 — 使用模拟流]\n");
  await streamThinkingMock();
} else {
  const client = new Anthropic({ apiKey: getApiKey("anthropic") });
  await streamThinkingWithApi(client);
}

// ── Event sequence diagram ──────────────────────────────────────
printSection("Event Sequence (事件序列)");

console.log("  message_start");
console.log("    |");
console.log(`    ├── content_block_start ${DIM}(type: thinking)${RESET}`);
console.log(`    │     ├── thinking_delta  ${DIM}"Let me work..."${RESET}`);
console.log(`    │     ├── thinking_delta  ${DIM}"Step 1: ..."${RESET}`);
console.log(`    │     ├── thinking_delta  ${DIM}"Therefore..."${RESET}`);
console.log("    │     └── content_block_stop");
console.log("    │");
console.log(`    ├── content_block_start ${GREEN}(type: text)${RESET}`);
console.log(`    │     ├── text_delta      ${GREEN}"The ball..."${RESET}`);
console.log(`    │     ├── text_delta      ${GREEN}"costs $0.05"${RESET}`);
console.log("    │     └── content_block_stop");
console.log("    |");
console.log("  message_stop\n");

printSection("Key Learning");
console.log("  Extended Thinking 的流式特点：");
console.log("  1. 思维过程和最终回复是独立的 content blocks");
console.log("  2. thinking_delta 先到达 — 可以用灰色展示");
console.log("  3. text_delta 后到达 — 用正常颜色展示最终答案");
console.log("  4. 思维 token 通常比回复 token 多很多");
console.log("  5. 用户可以看到 AI '在想什么' — 增加信任感");
