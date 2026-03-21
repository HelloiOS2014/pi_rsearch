/**
 * Demo 04-05: Proxy Transport — 代理服务器 + 浏览器安全的 LLM 调用
 *
 * Server: Express 接收 POST /api/stream，转发给 Anthropic，以 NDJSON 流回客户端
 * Client: fetch + ReadableStream，逐行解析 NDJSON，重建部分消息
 * 展示带宽节省：服务端剥离不必要字段
 *
 * 一个文件同时运行 server 和 client。
 *
 * 运行: npx tsx src/05-proxy-transport.ts
 */
import express from "express";
import type { Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, isMockMode, printSection, printEvent } from "@pi-tutorial/shared";
import http from "node:http";

const PORT = 3456;

// ── NDJSON Event Types ──────────────────────────────────────────
interface NdjsonEvent {
  type: "text_delta" | "tool_use_start" | "input_json_delta" | "message_complete" | "error";
  text?: string;
  toolName?: string;
  toolId?: string;
  json?: string;
  stopReason?: string;
  usage?: { input_tokens: number; output_tokens: number };
  error?: string;
}

// ── Server: Proxy LLM calls ────────────────────────────────────
function createProxyServer(useMock: boolean): express.Express {
  const app = express();
  app.use(express.json());

  app.post("/api/stream", async (req: Request, res: Response) => {
    const { messages, model, max_tokens } = req.body;

    // Set headers for NDJSON streaming
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendEvent = (event: NdjsonEvent) => {
      res.write(JSON.stringify(event) + "\n");
    };

    if (useMock) {
      // ── Mock stream ────────────────────────────────────────
      const mockResponse = "This is a streamed response from the proxy server. " +
        "Each word arrives as a separate NDJSON line. " +
        "The client parses these lines to reconstruct the message. " +
        "This pattern keeps API keys safe on the server.";

      const words = mockResponse.split(" ");
      for (const word of words) {
        sendEvent({ type: "text_delta", text: word + " " });
        await new Promise((r) => setTimeout(r, 40));
      }

      sendEvent({
        type: "message_complete",
        stopReason: "end_turn",
        usage: { input_tokens: 15, output_tokens: words.length },
      });

      res.end();
      return;
    }

    // ── Real Anthropic stream ────────────────────────────────
    try {
      const client = new Anthropic({ apiKey: getApiKey("anthropic") });
      const stream = client.messages.stream({
        model: model || "claude-sonnet-4-5-20250514",
        max_tokens: max_tokens || 300,
        messages,
      });

      // Forward only essential events (bandwidth savings!)
      // We strip: raw SSE wrappers, partial message objects, metadata
      stream.on("text", (text) => {
        sendEvent({ type: "text_delta", text });
      });

      stream.on("contentBlock", (block: Anthropic.ContentBlock) => {
        if (block.type === "tool_use") {
          sendEvent({
            type: "tool_use_start",
            toolName: block.name,
            toolId: block.id,
          });
        }
      });

      stream.on("inputJson", (json: string) => {
        sendEvent({ type: "input_json_delta", json });
      });

      const finalMessage = await stream.finalMessage();

      sendEvent({
        type: "message_complete",
        stopReason: finalMessage.stop_reason ?? "unknown",
        usage: {
          input_tokens: finalMessage.usage.input_tokens,
          output_tokens: finalMessage.usage.output_tokens,
        },
      });

      res.end();
    } catch (err) {
      sendEvent({
        type: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
      res.end();
    }
  });

  return app;
}

// ── Client: Parse NDJSON Stream ─────────────────────────────────
async function clientFetch(question: string): Promise<void> {
  printSection("Client: Fetching from Proxy (客户端请求)");

  printEvent("CLIENT_REQUEST", `POST http://localhost:${PORT}/api/stream`);
  console.log(`  Question: "${question}"\n`);

  const response = await fetch(`http://localhost:${PORT}/api/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: question }],
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 200,
    }),
  });

  if (!response.ok || !response.body) {
    console.error(`  Error: ${response.status} ${response.statusText}`);
    return;
  }

  // ── Parse NDJSON line by line ─────────────────────────────
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let eventCount = 0;
  let totalBytes = 0;

  process.stdout.write("  ");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    totalBytes += value.byteLength;
    buffer += chunk;

    // Split on newlines — each line is one JSON event
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const event: NdjsonEvent = JSON.parse(line);
        eventCount++;

        switch (event.type) {
          case "text_delta":
            process.stdout.write(event.text ?? "");
            fullText += event.text ?? "";
            break;

          case "tool_use_start":
            printEvent("TOOL_USE", `${event.toolName} (id: ${event.toolId})`);
            break;

          case "input_json_delta":
            // Could parse partial JSON here
            break;

          case "message_complete":
            console.log("\n");
            printEvent("COMPLETE", `stop_reason=${event.stopReason}`);
            if (event.usage) {
              console.log(`  Tokens: ${event.usage.input_tokens} in / ${event.usage.output_tokens} out`);
            }
            break;

          case "error":
            console.error(`\n  Error: ${event.error}`);
            break;
        }
      } catch {
        // Invalid JSON line — skip
      }
    }
  }

  // ── Bandwidth analysis ──────────────────────────────────
  printSection("Bandwidth Analysis (带宽分析)");

  const ndjsonSize = totalBytes;
  // Estimate raw SSE size (typically 3-5x larger with all metadata)
  const estimatedSseSize = Math.round(ndjsonSize * 3.5);

  console.log(`  NDJSON events received:  ${eventCount}`);
  console.log(`  NDJSON bytes:            ${ndjsonSize} bytes`);
  console.log(`  Estimated raw SSE:       ~${estimatedSseSize} bytes`);
  console.log(`  Bandwidth savings:       ~${Math.round((1 - ndjsonSize / estimatedSseSize) * 100)}%`);
  console.log(`  Response text length:    ${fullText.length} chars`);
}

// ── Main ────────────────────────────────────────────────────────
async function main(): Promise<void> {
  printSection("Demo 04-05: Proxy Transport (代理传输)");

  const useMock = isMockMode();
  if (useMock) {
    console.log("[Mock 模式 — 服务端返回模拟流]\n");
  }

  // ── Start server ──────────────────────────────────────────
  printSection("Server: Starting Proxy (启动代理服务器)");

  const app = createProxyServer(useMock);
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      printEvent("SERVER_START", `Proxy server listening on http://localhost:${PORT}`);
      console.log("  POST /api/stream — forwards to Anthropic, returns NDJSON\n");
      resolve();
    });
  });

  // ── Make client request ───────────────────────────────────
  try {
    await clientFetch("What is NDJSON and why is it useful for streaming? Answer in 2 sentences.");
  } finally {
    // ── Stop server ──────────────────────────────────────────
    await new Promise<void>((resolve) => {
      server.close(() => {
        printEvent("SERVER_STOP", "Proxy server shut down");
        resolve();
      });
    });
  }

  // ── Architecture diagram ──────────────────────────────────
  printSection("Proxy Architecture (代理架构)");

  console.log("  ┌──────────┐     POST /api/stream     ┌──────────────┐     stream()     ┌───────────┐");
  console.log("  │  Browser │ ──────────────────────── │  Proxy Server │ ───────────────  │ Anthropic │");
  console.log("  │ (Client) │                          │   (Express)   │                  │    API    │");
  console.log("  └──────────┘                          └──────────────┘                  └───────────┘");
  console.log("       ↑                                       │");
  console.log("       │            NDJSON stream               │");
  console.log('       │     {"type":"text_delta","text":"Hi"}  │');
  console.log('       │     {"type":"text_delta","text":" th"} │');
  console.log('       └───── {"type":"message_complete",...}  ─┘\n');

  console.log("  Why use a proxy?");
  console.log("    1. API keys stay on the server — never exposed to browser");
  console.log("    2. Rate limiting and authentication at the proxy level");
  console.log("    3. Strip unnecessary fields — reduce bandwidth");
  console.log("    4. Add custom logic: caching, logging, moderation");
  console.log("    5. NDJSON is simpler to parse than SSE in the browser\n");

  printSection("NDJSON vs SSE (对比)");

  console.log("  NDJSON (Newline-Delimited JSON):");
  console.log('    {"type":"text_delta","text":"Hello"}');
  console.log('    {"type":"text_delta","text":" world"}');
  console.log('    {"type":"message_complete","stopReason":"end_turn"}\n');

  console.log("  SSE (Server-Sent Events):");
  console.log('    event: content_block_delta');
  console.log('    data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}');
  console.log('    ');
  console.log('    event: content_block_delta');
  console.log('    data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}');
  console.log("");
  console.log("  NDJSON is more compact and easier to parse.\n");

  printSection("Key Learning");
  console.log("  代理传输模式的核心要点：");
  console.log("  1. 服务端持有 API key — 浏览器无法直接调用 LLM");
  console.log("  2. NDJSON 逐行解析 — 每行一个 JSON 对象");
  console.log("  3. 服务端精简事件 — 只转发必要的 delta");
  console.log("  4. ReadableStream API — 浏览器端流式读取");
  console.log("  5. 同样的模式可用于 WebSocket、gRPC 等传输层");
}

main();
