import { printSection } from "@pi-tutorial/shared";

printSection("Demo 14-01: 只能在终端用的 Agent");

// The agent is tightly coupled to interactive terminal I/O
console.log("📺 当前状态：Agent 只有终端交互模式\n");

console.log("尝试场景 1：CI/CD 自动化");
console.log("❌ CI 需要 pipe 输入/输出 → 但 Agent 等待交互式输入");
console.log("   echo 'review this PR' | node agent.js → 卡住\n");

console.log("尝试场景 2：IDE 集成");
console.log("❌ VS Code 扩展需要 JSON-RPC → 但 Agent 只输出人类可读文本");
console.log("   无法程序化解析 Agent 的输出\n");

console.log("尝试场景 3：安全审批");
console.log("❌ 团队需要在 rm/write 前审批 → 但没有 Hook 机制");
console.log("   Agent 直接执行危险操作\n");

console.log("尝试场景 4：分享会话");
console.log("❌ 想把精彩的 Agent 会话发给同事 → 但只有终端滚动缓冲");
console.log("   关掉终端就没了\n");

console.log("=".repeat(60));
console.log("核心问题：Agent 和终端紧耦合。");
console.log("解法：事件订阅模式 — 一个 subscribe 就是一种交付模式。");
console.log("运行 02-multi-mode.ts 看看如何解决。");
