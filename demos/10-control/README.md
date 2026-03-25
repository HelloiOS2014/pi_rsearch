# Ch10 Demo: 控制回路

对比没有控制回路的 Agent（崩溃）和有控制回路的 Agent（恢复）。

## 运行

```bash
# Problem: raw agent crashes on API error
npx tsx src/01-no-control.ts

# Solution: AgentHarness recovers from same error
npx tsx src/02-harness.ts
```

Mock mode: 无需 API key，自动以 mock 模式运行。
