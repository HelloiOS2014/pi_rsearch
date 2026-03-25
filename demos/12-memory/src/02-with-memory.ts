import { printSection, printEvent } from "@pi-tutorial/shared";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

printSection("Demo 12-02: 有记忆的 Agent");

// ===== SessionStore: JSONL persistence + basic compaction =====

interface SessionEntry {
  id: string;
  parentId: string | null;
  type: "message" | "compaction";
  role?: "user" | "assistant" | "tool_result";
  content: string;
  timestamp: number;
}

class SessionStore {
  private entries: SessionEntry[] = [];
  private filePath: string;
  private nextId = 1;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();
  }

  // Append-only: write one entry per line
  append(
    entry: Omit<SessionEntry, "id" | "parentId" | "timestamp">
  ): SessionEntry {
    const full: SessionEntry = {
      ...entry,
      id: String(this.nextId++),
      parentId:
        this.entries.length > 0
          ? this.entries[this.entries.length - 1].id
          : null,
      timestamp: Date.now(),
    };
    this.entries.push(full);
    fs.appendFileSync(this.filePath, JSON.stringify(full) + "\n");
    return full;
  }

  // Load from JSONL
  load(): void {
    if (!fs.existsSync(this.filePath)) return;
    const lines = fs
      .readFileSync(this.filePath, "utf-8")
      .split("\n")
      .filter(Boolean);
    this.entries = lines.map((line) => JSON.parse(line));
    this.nextId = this.entries.length + 1;
    printEvent("session", `恢复了 ${this.entries.length} 条历史记录`);
  }

  // Build context: walk the chain
  buildContext(): string[] {
    return this.entries
      .filter((e) => e.type === "message" || e.type === "compaction")
      .map((e) =>
        e.type === "compaction"
          ? `[摘要] ${e.content}`
          : `${e.role}: ${e.content}`
      );
  }

  // Token estimation: chars / 4
  estimateTokens(): number {
    return Math.ceil(
      this.entries.reduce((sum, e) => sum + e.content.length, 0) / 4
    );
  }

  // Basic compaction
  compact(keepRecent: number): void {
    if (this.entries.length <= keepRecent) return;

    const toSummarize = this.entries.slice(0, -keepRecent);
    const toKeep = this.entries.slice(-keepRecent);

    // Don't cut at tool_result
    // (simplified: in real Pi, this checks entry types)

    // Generate summary (mock - in production, this calls LLM)
    const summary = toSummarize
      .filter((e) => e.type === "message")
      .map((e) => `  ${e.role}: ${e.content.slice(0, 50)}...`)
      .join("\n");

    const compactionEntry: SessionEntry = {
      id: String(this.nextId++),
      parentId: null,
      type: "compaction",
      content: `## 历史摘要\n${summary}`,
      timestamp: Date.now(),
    };

    // Rewrite session file
    this.entries = [compactionEntry, ...toKeep];
    fs.writeFileSync(
      this.filePath,
      this.entries.map((e) => JSON.stringify(e)).join("\n") + "\n"
    );

    printEvent(
      "compaction",
      `压缩了 ${toSummarize.length} 条消息 -> 1 条摘要，保留最近 ${keepRecent} 条`
    );
  }

  getEntryCount(): number {
    return this.entries.length;
  }

  clear(): void {
    this.entries = [];
    this.nextId = 1;
    if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath);
  }
}

// ===== Demo Execution =====

const sessionFile = path.join(os.tmpdir(), "pi-demo-12-session.jsonl");

// Clean start
const store = new SessionStore(sessionFile);
store.clear();

// Session 1: Simulate conversation
console.log("\n=== 会话 1：分析安全问题 ===\n");

store.append({
  type: "message",
  role: "user",
  content: "分析 src/auth.ts 的安全问题",
});
store.append({
  type: "message",
  role: "assistant",
  content: "读取 src/auth.ts，共 245 行",
});
store.append({
  type: "message",
  role: "tool_result",
  content: "文件内容: class AuthManager { ... }",
});
store.append({
  type: "message",
  role: "assistant",
  content:
    "发现 3 个安全问题：1) 密码未加盐 2) Session 无过期 3) 缺少 CSRF",
});
store.append({
  type: "message",
  role: "user",
  content: "先修复密码加盐问题",
});
store.append({
  type: "message",
  role: "assistant",
  content: "已修改 hashPassword()，添加 bcrypt 加盐",
});

printEvent(
  "session",
  `会话 1 结束，${store.getEntryCount()} 条记录，~${store.estimateTokens()} tokens`
);

// "Close terminal"
console.log("\n--- 关闭终端 ---\n");

// Session 2: Restore from JSONL
console.log("=== 会话 2：从 JSONL 恢复 ===\n");

const store2 = new SessionStore(sessionFile);
console.log("上下文恢复:");
store2.buildContext().forEach((msg) => console.log(`  ${msg.slice(0, 80)}`));

// Continue work
store2.append({
  type: "message",
  role: "user",
  content: "继续修复 Session 过期问题",
});
store2.append({
  type: "message",
  role: "assistant",
  content:
    "好的，我记得之前发现了 3 个问题，密码加盐已修复。现在处理 Session 过期...",
});

printEvent("记忆恢复", "Agent 记得之前的发现和修复工作！");

// Simulate context growing -> trigger compaction
console.log("\n=== 上下文增长 -> 触发压缩 ===\n");

for (let i = 0; i < 10; i++) {
  store2.append({
    type: "message",
    role: "assistant",
    content: `分析文件 ${i + 1}/10: ${"x".repeat(200)}`,
  });
}

printEvent(
  "tokens",
  `当前 ~${store2.estimateTokens()} tokens (${store2.getEntryCount()} 条记录)`
);

// Compaction
store2.compact(5);

printEvent(
  "tokens",
  `压缩后 ~${store2.estimateTokens()} tokens (${store2.getEntryCount()} 条记录)`
);

// Show context after compaction
console.log("\n压缩后的上下文:");
store2.buildContext().forEach((msg) => console.log(`  ${msg.slice(0, 80)}`));

// Summary
console.log("\n" + "=".repeat(60));
console.log("对比 01-no-memory：");
console.log("  关闭重启后，对话完整恢复");
console.log("  Agent 记得之前的发现和决策");
console.log("  上下文过大时自动压缩，保留关键信息");
console.log("  Token 估算（chars/4）+ 阈值触发");

// Cleanup
store2.clear();
