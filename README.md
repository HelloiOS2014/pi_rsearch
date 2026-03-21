# Pi Agent 深度教程

> 从 1,900 行代码理解 Agent 的本质

一个交互式教程网站，通过解剖 [Pi](https://github.com/badlogic/pi-mono)（极简开源 AI 编码智能体）的源码，从零理解并构建自己的 Agent 框架。

## 快速开始

```bash
git clone --recurse-submodules git@github.com:HelloiOS2014/pi_rsearch.git
cd pi_rsearch
npm install
npx astro dev
```

打开 http://localhost:4321/ 开始学习。

## 项目结构

```
pi-tutorial/
├── src/                    # Astro 教程站点
│   ├── content/chapters/   # 9 章 MDX 内容 + 6 附录
│   ├── components/
│   │   ├── tutorial/       # SourceReader, CodeComparison, VideoEmbed
│   │   └── layout/         # Sidebar, ChapterLayout, TOC, Footer
│   └── pages/              # Landing page + 动态路由
│
├── demos/                  # 可独立运行的 Demo 代码
│   ├── shared/             # 共享工具（API key 管理、mock stream）
│   ├── 01-hello-agent/     # 裸 LLM → 工具调用 → Agent Loop
│   ├── 02-mini-loop/       # 单轮 → 多轮 → 事件 → steering → abort
│   ├── 03-tool-system/     # schema → registry → 并行 → hooks
│   ├── 04-streaming/       # EventStream → 流式文本 → proxy
│   ├── 05-multi-model/     # provider → 统一 API → 跨 provider 转换
│   ├── 06-my-agent/        # 完整 coding agent（capstone）
│   ├── 07-comparison/      # Pi vs LangChain vs Vercel 风格对比
│   └── 08-extensions/      # 扩展系统实践
│
├── remotion/               # Remotion 动画项目（10 个动画）
├── pi-mono/                # Pi 源码（git submodule）
└── scripts/                # 工具脚本
```

## 章节目录

| 章节 | 标题 | 内容 |
|------|------|------|
| 0 | 全景导读 | Agent 定义、Pi 哲学、三层架构、学习路线 |
| 1 | Agent 全景 | ReAct 模式、Pi 架构鸟瞰、30 行最小 Agent |
| 2 | 核心循环 | agent-loop.ts 逐段精读、双层循环、边界行为 |
| 3 | 工具系统 | 类型体系、内置工具解剖、三阶段管道、hooks |
| 4 | 流式与事件 | EventStream、13+12 种事件、Proxy 传输层 |
| 5 | 多模型统一 | 20+ provider 适配、消息转换、Thinking 统一 |
| 6 | 构建完整 Agent | System Prompt、会话管理、Compaction、可靠性 |
| 7 | 框架对比 | Pi vs Claude Code vs LangChain vs Vercel AI SDK |
| 8 | 进阶扩展 | 扩展系统、TUI/Web UI、Skills、产品化 |
| A-F | 附录 | API 速查、术语表、FAQ、CLI、Settings、自定义模型 |

## 运行 Demo

每个 Demo 都可以独立运行：

```bash
# 需要设置 API Key（或使用 mock 模式）
export ANTHROPIC_API_KEY="sk-ant-..."

# 运行具体 demo
npx tsx demos/01-hello-agent/src/01-raw-llm-call.ts
npx tsx demos/02-mini-loop/src/03-with-events.ts
npx tsx demos/06-my-agent/src/main.ts
```

没有 API Key 时自动进入 mock 模式，仍可观察执行流程。

## 视频渲染

教程内嵌的动画由 Remotion 生成。首次使用或修改动画后需要渲染：

```bash
npm run render-videos
```

渲染 10 个 MP4 到 `public/videos/`（约 10MB），动画在页面中自动播放循环。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npx astro dev` | 启动开发服务器 |
| `npx astro build` | 构建静态站点 |
| `npm run render-videos` | 渲染 Remotion 动画 |
| `npm run validate-refs` | 校验 Pi 源码行号引用 |
| `npm run remotion:dev` | 打开 Remotion Studio 预览动画 |

## 技术栈

- [Astro](https://astro.build/) 5.x — 静态站点生成
- [React](https://react.dev/) 19 — 交互组件（Islands）
- [MDX](https://mdxjs.com/) — 内容编写
- [Remotion](https://www.remotion.dev/) 4.x — 动画渲染
- [Tailwind CSS](https://tailwindcss.com/) 4 — 样式
- [TypeScript](https://www.typescriptlang.org/) 5.9 — 类型安全

## License

MIT
