import { printSection, printEvent } from "@pi-tutorial/shared";

printSection("Demo 12-01: 没有记忆的 Agent");

// Simulate a conversation where each "session" is independent
interface Message {
  role: string;
  content: string;
}

// Session 1: Agent analyzes files
console.log("\n=== 会话 1 ===\n");
const session1Messages: Message[] = [];
session1Messages.push({ role: "user", content: "分析 src/auth.ts 的安全问题" });
session1Messages.push({
  role: "assistant",
  content: "我来读取文件并分析...",
});
session1Messages.push({
  role: "assistant",
  content:
    "发现 3 个问题：1) 密码未加盐 2) Session 无过期 3) 缺少 CSRF 防护",
});
printEvent("分析完成", "发现 3 个安全问题");

// "Close terminal" - all context lost
console.log("\n--- 关闭终端，重新打开 ---\n");

// Session 2: Agent has NO memory of session 1
console.log("=== 会话 2 ===\n");
const session2Messages: Message[] = []; // Empty! No history
session2Messages.push({
  role: "user",
  content: "继续修复 auth.ts 的问题",
});
session2Messages.push({
  role: "assistant",
  content: "你好！我来看看 auth.ts... 让我先读取文件。",
});
session2Messages.push({
  role: "assistant",
  content: "我发现了一些安全问题：1) 密码未加盐...",
});
printEvent("重复工作", "Agent 不记得它已经分析过这个文件");

// Session 3: Same thing again
console.log("\n--- 再次重启 ---\n");
console.log("=== 会话 3 ===\n");
printEvent(
  "又一次从零开始",
  "Agent 再次读取同一个文件，再次发现同样的问题"
);

// Summary
console.log("\n" + "=".repeat(60));
console.log("问题总结：");
console.log("  每次重启 = 从零开始");
console.log("  已完成的分析被重复执行");
console.log("  已做的决策被遗忘");
console.log("  Token 和时间被浪费在重复工作上");
console.log(
  "\n运行 02-with-memory.ts 看看记忆系统如何解决这些问题。"
);
