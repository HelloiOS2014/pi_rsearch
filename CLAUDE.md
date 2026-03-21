# CLAUDE.md

## 项目概述

Pi Agent 深度教程 — 一个基于 Astro 的交互式教程网站，通过解剖 Pi（极简 AI 编码智能体）教读者理解并构建 Agent 框架。

## 关键命令

```bash
npx astro dev              # 开发服务器 http://localhost:4321
npx astro build            # 构建静态站点到 dist/
npm run render-videos      # 渲染 Remotion 动画到 public/videos/
npm run validate-refs      # 校验 MDX 中的 Pi 源码行号引用
npm run remotion:dev       # Remotion Studio 预览动画
```

Demo typecheck：
```bash
cd demos/01-hello-agent && npx tsc --noEmit
```

## 项目约定

### 内容
- 章节内容用中文撰写，技术术语保留英文（Agent、Tool、Stream 等）
- MDX 文件在 `src/content/chapters/`，附录在 `src/content/chapters/appendix/`
- Content Collections 使用 Astro 5 Content Layer API（glob loader），配置在 `src/content.config.ts`

### 组件
- 交互组件是 React Islands，在 MDX 中用 `client:visible` 指令
- 三个核心组件：`SourceReader`（源码阅读器）、`CodeComparison`（代码对比）、`VideoEmbed`（动画嵌入）
- VideoEmbed 必须传 `compositionId` prop，值为 Remotion composition ID（如 `"LoopAnimation"`），组件会自动映射到 `/videos/{compositionId}.mp4`

### 动画
- Remotion 动画源码在 `remotion/src/sequences/`，组件在 `remotion/src/components/`
- 新增动画后需要：1) 在 `remotion/src/Root.tsx` 注册 Composition 2) 运行 `npm run render-videos` 3) 在 MDX 中添加 `<VideoEmbed compositionId="xxx" />`
- 动画自动播放、静音、循环（行为像内嵌动态图表）

### Pi 源码引用
- Pi 源码通过 git submodule 引入（`pi-mono/`），锁定特定 commit
- MDX 中的 SourceReader 组件引用 Pi 文件行号，修改后运行 `npm run validate-refs` 确认引用有效
- 尽量用函数名锚点而非行号

### Demo
- 每个 demo 包在 `demos/` 下，独立 package.json + tsconfig.json
- 所有 demo 支持 mock 模式（无 API Key 时自动切换）
- 共享工具在 `demos/shared/`（config.ts、utils.ts）
