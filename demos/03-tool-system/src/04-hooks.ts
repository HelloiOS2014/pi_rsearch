/**
 * Demo 04: Before/After Tool Call Hooks
 * 工具调用前后的钩子 — 拦截危险操作、修改/脱敏结果。
 *
 * 运行: npx tsx src/04-hooks.ts
 */
import { printSection, printEvent } from "@pi-tutorial/shared";

// ─── 类型定义 ────────────────────────────────────────────────────

interface ToolCallInfo {
  name: string;
  input: Record<string, unknown>;
}

interface ToolResult {
  content: string;
  isError: boolean;
}

type BeforeHook = (call: ToolCallInfo) => ToolResult | null;
// 返回 null → 允许执行; 返回 ToolResult → 拦截，直接返回该结果

type AfterHook = (call: ToolCallInfo, result: ToolResult) => ToolResult;
// 可以修改返回结果

// ─── Hook 引擎 ────────────────────────────────────────────────────

class HookableToolExecutor {
  private beforeHooks: BeforeHook[] = [];
  private afterHooks: AfterHook[] = [];

  onBefore(hook: BeforeHook): void {
    this.beforeHooks.push(hook);
  }

  onAfter(hook: AfterHook): void {
    this.afterHooks.push(hook);
  }

  async execute(
    call: ToolCallInfo,
    handler: (input: Record<string, unknown>) => Promise<string>
  ): Promise<ToolResult> {
    // 1. 执行 beforeHooks
    for (const hook of this.beforeHooks) {
      const intercepted = hook(call);
      if (intercepted !== null) {
        printEvent("BLOCKED", `beforeHook 拦截了 ${call.name}`);
        return intercepted;
      }
    }

    // 2. 执行工具
    let result: ToolResult;
    try {
      const content = await handler(call.input);
      result = { content, isError: false };
    } catch (err) {
      result = { content: (err as Error).message, isError: true };
    }

    // 3. 执行 afterHooks
    for (const hook of this.afterHooks) {
      result = hook(call, result);
    }

    return result;
  }
}

// ─── Demo 场景 1: beforeHook 拦截危险操作 ─────────────────────────
printSection("场景 1: beforeHook 拦截危险操作");

const executor = new HookableToolExecutor();

// 注册 beforeHook: 禁止 delete_database
executor.onBefore((call) => {
  const blocked = ["delete_database", "drop_table", "rm_rf"];
  if (blocked.includes(call.name)) {
    return {
      content: `DENIED: Tool "${call.name}" is blocked by security policy.`,
      isError: true,
    };
  }
  return null; // 允许执行
});

// 尝试执行危险工具
const dangerResult = await executor.execute(
  { name: "delete_database", input: { target: "production" } },
  async () => "Database deleted!" // 这行永远不会执行
);

printEvent("结果", `isError=${dangerResult.isError}`);
console.log(`  content: ${dangerResult.content}`);

// 尝试执行安全工具
const safeResult = await executor.execute(
  { name: "calculator", input: { expression: "1 + 1" } },
  async (input) => `Result: ${Function(`"use strict"; return (${input.expression})`)()}`
);

printEvent("结果", `isError=${safeResult.isError}`);
console.log(`  content: ${safeResult.content}`);

// ─── Demo 场景 2: afterHook 脱敏处理 ─────────────────────────────
printSection("场景 2: afterHook 脱敏处理");

const executor2 = new HookableToolExecutor();

// 注册 afterHook: 替换信用卡号
executor2.onAfter((_call, result) => {
  // 匹配 4 组数字的信用卡号格式
  const redacted = result.content.replace(
    /\b(\d{4})[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{4})\b/g,
    "****-****-****-$4"
  );
  if (redacted !== result.content) {
    printEvent("脱敏", "检测到信用卡号，已替换");
  }
  return { ...result, content: redacted };
});

const dbResult = await executor2.execute(
  { name: "query_user", input: { id: 42 } },
  async () =>
    JSON.stringify({
      name: "Alice",
      email: "alice@example.com",
      creditCard: "4532 1234 5678 9012",
      balance: 1000,
    })
);

printEvent("结果", "脱敏后的输出");
console.log(`  ${dbResult.content}`);

// ─── Demo 场景 3: afterHook 将错误转为成功 ────────────────────────
printSection("场景 3: afterHook 错误恢复");

const executor3 = new HookableToolExecutor();

// 注册 afterHook: 当文件不存在时，返回默认值而非错误
executor3.onAfter((call, result) => {
  if (call.name === "file_reader" && result.isError && result.content.includes("ENOENT")) {
    printEvent("恢复", "文件不存在 → 返回默认空内容");
    return { content: "", isError: false };
  }
  return result;
});

const fileResult = await executor3.execute(
  { name: "file_reader", input: { path: "/nonexistent/file.txt" } },
  async () => {
    throw new Error("ENOENT: no such file or directory");
  }
);

printEvent("结果", `isError=${fileResult.isError}`);
console.log(`  content: "${fileResult.content}" (空字符串，不是错误)`);

// ─── 总结 ────────────────────────────────────────────────────────
printSection("Hook 系统总结");

console.log(`
  beforeHook:
    - 在工具执行前拦截
    - 返回 null → 放行
    - 返回 ToolResult → 拦截，跳过实际执行
    - 典型用途: 安全策略、权限检查、参数校验

  afterHook:
    - 在工具执行后修改结果
    - 可以修改 content (脱敏、格式化)
    - 可以修改 isError (错误恢复、降级)
    - 典型用途: 数据脱敏、日志记录、错误恢复
`);
