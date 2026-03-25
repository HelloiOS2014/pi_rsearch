# Ch14 Demo: 交付

对比只能在终端用的 Agent 和事件驱动的多模式交付 Agent。

## 运行

```bash
# Problem: agent tightly coupled to interactive terminal
npx tsx src/01-terminal-only.ts

# Solution: event-driven core with 4 delivery modes
npx tsx src/02-multi-mode.ts
```

Mock mode: 无需 API key，自动以 mock 模式运行。
