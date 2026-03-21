/**
 * Demo 06: Progress Updates Then Failure
 * 工具发出进度更新后失败 — 展示 updates 和 final result 是独立的。
 *
 * 运行: npx tsx src/06-update-then-fail.ts
 *
 * 关键: 进度更新一旦发出就无法撤回。UI 必须处理 "进度正常 → 突然失败" 的场景。
 */
import { printSection, printEvent } from "@pi-tutorial/shared";

// ─── 类型定义 ────────────────────────────────────────────────────

interface ProgressUpdate {
  type: "progress";
  percent: number;
  message: string;
  timestamp: number;
}

interface ToolFinalResult {
  type: "result";
  content: string;
  isError: boolean;
  timestamp: number;
}

type ToolEvent = ProgressUpdate | ToolFinalResult;

// ─── 模拟 UI 日志 ────────────────────────────────────────────────

class SimpleUI {
  private events: ToolEvent[] = [];

  onProgress(update: ProgressUpdate): void {
    this.events.push(update);
    const bar = "█".repeat(Math.floor(update.percent / 5)) +
                "░".repeat(20 - Math.floor(update.percent / 5));
    printEvent("进度", `[${bar}] ${update.percent}% - ${update.message}`);
  }

  onResult(result: ToolFinalResult): void {
    this.events.push(result);
    if (result.isError) {
      printEvent("失败", `ERROR: ${result.content}`);
    } else {
      printEvent("成功", result.content);
    }
  }

  printTimeline(): void {
    console.log("\n  事件时间线:");
    const baseTime = this.events[0]?.timestamp ?? 0;
    for (const event of this.events) {
      const elapsed = event.timestamp - baseTime;
      if (event.type === "progress") {
        console.log(`    +${elapsed}ms  [进度] ${event.percent}% ${event.message}`);
      } else {
        const status = event.isError ? "[失败]" : "[成功]";
        console.log(`    +${elapsed}ms  ${status} ${event.content}`);
      }
    }
  }
}

// ─── 模拟下载工具 (进度更新 → 失败) ──────────────────────────────

async function downloadTool(
  url: string,
  onProgress: (update: ProgressUpdate) => void
): Promise<ToolFinalResult> {
  const steps = [
    { percent: 25, message: "连接服务器...", delay: 80 },
    { percent: 50, message: "下载数据...", delay: 100 },
    { percent: 75, message: "处理响应...", delay: 80 },
  ];

  for (const step of steps) {
    await new Promise((r) => setTimeout(r, step.delay));
    onProgress({
      type: "progress",
      percent: step.percent,
      message: step.message,
      timestamp: Date.now(),
    });
  }

  // 模拟在 75% 处失败
  await new Promise((r) => setTimeout(r, 50));

  return {
    type: "result",
    content: `Network error: connection to "${url}" timed out at 75%`,
    isError: true,
    timestamp: Date.now(),
  };
}

// ─── 运行 Demo ───────────────────────────────────────────────────

printSection("Demo 06: Progress Updates Then Failure");

console.log("  场景: 下载工具发出 3 次进度更新，然后在 75% 处失败\n");

const ui = new SimpleUI();

const result = await downloadTool(
  "https://example.com/large-file.zip",
  (update) => ui.onProgress(update)
);

ui.onResult(result);

// ─── 分析时间线 ──────────────────────────────────────────────────
printSection("事件时间线分析");

ui.printTimeline();

// ─── 关键要点 ────────────────────────────────────────────────────
printSection("关键要点");

console.log(`
  1. 进度更新已发出，无法撤回
     - UI 已经显示了 25%, 50%, 75% 的进度条
     - 用户已经看到了进度在推进
     - 这些更新不会因为最终失败而消失

  2. 最终结果是 isError=true
     - 尽管有 3 次成功的进度更新
     - 最终结果仍然是失败的

  3. UI 的挑战
     - 进度条从 0% → 25% → 50% → 75% → 突然变红
     - 用户体验: "明明在下载啊，怎么突然失败了?"
     - UI 必须设计成能处理这种 "进度正常 → 突然失败" 的情况

  4. 设计启示
     - updates 和 final result 是完全独立的
     - 不能因为有进度更新就假设工具会成功
     - 应该在 UI 上始终保留 "失败" 的可能性
     - 失败后应该显示之前的进度（方便调试和重试）
`);
