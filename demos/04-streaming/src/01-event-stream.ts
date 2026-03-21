/**
 * Demo 04-01: EventStream from Scratch — 理解推拉式事件流
 *
 * 不需要 LLM，纯手工实现一个 EventStream<T, R> 类。
 * 核心模式：queue + waiter（推拉机制），terminal condition，双消费模式。
 *
 * 运行: npx tsx src/01-event-stream.ts
 */
import { printSection, printEvent } from "@pi-tutorial/shared";

// ── Event Types ─────────────────────────────────────────────────
// T = individual events, R = final result
interface StreamEvent {
  type: string;
  data: string;
}

interface StreamResult {
  totalEvents: number;
  finalMessage: string;
}

// ── EventStream<T, R> — Generic Push/Pull Stream ────────────────
// This is the core pattern behind all streaming APIs:
// Producer pushes events, Consumer pulls them with for-await.
class EventStream<T, R> implements AsyncIterable<T> {
  private queue: T[] = [];
  private waiter: ((value: IteratorResult<T>) => void) | null = null;
  private done = false;
  private finalResult: R | null = null;
  private resultPromise: Promise<R>;
  private resolveResult!: (value: R) => void;
  private isCompletePredicate: (event: T) => boolean;

  constructor(isComplete: (event: T) => boolean) {
    this.isCompletePredicate = isComplete;
    this.resultPromise = new Promise<R>((resolve) => {
      this.resolveResult = resolve;
    });
  }

  // ── Producer side: push events into the stream ──────────────
  push(event: T): void {
    if (this.done) return;

    if (this.isCompletePredicate(event)) {
      this.done = true;
      // If someone is waiting, give them done signal
      if (this.waiter) {
        this.waiter({ value: undefined as unknown as T, done: true });
        this.waiter = null;
      }
      return;
    }

    if (this.waiter) {
      // Consumer is already waiting — deliver immediately (pull satisfied)
      this.waiter({ value: event, done: false });
      this.waiter = null;
    } else {
      // No consumer waiting — buffer the event (push into queue)
      this.queue.push(event);
    }
  }

  // ── Complete the stream with a final result ─────────────────
  complete(result: R): void {
    this.finalResult = result;
    this.done = true;
    this.resolveResult(result);
    // Wake up any waiting consumer
    if (this.waiter) {
      this.waiter({ value: undefined as unknown as T, done: true });
      this.waiter = null;
    }
  }

  // ── Consumer side: await the final result ───────────────────
  result(): Promise<R> {
    return this.resultPromise;
  }

  // ── AsyncIterator protocol ──────────────────────────────────
  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: (): Promise<IteratorResult<T>> => {
        // If there are buffered events, return immediately
        if (this.queue.length > 0) {
          return Promise.resolve({ value: this.queue.shift()!, done: false });
        }

        // If stream is done, signal completion
        if (this.done) {
          return Promise.resolve({ value: undefined as unknown as T, done: true });
        }

        // Nothing buffered and not done — wait for next push
        return new Promise<IteratorResult<T>>((resolve) => {
          this.waiter = resolve;
        });
      },
    };
  }
}

// ── Demo: Producer pushes events with setTimeout ────────────────
async function runDemo(): Promise<void> {
  printSection("Demo 04-01: EventStream from Scratch (推拉式事件流)");

  // Create a stream that completes when it sees type "done"
  const stream = new EventStream<StreamEvent, StreamResult>(
    (event) => event.type === "done"
  );

  // ── Producer: push events on a timer ──────────────────────
  const events: StreamEvent[] = [
    { type: "start", data: "Stream initialized" },
    { type: "data", data: "First chunk of data" },
    { type: "data", data: "Second chunk of data" },
    { type: "data", data: "Third chunk of data" },
    { type: "progress", data: "75% complete" },
    { type: "data", data: "Final chunk" },
    { type: "done", data: "Stream finished" },
  ];

  let eventIndex = 0;
  const pushInterval = setInterval(() => {
    if (eventIndex < events.length) {
      const event = events[eventIndex];
      printEvent("PUSH", `type=${event.type}, data="${event.data}"`);
      stream.push(event);
      eventIndex++;
    } else {
      clearInterval(pushInterval);
      stream.complete({
        totalEvents: events.length - 1, // exclude "done" event
        finalMessage: "All events delivered successfully",
      });
    }
  }, 100);

  // ── Consumer Mode 1: for-await-of ─────────────────────────
  printSection("Consumer Mode 1: for-await-of (逐事件消费)");

  let count = 0;
  for await (const event of stream) {
    count++;
    console.log(`  [Received #${count}] type=${event.type}, data="${event.data}"`);
  }

  console.log(`\n  Total events consumed: ${count}`);

  // ── Consumer Mode 2: await stream.result() ────────────────
  printSection("Consumer Mode 2: await stream.result() (等待最终结果)");

  const finalResult = await stream.result();
  console.log(`  Total events: ${finalResult.totalEvents}`);
  console.log(`  Final message: ${finalResult.finalMessage}`);

  // ── Show the push/pull mechanism ──────────────────────────
  printSection("Push/Pull Mechanism Explained (推拉机制)");

  console.log("  Push (生产者推送):");
  console.log("    - Producer calls stream.push(event)");
  console.log("    - If consumer is waiting → deliver immediately");
  console.log("    - If no consumer → buffer in queue\n");

  console.log("  Pull (消费者拉取):");
  console.log("    - Consumer calls for-await (internally next())");
  console.log("    - If queue has data → return immediately");
  console.log("    - If queue empty → wait for next push\n");

  console.log("  This is the same pattern used by:");
  console.log("    - Anthropic SDK's MessageStream");
  console.log("    - Node.js ReadableStream");
  console.log("    - Server-Sent Events (SSE)");

  // ── Bonus: demonstrate a second stream with fast producer ─
  printSection("Bonus: Fast Producer + Slow Consumer (背压演示)");

  const stream2 = new EventStream<StreamEvent, StreamResult>(
    (event) => event.type === "done"
  );

  // Push all events synchronously (fast producer)
  for (let i = 0; i < 5; i++) {
    stream2.push({ type: "data", data: `Batch item ${i}` });
  }
  stream2.push({ type: "done", data: "" });
  stream2.complete({ totalEvents: 5, finalMessage: "Batch complete" });

  // Consume slowly
  let batchCount = 0;
  for await (const event of stream2) {
    batchCount++;
    console.log(`  [Batch ${batchCount}] ${event.data} (consumed after buffering)`);
  }

  console.log(`\n  All ${batchCount} events were buffered and consumed.`);
  console.log("  The queue acts as a natural backpressure buffer.\n");

  printSection("Key Learning");
  console.log("  EventStream 是所有流式 API 的核心抽象：");
  console.log("  1. Push/Pull — 生产者和消费者速度解耦");
  console.log("  2. AsyncIterable — 用 for-await-of 优雅消费");
  console.log("  3. Terminal condition — isComplete 判断流结束");
  console.log("  4. Dual mode — 既能逐事件消费，也能等最终结果");
}

runDemo();
