/**
 * Demo 04-02: Stream Text — 逐字符流式输出 LLM 文本
 *
 * 使用 Anthropic streaming API (client.messages.stream())
 * 订阅 text delta 事件，逐字输出到 stdout，实现打字机效果。
 * 统计：总 token 数、首 token 延迟、总耗时。
 *
 * 运行: npx tsx src/02-stream-text.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, isMockMode, createMockStream, printSection, printEvent } from "@pi-tutorial/shared";

// ── Streaming with real API ─────────────────────────────────────
async function streamWithApi(client: Anthropic): Promise<void> {
  printSection("Streaming Text Output (打字机效果)");

  const startTime = Date.now();
  let firstTokenTime: number | null = null;
  let totalChars = 0;
  let deltaCount = 0;

  printEvent("STREAM_START", "Sending request with streaming enabled...");
  console.log("");

  const stream = client.messages.stream({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: "用3句话解释什么是 streaming（流式传输）。简洁明了。",
      },
    ],
  });

  // ── Subscribe to text events ──────────────────────────────
  stream.on("text", (text) => {
    if (firstTokenTime === null) {
      firstTokenTime = Date.now();
      printEvent("FIRST_TOKEN", `Latency: ${firstTokenTime - startTime}ms`);
      process.stdout.write("  ");
    }
    process.stdout.write(text);
    totalChars += text.length;
    deltaCount++;
  });

  // ── Wait for completion ───────────────────────────────────
  const finalMessage = await stream.finalMessage();

  const endTime = Date.now();
  console.log("\n");

  // ── Statistics ────────────────────────────────────────────
  printSection("Stream Statistics (流式统计)");

  console.log(`  Text deltas received:    ${deltaCount}`);
  console.log(`  Total characters:        ${totalChars}`);
  console.log(`  Input tokens:            ${finalMessage.usage.input_tokens}`);
  console.log(`  Output tokens:           ${finalMessage.usage.output_tokens}`);
  console.log(`  Time to first token:     ${firstTokenTime ? firstTokenTime - startTime : "N/A"}ms`);
  console.log(`  Total time:              ${endTime - startTime}ms`);
  console.log(`  Stop reason:             ${finalMessage.stop_reason}`);
}

// ── Mock Mode ───────────────────────────────────────────────────
async function streamMock(): Promise<void> {
  printSection("Streaming Text Output — Mock Mode (打字机效果)");

  const mockResponse =
    "Streaming 是一种数据传输方式，数据像水流一样持续发送，接收方边收边处理。 " +
    "不需要等待全部数据下载完成，用户就能看到部分结果。 " +
    "LLM 使用 streaming 让文字逐字出现，大幅提升用户体验。";

  const startTime = Date.now();
  let firstTokenTime: number | null = null;
  let totalChars = 0;
  let deltaCount = 0;

  printEvent("STREAM_START", "Starting mock stream...");
  console.log("");

  process.stdout.write("  ");
  for await (const event of createMockStream(mockResponse)) {
    if (event.type === "text_delta") {
      if (firstTokenTime === null) {
        firstTokenTime = Date.now();
        printEvent("FIRST_TOKEN", `Latency: ${firstTokenTime - startTime}ms`);
        process.stdout.write("  ");
      }
      process.stdout.write(event.delta);
      totalChars += event.delta.length;
      deltaCount++;
    }
  }

  const endTime = Date.now();
  console.log("\n");

  printSection("Stream Statistics (流式统计)");

  console.log(`  Text deltas received:    ${deltaCount}`);
  console.log(`  Total characters:        ${totalChars}`);
  console.log(`  Input tokens:            ~20 (mock)`);
  console.log(`  Output tokens:           ~${Math.ceil(totalChars / 4)} (estimated)`);
  console.log(`  Time to first token:     ${firstTokenTime ? firstTokenTime - startTime : "N/A"}ms`);
  console.log(`  Total time:              ${endTime - startTime}ms`);
  console.log(`  Stop reason:             end_turn (mock)`);
}

// ── Main ────────────────────────────────────────────────────────
printSection("Demo 04-02: Stream Text (流式文本输出)");

if (isMockMode()) {
  console.log("[Mock 模式 — 使用模拟流]\n");
  await streamMock();
} else {
  const client = new Anthropic({ apiKey: getApiKey("anthropic") });
  await streamWithApi(client);
}

// ── Explain the streaming pattern ───────────────────────────
printSection("How Streaming Works (流式原理)");

console.log("  Without streaming (非流式):");
console.log("    Request ──────────────────────────── Response (wait for all)");
console.log("    [==================================] Full text arrives at once\n");

console.log("  With streaming (流式):");
console.log("    Request ─ delta ─ delta ─ delta ─ delta ─ done");
console.log("    [=]  [==]  [===]  [====]  [=====] Text appears progressively\n");

console.log("  Key events in Anthropic streaming:");
console.log("    message_start     → Message object created");
console.log("    content_block_start → New content block begins");
console.log("    content_block_delta → Text chunk (the actual content!)");
console.log("    content_block_stop  → Content block complete");
console.log("    message_delta     → Usage stats, stop reason");
console.log("    message_stop      → Stream complete\n");

printSection("Key Learning");
console.log("  流式输出的三大优势：");
console.log("  1. Time to First Token — 用户立即看到响应开始");
console.log("  2. 打字机效果 — 逐字出现，感觉更自然");
console.log("  3. 可以提前取消 — 不需要等待完整响应");
