# Ch13 Demo: 适应性

对比硬编码 Agent（每换场景改代码）和可配置 Agent（分层配置 + 动态 Prompt + Skills）。

## 运行

```bash
# Problem: hardcoded agent can't adapt
npx tsx src/01-hardcoded.ts

# Solution: layered config + dynamic prompt + skills
npx tsx src/02-configurable.ts
```

Mock mode: 无需 API key，自动以 mock 模式运行。
