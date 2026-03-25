import { printSection, printEvent } from "@pi-tutorial/shared";
import { spawn } from "child_process";

printSection("Demo 11-02: 防御性工具");

// ===== 1. Fuzzy Edit =====
console.log("\n📝 测试 1：模糊匹配编辑\n");

function normalize(s: string): string {
  return s
    .replace(/[\u2018\u2019\u2032]/g, "'") // Smart single quotes → ASCII
    .replace(/[\u201C\u201D\u2033]/g, '"') // Smart double quotes → ASCII
    .replace(/[\u2013\u2014\u2015]/g, "-") // En/em dashes → hyphen
    .replace(/[\u00A0\u202F\u2007]/g, " ") // Non-breaking spaces → space
    .replace(/\s+$/gm, ""); // Trailing whitespace
}

interface EditResult {
  success: boolean;
  result?: string;
  diff?: string;
  error?: string;
}

function defensiveEdit(
  content: string,
  oldText: string,
  newText: string
): EditResult {
  // Stage 1: Exact match
  let idx = content.indexOf(oldText);
  if (idx !== -1) {
    printEvent("edit", "Stage 1: 精确匹配成功");
  } else {
    // Stage 2: Fuzzy match via normalization
    const normContent = normalize(content);
    const normOld = normalize(oldText);
    idx = normContent.indexOf(normOld);
    if (idx !== -1) {
      printEvent("edit", "Stage 2: 模糊匹配成功 (normalize)");
    }
  }

  if (idx === -1) {
    return {
      success: false,
      error:
        `No match found for oldText.\n` +
        `File length: ${content.length} chars.\n` +
        `Tip: Provide more surrounding context to uniquely identify the location.`,
    };
  }

  // Find the actual extent of the matched region in original content
  const normOld = normalize(oldText);
  const normContent = normalize(content);
  const matchEnd = normContent.indexOf(normOld, idx) + normOld.length;

  // Uniqueness check
  const secondIdx = normContent.indexOf(normOld, idx + 1);
  if (secondIdx !== -1) {
    return {
      success: false,
      error:
        `Multiple matches found (at positions ${idx} and ${secondIdx}).\n` +
        `Provide more context to uniquely identify which occurrence to edit.`,
    };
  }

  const result = content.slice(0, idx) + newText + content.slice(matchEnd);

  return {
    success: true,
    result,
    diff: `@@ -1 +1 @@\n-${oldText}\n+${newText}`,
  };
}

// Test with smart quotes
const fileContent = `const message = \u201CHello World\u201D;`;
const oldText = `const message = "Hello World";`;
const editResult = defensiveEdit(
  fileContent,
  oldText,
  `const message = "Hi World";`
);

if (editResult.success) {
  console.log("✅ 编辑成功（模糊匹配绕过了 Unicode 差异）");
  console.log(`   Diff: ${editResult.diff}`);
} else {
  console.log(`❌ 编辑失败: ${editResult.error}`);
}

// ===== 2. Safe Bash =====
console.log("\n⚡ 测试 2：带超时的安全执行\n");

interface BashResult {
  stdout: string;
  exitCode: number;
  truncated: boolean;
  totalBytes: number;
  timedOut: boolean;
}

async function defensiveBash(
  command: string,
  options: {
    timeoutMs?: number;
    maxOutputBytes?: number;
  } = {}
): Promise<BashResult> {
  const { timeoutMs = 5000, maxOutputBytes = 10000 } = options;

  return new Promise((resolve) => {
    const child = spawn("bash", ["-c", command], { detached: true });
    let output = "";
    let totalBytes = 0;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid!, "SIGKILL");
      } catch {
        // Process may have already exited
      }
      printEvent("bash", `超时 (${timeoutMs}ms)，杀掉进程树`);
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (output.length < maxOutputBytes) {
        output += chunk.toString();
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (output.length < maxOutputBytes) {
        output += chunk.toString();
      }
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const truncated = totalBytes > maxOutputBytes;
      if (truncated) {
        output = output.slice(-maxOutputBytes); // Keep tail (errors usually at end)
        printEvent(
          "truncate",
          `输出截断: 保留尾部 ${maxOutputBytes} bytes / 总共 ${totalBytes} bytes`
        );
      }
      resolve({
        stdout: output,
        exitCode: code ?? 1,
        truncated,
        totalBytes,
        timedOut,
      });
    });
  });
}

// Test: command that completes quickly
const quickResult = await defensiveBash("echo 'Hello from safe bash'", {
  timeoutMs: 3000,
});
console.log(
  `✅ 快速命令: exitCode=${quickResult.exitCode}, output="${quickResult.stdout.trim()}"`
);

// Test: simulate slow command (sleep 2 with 1s timeout)
printEvent("bash", "执行: sleep 2 (超时设为 1 秒)");
const slowResult = await defensiveBash("sleep 2", { timeoutMs: 1000 });
console.log(
  `${slowResult.timedOut ? "⏰" : "✅"} 慢命令: timedOut=${slowResult.timedOut}`
);

// ===== 3. Output Truncation =====
console.log("\n📄 测试 3：智能输出截断\n");

interface TruncationResult {
  content: string;
  truncated: boolean;
  totalLines: number;
  keptLines: number;
}

function truncateHead(text: string, maxLines: number): TruncationResult {
  const lines = text.split("\n");
  if (lines.length <= maxLines) {
    return {
      content: text,
      truncated: false,
      totalLines: lines.length,
      keptLines: lines.length,
    };
  }
  const kept = lines.slice(0, maxLines);
  return {
    content:
      kept.join("\n") +
      `\n\n... [截断：显示前 ${maxLines} 行 / 共 ${lines.length} 行]`,
    truncated: true,
    totalLines: lines.length,
    keptLines: maxLines,
  };
}

// Generate large output
const largeOutput = Array.from(
  { length: 5000 },
  (_, i) => `Line ${i + 1}: data`
).join("\n");
const truncResult = truncateHead(largeOutput, 10);
console.log(`原始: ${truncResult.totalLines} 行`);
console.log(`截断后: ${truncResult.keptLines} 行`);
console.log(`截断: ${truncResult.truncated}`);
console.log(`内容预览:\n${truncResult.content.slice(0, 200)}...`);

// ===== 4. Permission Gate =====
console.log("\n🔒 测试 4：权限门控\n");

const NEEDS_PERMISSION = new Set(["edit", "write", "bash"]);

function checkPermission(toolName: string): boolean {
  if (NEEDS_PERMISSION.has(toolName)) {
    printEvent("permission", `${toolName} — 需要确认 ✓ (demo 自动批准)`);
    return true;
  }
  printEvent("permission", `${toolName} — 无需权限，直接执行`);
  return true;
}

checkPermission("read");
checkPermission("grep");
checkPermission("edit");
checkPermission("bash");

// Summary
console.log("\n" + "=".repeat(60));
console.log("四个防御机制：");
console.log("1. 模糊匹配：Unicode 差异不再是问题");
console.log("2. 安全执行：超时 + 进程树杀死");
console.log("3. 输出截断：保护上下文窗口");
console.log("4. 权限门控：变更操作需要确认");
