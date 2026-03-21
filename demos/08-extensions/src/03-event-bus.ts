/**
 * Demo 08 — Event Bus: Two extensions communicating
 *
 * Extension A: logs all tool executions to a history array
 * Extension B: subscribes to the history and prints stats
 * Shared event bus with emit/on pattern.
 */

import { printSection, printEvent } from "@pi-tutorial/shared";

// ── Event Bus ──────────────────────────────────────────────────────────
type Handler = (data: Record<string, unknown>) => void;

class EventBus {
  private handlers: Record<string, Handler[]> = {};

  on(event: string, handler: Handler): void {
    (this.handlers[event] ??= []).push(handler);
  }

  emit(event: string, data: Record<string, unknown>): void {
    for (const handler of this.handlers[event] ?? []) {
      handler(data);
    }
  }
}

// ── Shared history (communication channel) ─────────────────────────────
interface HistoryEntry {
  tool: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
}

const history: HistoryEntry[] = [];

// ── Extension A: History Logger ────────────────────────────────────────
function historyLoggerExtension(bus: EventBus) {
  bus.on("tool_start", (data) => {
    const entry: HistoryEntry = {
      tool: data.name as string,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      success: false,
    };
    history.push(entry);
    printEvent("HISTORY", `Recording start: ${entry.tool}`);
  });

  bus.on("tool_end", (data) => {
    const entry = history.find(
      (e) => e.tool === data.name && e.endTime === 0
    );
    if (entry) {
      entry.endTime = Date.now();
      entry.duration = data.duration as number;
      entry.success = data.success as boolean;
      printEvent("HISTORY", `Recording end: ${entry.tool} (${entry.duration}ms)`);
    }
  });

  // Emit stats whenever requested
  bus.on("request_stats", () => {
    bus.emit("stats_ready", {
      entries: history.length,
      history: [...history],
    });
  });
}

// ── Extension B: Stats Reporter ────────────────────────────────────────
function statsReporterExtension(bus: EventBus) {
  bus.on("stats_ready", (data) => {
    const entries = data.history as HistoryEntry[];
    if (entries.length === 0) {
      printEvent("STATS", "No tool executions recorded yet.");
      return;
    }

    const totalCalls = entries.length;
    const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0);
    const avgDuration = Math.round(totalDuration / totalCalls);
    const successRate = Math.round(
      (entries.filter((e) => e.success).length / totalCalls) * 100
    );

    console.log("\n--- Stats Report ---");
    console.log(`  Total calls:    ${totalCalls}`);
    console.log(`  Total duration: ${totalDuration}ms`);
    console.log(`  Avg duration:   ${avgDuration}ms`);
    console.log(`  Success rate:   ${successRate}%`);
    console.log("--------------------\n");
  });
}

// ── Demo: simulate tool executions ─────────────────────────────────────
printSection("Event Bus: Extensions Communicating");

const bus = new EventBus();
historyLoggerExtension(bus);
statsReporterExtension(bus);

// Simulate tool executions with varying durations
const toolRuns = [
  { name: "read_file", duration: 12, success: true },
  { name: "search", duration: 45, success: true },
  { name: "write_file", duration: 8, success: true },
  { name: "run_command", duration: 120, success: false },
  { name: "read_file", duration: 15, success: true },
];

console.log("Simulating 5 tool executions...\n");

for (const run of toolRuns) {
  bus.emit("tool_start", { name: run.name });
  bus.emit("tool_end", {
    name: run.name,
    duration: run.duration,
    success: run.success,
  });
}

// Extension B asks Extension A for stats (via the bus)
console.log("Extension B requests stats from Extension A...");
bus.emit("request_stats", {});
