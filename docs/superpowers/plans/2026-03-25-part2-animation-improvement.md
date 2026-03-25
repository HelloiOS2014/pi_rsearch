# Part 2 动画与交互改进 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Part 2 (Ch 9-14) 添加 6 个 Remotion 动画、3 个新交互组件、并将现有静态代码块升级为交互式组件，使体验与 Part 1 一致。

**Architecture:** 分三层推进——先构建基础设施（3 个新 React 组件），再创建 6 个 Remotion 动画，最后改造 6 章 MDX 整合所有内容。每层完成后可独立验证。

**Tech Stack:** React 19 (Islands)、Remotion 4.x、Astro 5 MDX、Tailwind CSS 4、TypeScript 5.9

**Spec:** `docs/superpowers/specs/2026-03-25-part2-animation-design.md`

---

## Existing Interactive Components (already in place)

The 6 Part 2 chapters already use SourceReader and CodeComparison extensively:
- Ch9: 2× SourceReader + 1× CodeComparison (传统 vs LLM 内存)
- Ch10: 5× SourceReader
- Ch11: 7× SourceReader + 1× CodeComparison
- Ch12: 8× SourceReader + 1× CodeComparison (Keep vs Fetch)
- Ch13: 4× SourceReader + 1× CodeComparison
- Ch14: 3× SourceReader

All `export const` code blocks are already rendered through interactive components. This plan adds what's genuinely missing: VideoEmbed animations, StepFlow, CollapseDetail, and AnimatedDiagram.

---

## File Structure

### New Files

```
src/components/tutorial/
├── StepFlow.tsx              # 步进式流程演示组件
├── CollapseDetail.tsx        # 可折叠深度解析组件
└── AnimatedDiagram.tsx       # CSS 动画架构图组件

remotion/src/sequences/
├── 09-harness/HarnessGaps.tsx     # Ch9 五道鸿沟桥接动画
├── 10-control/MessageRouting.tsx  # Ch10 三消息队列状态机
├── 11-trust/EditMatching.tsx      # Ch11 三阶段编辑匹配
├── 12-memory/MemoryHierarchy.tsx  # Ch12 四层记忆金字塔
├── 13-adapt/ConfigMerge.tsx       # Ch13 配置分层合并
└── 14-deliver/DeliveryFanout.tsx  # Ch14 事件流分发扇出
```

### Modified Files

```
remotion/src/Root.tsx              # 注册 6 个新 Composition
remotion/render-batch.ts           # 添加 6 个新 compositionId 到渲染列表
src/content/chapters/09-harness-engineering.mdx  # 添加 VideoEmbed + 升级代码块
src/content/chapters/10-control-loop.mdx         # 同上
src/content/chapters/11-boundary-trust.mdx       # 同上
src/content/chapters/12-memory-attention.mdx     # 同上
src/content/chapters/13-adaptation.mdx           # 同上
src/content/chapters/14-delivery.mdx             # 同上
```

---

## Task 1: StepFlow 交互组件

**Files:**
- Create: `src/components/tutorial/StepFlow.tsx`

- [ ] **Step 1: 创建 StepFlow 组件**

```tsx
// src/components/tutorial/StepFlow.tsx
import React, { useState, useMemo } from 'react';

interface Step {
  title: string;
  content: string;
  code?: string;
}

interface StepFlowProps {
  steps: Step[];
}

// 复用 SourceReader 的语法高亮函数
const KW = new Set('import,export,from,const,let,var,function,return,if,else,for,while,do,switch,case,break,continue,new,this,class,extends,implements,interface,type,enum,async,await,yield,try,catch,finally,throw,typeof,instanceof,in,of,void,delete,default,true,false,null,undefined,as,is,keyof,readonly,static,public,private,protected,abstract,declare'.split(','));
const BI = new Set('console,process,Promise,Array,Object,String,Number,Boolean,Map,Set,Error,JSON,Math,Date,RegExp,Symbol,Buffer,setTimeout,fetch,AbortController'.split(','));

function hl(text: string): JSX.Element[] {
  const out: JSX.Element[] = [];
  const re = /(\/\/.*$|\/\*.*?\*\/|^\s*\*\s.*$|^\s*\*\/$|^\s*\/\*\*?.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+\.?\d*\b)|(\b[a-zA-Z_$][\w$]*\b)|(=>|\.\.\.|\?\.|&&|\|\||[!=]==?|[<>]=?|[{}()[\];:,.])|(\s+)/g;
  let m: RegExpExecArray | null, last = 0, k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    const [full, cmt, str, num, id] = m;
    const c = cmt ? '#5c6370' : str ? '#98c379' : num ? '#d19a66'
      : id ? (KW.has(id) ? '#c678dd' : BI.has(id) || /^[A-Z]/.test(id) ? '#e5c07b' : '#abb2bf') : '#56b6c2';
    out.push(<span key={k++} style={{ color: c, ...(cmt ? { fontStyle: 'italic' as const } : {}) }}>{full}</span>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(<span key={k++}>{text.slice(last)}</span>);
  return out;
}

export default function StepFlow({ steps }: StepFlowProps) {
  const [current, setCurrent] = useState(0);

  return (
    <div style={{
      margin: '1.5rem 0', borderRadius: 8, overflow: 'hidden',
      border: '1px solid var(--border, #2a2a3a)', background: 'var(--bg-card, #1e1e2e)',
    }}>
      {/* Progress bar */}
      <div style={{
        display: 'flex', gap: 2, padding: '12px 14px',
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid var(--border, #2a2a3a)',
      }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= current ? 'var(--accent, #D97757)' : 'rgba(255,255,255,0.08)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Step content */}
      <div style={{ padding: '16px 14px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--accent, #D97757)', color: '#fff',
            fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
          }}>{current + 1}</span>
          <span style={{
            fontSize: '0.95rem', fontWeight: 600,
            color: 'var(--text-primary, #e0e0e0)',
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}>{steps[current].title}</span>
          <span style={{
            marginLeft: 'auto', fontSize: '0.75rem',
            color: 'var(--text-muted)', flexShrink: 0,
          }}>{current + 1} / {steps.length}</span>
        </div>

        <p style={{
          margin: '0 0 12px', color: 'var(--text-secondary, #b0b0c0)',
          fontSize: '0.875rem', lineHeight: 1.6,
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>{steps[current].content}</p>

        {steps[current].code && (
          <pre style={{
            margin: '0 0 12px', padding: '10px 12px', borderRadius: 6,
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)',
            fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
            fontSize: '0.8125rem', lineHeight: 1.6, overflowX: 'auto',
          }}>
            <code>{steps[current].code!.split('\n').map((line, i) => (
              <div key={i} style={{ whiteSpace: 'pre' }}>{hl(line)}</div>
            ))}</code>
          </pre>
        )}
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', padding: '0 14px 12px',
      }}>
        <button
          onClick={() => setCurrent(Math.max(0, current - 1))}
          disabled={current === 0}
          style={{
            padding: '5px 14px', borderRadius: 4, border: '1px solid var(--border, #2a2a3a)',
            background: 'transparent', color: current === 0 ? 'var(--text-muted)' : 'var(--text-primary, #e0e0e0)',
            cursor: current === 0 ? 'not-allowed' : 'pointer',
            fontSize: '0.8125rem', fontFamily: "'DM Sans', system-ui",
            opacity: current === 0 ? 0.4 : 1,
          }}
        >← 上一步</button>
        <button
          onClick={() => setCurrent(Math.min(steps.length - 1, current + 1))}
          disabled={current === steps.length - 1}
          style={{
            padding: '5px 14px', borderRadius: 4, border: 'none',
            background: current === steps.length - 1 ? 'rgba(255,255,255,0.05)' : 'var(--accent, #D97757)',
            color: '#fff', cursor: current === steps.length - 1 ? 'not-allowed' : 'pointer',
            fontSize: '0.8125rem', fontFamily: "'DM Sans', system-ui",
            opacity: current === steps.length - 1 ? 0.4 : 1,
          }}
        >下一步 →</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

```bash
cd /Users/panghu/code/rsearch/pi_demo/pi-tutorial
npx tsc --noEmit --skipLibCheck src/components/tutorial/StepFlow.tsx
```

Expected: 无错误输出

- [ ] **Step 3: Commit**

```bash
git add src/components/tutorial/StepFlow.tsx
git commit -m "feat: add StepFlow interactive component for Part 2"
```

---

## Task 2: CollapseDetail 交互组件

**Files:**
- Create: `src/components/tutorial/CollapseDetail.tsx`

- [ ] **Step 1: 创建 CollapseDetail 组件**

```tsx
// src/components/tutorial/CollapseDetail.tsx
import React, { useState, useRef, useEffect } from 'react';

interface CollapseDetailProps {
  title: string;
  children: React.ReactNode;
}

export default function CollapseDetail({ title, children }: CollapseDetailProps) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [children, open]);

  return (
    <div style={{
      margin: '1.5rem 0', borderRadius: 8, overflow: 'hidden',
      border: '1px solid var(--border, #2a2a3a)',
      background: 'var(--bg-card, #1e1e2e)',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '10px 14px',
          background: 'rgba(255,255,255,0.02)', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{
          color: 'var(--accent, #D97757)', fontSize: '0.75rem',
          transition: 'transform 0.2s',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          flexShrink: 0,
        }}>▶</span>
        <span style={{
          color: 'var(--text-primary, #e0e0e0)',
          fontSize: '0.875rem', fontWeight: 600,
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>{title}</span>
      </button>

      <div style={{
        maxHeight: open ? height : 0,
        overflow: 'hidden',
        transition: 'max-height 0.3s ease',
      }}>
        <div ref={contentRef} style={{
          padding: '0 14px 14px',
          borderLeft: '3px solid var(--accent, #D97757)',
          marginLeft: 14,
          color: 'var(--text-secondary, #b0b0c0)',
          fontSize: '0.875rem', lineHeight: 1.7,
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

```bash
npx tsc --noEmit --skipLibCheck src/components/tutorial/CollapseDetail.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/tutorial/CollapseDetail.tsx
git commit -m "feat: add CollapseDetail collapsible component for Part 2"
```

---

## Task 3: AnimatedDiagram 交互组件

**Files:**
- Create: `src/components/tutorial/AnimatedDiagram.tsx`

- [ ] **Step 1: 创建 AnimatedDiagram 组件**

组件支持三种布局类型（tree、flow、layers），使用 IntersectionObserver 实现滚动触发入场动画。

```tsx
// src/components/tutorial/AnimatedDiagram.tsx
import React, { useRef, useState, useEffect } from 'react';

// --- Type definitions ---
interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  highlight?: boolean;
  annotation?: string;
}
interface TreeData { root: TreeNode; direction?: 'top-down' | 'left-right'; }

interface FlowNode { id: string; label: string; type?: 'event' | 'handler' | 'endpoint'; }
interface FlowEdge { from: string; to: string; label?: string; }
interface FlowData { nodes: FlowNode[]; edges: FlowEdge[]; }

interface Layer { id: string; label: string; items: string[]; color?: string; }
interface LayersData { layers: Layer[]; direction?: 'top-down' | 'bottom-up'; }

type AnimatedDiagramProps =
  | { type: 'tree'; data: TreeData }
  | { type: 'flow'; data: FlowData }
  | { type: 'layers'; data: LayersData };

// --- Visibility hook ---
function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// --- Shared styles ---
const ACCENT = '#D97757';
const nodeBase: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 600,
  fontFamily: "'DM Sans', system-ui, sans-serif", textAlign: 'center',
  transition: 'all 0.4s ease', whiteSpace: 'nowrap',
};

// --- Tree renderer ---
function TreeView({ data, visible }: { data: TreeData; visible: boolean }) {
  const renderNode = (node: TreeNode, depth: number, index: number): React.ReactNode => {
    const delay = depth * 0.15 + index * 0.08;
    return (
      <div key={node.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{
          ...nodeBase,
          border: `1px solid ${node.highlight ? ACCENT : 'var(--border, #2a2a3a)'}`,
          background: node.highlight ? `${ACCENT}15` : 'var(--bg-card, #1e1e2e)',
          color: node.highlight ? ACCENT : 'var(--text-primary, #e0e0e0)',
          opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transitionDelay: `${delay}s`,
        }}>
          {node.label}
          {node.annotation && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>
              {node.annotation}
            </div>
          )}
        </div>
        {node.children && node.children.length > 0 && (
          <>
            <div style={{
              width: 1, height: 16, background: 'rgba(255,255,255,0.15)',
              opacity: visible ? 1 : 0, transition: 'opacity 0.3s', transitionDelay: `${delay + 0.1}s`,
            }} />
            <div style={{ display: 'flex', gap: 16 }}>
              {node.children.map((child, i) => renderNode(child, depth + 1, i))}
            </div>
          </>
        )}
      </div>
    );
  };
  return <div style={{ display: 'flex', justifyContent: 'center' }}>{renderNode(data.root, 0, 0)}</div>;
}

// --- Flow renderer ---
function FlowView({ data, visible }: { data: FlowData; visible: boolean }) {
  const typeColor = (t?: string) => t === 'event' ? '#4ade80' : t === 'handler' ? '#60a5fa' : t === 'endpoint' ? ACCENT : 'var(--text-primary, #e0e0e0)';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
      {data.nodes.map((node, i) => {
        const edge = data.edges.find(e => e.from === node.id);
        return (
          <React.Fragment key={node.id}>
            <div style={{
              ...nodeBase,
              border: `1px solid ${typeColor(node.type)}40`,
              background: `${typeColor(node.type)}10`,
              color: typeColor(node.type),
              opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.85)',
              transitionDelay: `${i * 0.08}s`,
            }}>{node.label}</div>
            {edge && (
              <div style={{
                color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                opacity: visible ? 1 : 0, transition: 'opacity 0.3s',
                transitionDelay: `${i * 0.08 + 0.05}s`,
              }}>
                <span>→</span>
                {edge.label && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{edge.label}</span>}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// --- Layers renderer ---
function LayersView({ data, visible }: { data: LayersData; visible: boolean }) {
  const layers = data.direction === 'bottom-up' ? [...data.layers].reverse() : data.layers;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {layers.map((layer, i) => (
        <div key={layer.id} style={{
          padding: '10px 14px', borderRadius: 6,
          border: `1px solid ${layer.color || ACCENT}30`,
          background: `${layer.color || ACCENT}08`,
          opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-16px)',
          transition: 'all 0.4s ease', transitionDelay: `${i * 0.12}s`,
        }}>
          <div style={{
            fontSize: '0.8125rem', fontWeight: 700, marginBottom: 4,
            color: layer.color || ACCENT, fontFamily: "'DM Sans', system-ui",
          }}>{layer.label}</div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6,
          }}>
            {layer.items.map(item => (
              <span key={item} style={{
                padding: '2px 8px', borderRadius: 3, fontSize: '0.75rem',
                background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary, #b0b0c0)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>{item}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Main component ---
export default function AnimatedDiagram(props: AnimatedDiagramProps) {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} style={{
      margin: '1.5rem 0', padding: 20, borderRadius: 8,
      border: '1px solid var(--border, #2a2a3a)',
      background: 'var(--bg-card, #1e1e2e)',
    }}>
      {props.type === 'tree' && <TreeView data={props.data} visible={visible} />}
      {props.type === 'flow' && <FlowView data={props.data} visible={visible} />}
      {props.type === 'layers' && <LayersView data={props.data} visible={visible} />}
    </div>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

```bash
npx tsc --noEmit --skipLibCheck src/components/tutorial/AnimatedDiagram.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/tutorial/AnimatedDiagram.tsx
git commit -m "feat: add AnimatedDiagram component with tree/flow/layers layouts"
```

---

## Task 4: Remotion 动画 — Ch9 HarnessGaps

**Files:**
- Create: `remotion/src/sequences/09-harness/HarnessGaps.tsx`

- [ ] **Step 1: 创建 HarnessGaps 动画**

动画概念：Agent Core 在中心，5 个鸿沟环形排列在外圈，桥梁依次从中心延伸到各鸿沟。

```tsx
// remotion/src/sequences/09-harness/HarnessGaps.tsx
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const ACCENT = "#D97757";

const GAPS = [
  { label: "控制", chapter: "Ch10", color: "#60a5fa", angle: -90 },
  { label: "边界与信任", chapter: "Ch11", color: "#fbbf24", angle: -18 },
  { label: "记忆", chapter: "Ch12", color: "#a78bfa", angle: 54 },
  { label: "适应", chapter: "Ch13", color: "#f472b6", angle: 126 },
  { label: "交付", chapter: "Ch14", color: "#22d3ee", angle: 198 },
];

export const HarnessGaps: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const exitOpacity = interpolate(frame, [260, 300], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Core node appears
  const coreScale = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 150 } });

  // Harness ring
  const ringOpacity = interpolate(frame, [30, 50], [0, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const CX = 960, CY = 540, RADIUS = 300;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a1a", opacity: bgOpacity * exitOpacity }}>
      {/* Harness ring */}
      <div style={{
        position: "absolute", left: CX - RADIUS, top: CY - RADIUS,
        width: RADIUS * 2, height: RADIUS * 2, borderRadius: "50%",
        border: `2px solid rgba(217,119,87,${ringOpacity})`,
      }} />

      {/* Center: Agent Core */}
      <div style={{
        position: "absolute", left: CX - 80, top: CY - 40,
        width: 160, height: 80, borderRadius: 12,
        background: `${ACCENT}18`, border: `2px solid ${ACCENT}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${coreScale})`,
        boxShadow: `0 0 40px ${ACCENT}30`,
      }}>
        <span style={{
          color: ACCENT, fontSize: 28, fontWeight: 700,
          fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
        }}>Agent Core</span>
      </div>

      {/* Gap nodes + bridges */}
      {GAPS.map((gap, i) => {
        const delay = 60 + i * 35;
        const rad = (gap.angle * Math.PI) / 180;
        const x = CX + RADIUS * Math.cos(rad);
        const y = CY + RADIUS * Math.sin(rad);

        // Bridge line grows from center to node
        const bridgeProgress = interpolate(frame, [delay, delay + 25], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });

        // Node appears
        const nodeOpacity = spring({ frame: frame - (delay + 15), fps, config: { damping: 14, stiffness: 180 } });

        const bx = CX + (x - CX) * bridgeProgress;
        const by = CY + (y - CY) * bridgeProgress;

        return (
          <React.Fragment key={gap.label}>
            {/* Bridge line */}
            <svg style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, pointerEvents: "none" }}>
              <line
                x1={CX} y1={CY} x2={bx} y2={by}
                stroke={gap.color} strokeWidth={2} strokeOpacity={0.5}
              />
            </svg>

            {/* Gap node */}
            <div style={{
              position: "absolute", left: x - 75, top: y - 35,
              width: 150, height: 70, borderRadius: 10,
              background: `${gap.color}12`, border: `1.5px solid ${gap.color}80`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              opacity: nodeOpacity, transform: `scale(${interpolate(nodeOpacity, [0, 1], [0.7, 1])})`,
            }}>
              <span style={{
                color: gap.color, fontSize: 20, fontWeight: 600,
                fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
              }}>{gap.label}</span>
              <span style={{
                color: `${gap.color}99`, fontSize: 13, fontWeight: 500,
                fontFamily: "'SF Mono', monospace", marginTop: 2,
              }}>{gap.chapter}</span>
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
mkdir -p remotion/src/sequences/09-harness
git add remotion/src/sequences/09-harness/HarnessGaps.tsx
git commit -m "feat: add HarnessGaps Remotion animation for Ch9"
```

---

## Task 5: Remotion 动画 — Ch10 MessageRouting

**Files:**
- Create: `remotion/src/sequences/10-control/MessageRouting.tsx`

- [ ] **Step 1: 创建 MessageRouting 动画**

动画概念：用户消息进入路由器，根据 Agent 状态分发到 Steering / FollowUp / NextTurn 三条管道。

实现要点：
- 左侧：用户消息气泡依次出现
- 中间：路由器节点，显示当前 Agent 状态（idle → streaming → idle 循环）
- 右侧三条管道，用不同颜色区分优先级（红/黄/蓝）
- 消息根据状态路由到不同管道，用 `interpolate` 控制消息移动轨迹
- 布局参考 `WhatIsAgent.tsx` 的左右分栏结构

关键 Remotion API：
```tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
// durationInFrames: 300 (10s @ 30fps)
```

组件导出名：`MessageRouting`

- [ ] **Step 2: Commit**

```bash
mkdir -p remotion/src/sequences/10-control
git add remotion/src/sequences/10-control/MessageRouting.tsx
git commit -m "feat: add MessageRouting Remotion animation for Ch10"
```

---

## Task 6: Remotion 动画 — Ch11 EditMatching

**Files:**
- Create: `remotion/src/sequences/11-trust/EditMatching.tsx`

- [ ] **Step 1: 创建 EditMatching 动画**

动画概念：双栏展示 LLM diff (token 空间) vs 文件内容 (byte 空间)，演示三阶段匹配过程。

实现要点：
- 左栏：LLM 输出的 diff 文本（包含智能引号 `""`）
- 右栏：文件内容（普通引号 `""`）
- 第一阶段（frame 30-80）：精确匹配，高亮比对，失败（红色 ✗）
- 第二阶段（frame 90-150）：normalize 两侧文本（Unicode 替换动画），重新比对，成功（绿色 ✓）
- 第三阶段备选路径（frame 160-200）：若 fuzzy 也失败时的错误信息构造展示
- 底部标签标注当前阶段名称

组件导出名：`EditMatching`，durationInFrames: 240 (8s)

- [ ] **Step 2: Commit**

```bash
mkdir -p remotion/src/sequences/11-trust
git add remotion/src/sequences/11-trust/EditMatching.tsx
git commit -m "feat: add EditMatching Remotion animation for Ch11"
```

---

## Task 7: Remotion 动画 — Ch12 MemoryHierarchy

**Files:**
- Create: `remotion/src/sequences/12-memory/MemoryHierarchy.tsx`

- [ ] **Step 1: 创建 MemoryHierarchy 动画**

动画概念：左侧四层金字塔 (L1-L4)，右侧 Keep vs Fetch 策略对比。

实现要点：
- 左侧：四层从上到下依次展开
  - L1 (Context Window): 小窄条，颜色 `#f87171`，标注"快但贵"
  - L2 (Compaction): 中等宽度，颜色 `#fbbf24`
  - L3 (Session Tree): 较宽，颜色 `#a78bfa`
  - L4 (External): 最宽，颜色 `#4ade80`，标注"无限但需 tool call"
- 右侧上方：Keep 策略 — 条形图线性增长，接近极限时变红
- 右侧下方：Fetch 策略 — 条形图保持有界（~60%），保持绿色
- 每层出现时标注容量/速度/成本

组件导出名：`MemoryHierarchy`，durationInFrames: 300 (10s)

- [ ] **Step 2: Commit**

```bash
mkdir -p remotion/src/sequences/12-memory
git add remotion/src/sequences/12-memory/MemoryHierarchy.tsx
git commit -m "feat: add MemoryHierarchy Remotion animation for Ch12"
```

---

## Task 8: Remotion 动画 — Ch13 ConfigMerge

**Files:**
- Create: `remotion/src/sequences/13-adapt/ConfigMerge.tsx`

- [ ] **Step 1: 创建 ConfigMerge 动画**

动画概念：四级配置瀑布式 deep merge，三种合并行为用不同颜色区分。

实现要点：
- 四层配置卡片从上到下出现：Enterprise → Organization → Project → User
- 每层包含 3-4 个 key-value 对
- 合并过程动画（自上而下）：
  - 原语覆盖：红色闪烁，旧值被划线删除，新值替换
  - 对象合并：蓝色箭头，两组 key 合并到一起
  - 数组替换：黄色闪烁，上层数组消失，下层数组移入
- 最底部：合成后的最终配置卡片，绿色边框

组件导出名：`ConfigMerge`，durationInFrames: 240 (8s)

- [ ] **Step 2: Commit**

```bash
mkdir -p remotion/src/sequences/13-adapt
git add remotion/src/sequences/13-adapt/ConfigMerge.tsx
git commit -m "feat: add ConfigMerge Remotion animation for Ch13"
```

---

## Task 9: Remotion 动画 — Ch14 DeliveryFanout

**Files:**
- Create: `remotion/src/sequences/14-deliver/DeliveryFanout.tsx`

- [ ] **Step 1: 创建 DeliveryFanout 动画**

动画概念：中心 AgentSession 事件流向四种交付模式扇出。

实现要点：
- 中心：AgentSession 节点，带脉动光晕
- 四条管道从中心向四个方向扇出：
  - 左上 TUI：终端图标，管道颜色 `#4ade80`
  - 右上 Print：JSON 图标，管道颜色 `#60a5fa`
  - 左下 RPC：双箭头图标，管道颜色 `#fbbf24`
  - 右下 SDK：代码图标，管道颜色 `#a78bfa`
- 事件粒子（小圆点）持续从中心沿管道流向各消费者
- 使用 `frame % period` 实现粒子持续流动的循环效果

组件导出名：`DeliveryFanout`，durationInFrames: 240 (8s)

- [ ] **Step 2: Commit**

```bash
mkdir -p remotion/src/sequences/14-deliver
git add remotion/src/sequences/14-deliver/DeliveryFanout.tsx
git commit -m "feat: add DeliveryFanout Remotion animation for Ch14"
```

---

## Task 10: 注册 Remotion Compositions + 渲染配置

**Files:**
- Modify: `remotion/src/Root.tsx`
- Modify: `remotion/render-batch.ts`

- [ ] **Step 1: 在 Root.tsx 注册 6 个新 Composition**

在 `remotion/src/Root.tsx` 文件末尾的 `</>` 之前，添加 6 个 import 和 6 个 `<Composition>`：

```tsx
// 新增 import（文件顶部）
import { HarnessGaps } from "./sequences/09-harness/HarnessGaps";
import { MessageRouting } from "./sequences/10-control/MessageRouting";
import { EditMatching } from "./sequences/11-trust/EditMatching";
import { MemoryHierarchy } from "./sequences/12-memory/MemoryHierarchy";
import { ConfigMerge } from "./sequences/13-adapt/ConfigMerge";
import { DeliveryFanout } from "./sequences/14-deliver/DeliveryFanout";

// 新增 Composition（在 ExtensionArch 之后，</> 之前）

{/* V28: Harness Gaps */}
<Composition id="HarnessGaps" component={HarnessGaps} durationInFrames={300} fps={30} width={1920} height={1080} />

{/* V29: Message Routing */}
<Composition id="MessageRouting" component={MessageRouting} durationInFrames={300} fps={30} width={1920} height={1080} />

{/* V30: Edit Matching */}
<Composition id="EditMatching" component={EditMatching} durationInFrames={240} fps={30} width={1920} height={1080} />

{/* V31: Memory Hierarchy */}
<Composition id="MemoryHierarchy" component={MemoryHierarchy} durationInFrames={300} fps={30} width={1920} height={1080} />

{/* V32: Config Merge */}
<Composition id="ConfigMerge" component={ConfigMerge} durationInFrames={240} fps={30} width={1920} height={1080} />

{/* V33: Delivery Fanout */}
<Composition id="DeliveryFanout" component={DeliveryFanout} durationInFrames={240} fps={30} width={1920} height={1080} />
```

- [ ] **Step 2: 在 render-batch.ts 添加新 compositionId**

在 `COMPOSITIONS` 数组末尾添加 6 个新 ID：

```ts
const COMPOSITIONS = [
  // ...existing...
  "ExtensionArch",
  // Part 2
  "HarnessGaps",
  "MessageRouting",
  "EditMatching",
  "MemoryHierarchy",
  "ConfigMerge",
  "DeliveryFanout",
];
```

- [ ] **Step 3: 验证 Remotion Studio 能加载新 Compositions**

```bash
cd /Users/panghu/code/rsearch/pi_demo/pi-tutorial
npm run remotion:dev
```

Expected: Remotion Studio 打开，左侧列表中能看到 6 个新 Composition 名称。

- [ ] **Step 4: Commit**

```bash
git add remotion/src/Root.tsx remotion/render-batch.ts
git commit -m "feat: register 6 new Part 2 Remotion compositions"
```

---

## Task 11: 改造 Ch9 MDX — Harness Engineering

**Files:**
- Modify: `src/content/chapters/09-harness-engineering.mdx`

- [ ] **Step 1: 添加 VideoEmbed import 和使用**

在文件顶部的 import 区域添加：
```tsx
import VideoEmbed from '../../components/tutorial/VideoEmbed.astro';
import StepFlow from '../../components/tutorial/StepFlow';
```

在 `## 理论框架` 的 `### 五个根本性鸿沟` 小节中，在五个鸿沟表格之后插入：

```tsx
<VideoEmbed compositionId="HarnessGaps" title="Harness 五道鸿沟" description="Agent Core 与现实世界之间的五道鸿沟，Harness 逐个桥接" duration="10s" />
```

- [ ] **Step 2: 添加 StepFlow 组件**

在 `## 你的 Agent 缺什么：Product Gap 分析` 小节的表格之前，添加步进式演示：

```tsx
<StepFlow client:visible steps={[
  { title: "Gap 1: 不可控", content: "Agent 执行期间无法中途纠偏，出错只能 Ctrl+C 杀进程。", code: "// Demo 06 的现状\nagent.run(task); // 启动后完全失控\n// 没有 steering、没有 follow-up、没有中断机制" },
  { title: "Gap 2: 不可靠", content: "工具调用频繁失败，edit 碰到 Unicode 差异就卡死，没有安全边界。" },
  { title: "Gap 3: 会遗忘", content: "Context Window 满了开始胡言乱语，关掉终端所有进度归零。" },
  { title: "Gap 4: 不适应", content: "换个项目就要改代码，不同用户需要不同配置但没有分层机制。" },
  { title: "Gap 5: 到不了用户手里", content: "只能在你的终端跑，没有 CLI/RPC/SDK 等多模式交付。" },
]} />
```

- [ ] **Step 3: 验证页面渲染**

```bash
npx astro dev
# 浏览器访问 http://localhost:4321/09-harness-engineering/
# 确认：VideoEmbed 显示 placeholder（视频未渲染）、StepFlow 可点击步进
```

- [ ] **Step 4: Commit**

```bash
git add src/content/chapters/09-harness-engineering.mdx
git commit -m "feat: add VideoEmbed and StepFlow to Ch9 Harness Engineering"
```

---

## Task 12: 改造 Ch10 MDX — Control Loop

**Files:**
- Modify: `src/content/chapters/10-control-loop.mdx`

- [ ] **Step 1: 添加 imports 和 VideoEmbed**

添加 imports：
```tsx
import VideoEmbed from '../../components/tutorial/VideoEmbed.astro';
import StepFlow from '../../components/tutorial/StepFlow';
```

在三消息队列相关内容（`codeMessageTypes` 代码块展示之后）插入：
```tsx
<VideoEmbed compositionId="MessageRouting" title="三消息队列" description="用户消息根据 Agent 状态路由到 Steering / FollowUp / NextTurn 三条队列" duration="10s" />
```

- [ ] **Step 2: 添加 StepFlow — 事件处理管道**

在事件队列相关代码块之后添加：
```tsx
<StepFlow client:visible steps={[
  { title: "同步创建 Retry Promise", content: "在事件回调中同步检查是否是 agent_end 事件，提前创建 retry promise，避免异步竞态。", code: "this._createRetryPromiseForAgentEnd(event);" },
  { title: "串入 Promise 链", content: "将事件处理函数 then 到队列尾部。无论前一个成功还是失败，都继续处理当前事件。", code: "this._agentEventQueue = this._agentEventQueue.then(\n  () => this._processAgentEvent(event),\n  () => this._processAgentEvent(event),\n);" },
  { title: "防止队列断裂", content: "尾部 catch 吞掉未捕获的 rejection，确保 Promise 链不会因为异常而断裂。", code: "this._agentEventQueue.catch(() => {});" },
]} />
```

- [ ] **Step 3: 添加 StepFlow — 错误恢复流程**

在 autoRetry 相关代码块之后添加：
```tsx
<StepFlow client:visible steps={[
  { title: "检测错误类型", content: "stopReason 是 error？是 context overflow 还是可重试错误？两者走不同的恢复路径。", code: "if (isContextOverflow(message, contextWindow)) {\n  // → 走压缩路径\n}\nreturn /overloaded|rate.?limit|429|500/.test(errorMessage);" },
  { title: "指数退避", content: "1s → 2s → 4s → 8s...每次翻倍，最多重试 maxRetries 次。退避期间可被 abort 中断。", code: "const delayMs = baseDelayMs * 2 ** (retryAttempt - 1);\nawait sleep(delayMs, abortController.signal);" },
  { title: "移除错误消息并重试", content: "从消息历史中移除最后一条错误消息，然后让 Agent 从干净状态继续。", code: "agent.replaceMessages(messages.slice(0, -1));\nsetTimeout(() => agent.continue(), 0);" },
]} />
```

- [ ] **Step 4: Commit**

```bash
git add src/content/chapters/10-control-loop.mdx
git commit -m "feat: add VideoEmbed and StepFlow to Ch10 Control Loop"
```

---

## Task 13: 改造 Ch11 MDX — Boundary & Trust

**Files:**
- Modify: `src/content/chapters/11-boundary-trust.mdx`

- [ ] **Step 1: 添加 imports 和 VideoEmbed**

添加 imports：
```tsx
import VideoEmbed from '../../components/tutorial/VideoEmbed.astro';
import StepFlow from '../../components/tutorial/StepFlow';
```

在三阶段匹配代码块之后插入：
```tsx
<VideoEmbed compositionId="EditMatching" title="三阶段匹配" description="exact → fuzzy(normalize) → error(有指引)，跨越 token 和 byte 空间" duration="8s" />
```

- [ ] **Step 2: 添加错误信息 CodeComparison**

在讨论错误信息质量的段落附近添加（需要先添加 export const）：

```tsx
export const codeErrorBadExample = `// 坏的错误信息
Error: edit failed`;

export const codeErrorGoodExample = `// 好的错误信息
Error: edit failed — exact match not found.
File: src/config.ts (line 42)
Searched for: "apiUrl"
Hint: The file contains smart quotes ("").
Try: Include more surrounding context,
     or check for Unicode differences.`;
```

然后在相关位置使用：
```tsx
<CodeComparison client:visible
  left={{ code: codeErrorBadExample, label: "没有指引的错误", language: "typescript" }}
  right={{ code: codeErrorGoodExample, label: "包含 cause + rule + fix 的错误", language: "typescript" }}
/>
```

- [ ] **Step 3: 添加 StepFlow — 截断策略**

```tsx
<StepFlow client:visible steps={[
  { title: "问题：工具输出可能很大", content: "一个 50MB 的日志文件、一个 10000 行的命令输出——全量注入上下文会淹没有用信息。" },
  { title: "文件内容 → truncateHead", content: "文件的开头通常最重要（import、类定义、函数签名），所以保留头部，截断尾部。", code: "// read 工具\nif (content.length > maxChars) {\n  return content.slice(0, maxChars) + '\\n[truncated]';\n}" },
  { title: "命令输出 → truncateTail", content: "命令的错误信息通常在末尾（stack trace、error message），所以保留尾部，截断头部。", code: "// bash 工具\nif (output.length > maxChars) {\n  return '[truncated]\\n' + output.slice(-maxChars);\n}" },
]} />
```

- [ ] **Step 4: Commit**

```bash
git add src/content/chapters/11-boundary-trust.mdx
git commit -m "feat: add VideoEmbed, CodeComparison and StepFlow to Ch11"
```

---

## Task 14: 改造 Ch12 MDX — Memory & Attention

**Files:**
- Modify: `src/content/chapters/12-memory-attention.mdx`

- [ ] **Step 1: 添加 imports 和 VideoEmbed**

```tsx
import VideoEmbed from '../../components/tutorial/VideoEmbed.astro';
import StepFlow from '../../components/tutorial/StepFlow';
import AnimatedDiagram from '../../components/tutorial/AnimatedDiagram';
```

在记忆层级讨论之后插入：
```tsx
<VideoEmbed compositionId="MemoryHierarchy" title="四层记忆金字塔" description="L1 工作记忆 → L2 压缩 → L3 持久会话 → L4 外部记忆，以及 Keep vs Fetch 策略对比" duration="10s" />
```

- [ ] **Step 2: 添加 Session Tree AnimatedDiagram**

在 `codeBranchMechanism` 代码块展示之后添加：

```tsx
<AnimatedDiagram client:visible type="tree" data={{
  root: {
    id: "root", label: "Session Root",
    children: [
      {
        id: "msg1", label: "用户: 修复 bug",
        children: [
          {
            id: "msg2", label: "助手: 分析代码",
            children: [
              { id: "branch-a", label: "分支 A: 方案一", highlight: true, annotation: "当前分支" },
              { id: "branch-b", label: "分支 B: 方案二", annotation: "旧分支（保留）" },
            ]
          }
        ]
      }
    ]
  }
}} />
```

- [ ] **Step 3: 添加 StepFlow — 压缩决策流程**

```tsx
<StepFlow client:visible steps={[
  { title: "检查 Token 用量", content: "每次 turn 结束后，计算当前上下文的 token 数。超过阈值（默认 75%）才触发压缩。", code: "if (shouldCompact(contextTokens, contextWindow, settings)) {\n  await this._runAutoCompaction('threshold', false);\n}" },
  { title: "找到切割点", content: "从最新消息向前回溯，保留最近的 keepRecentTokens 条消息不压缩。切割点之前的消息将被摘要替代。", code: "const cutPoint = findCutPoint(\n  entries, startIndex, endIndex,\n  keepRecentTokens\n);" },
  { title: "生成摘要", content: "将切割点之前的消息发送给 LLM，生成一段简洁的摘要。这个摘要捕获关键事实和决策。" },
  { title: "替换为 CompactionEntry", content: "删除原始消息，插入 CompactionEntry。后续 LLM 调用只看到摘要 + 最近的消息。", code: "const entry: CompactionEntry = {\n  type: 'compaction',\n  summary,  // LLM 生成的摘要\n  id: generateId(this.byId),\n  parentId: cutPointId,\n};" },
]} />
```

- [ ] **Step 4: Commit**

```bash
git add src/content/chapters/12-memory-attention.mdx
git commit -m "feat: add VideoEmbed, AnimatedDiagram and StepFlow to Ch12"
```

---

## Task 15: 改造 Ch13 MDX — Adaptation

**Files:**
- Modify: `src/content/chapters/13-adaptation.mdx`

- [ ] **Step 1: 添加 imports 和 VideoEmbed**

```tsx
import VideoEmbed from '../../components/tutorial/VideoEmbed.astro';
import StepFlow from '../../components/tutorial/StepFlow';
import CollapseDetail from '../../components/tutorial/CollapseDetail';
import AnimatedDiagram from '../../components/tutorial/AnimatedDiagram';
```

在 deep merge 代码块之后插入：
```tsx
<VideoEmbed compositionId="ConfigMerge" title="配置分层合并" description="Enterprise → Org → Project → User 的 deep merge：覆盖、合并、替换三种行为" duration="8s" />
```

- [ ] **Step 2: 添加 StepFlow — deep merge 三种行为**

```tsx
<StepFlow client:visible steps={[
  { title: "原语值：直接覆盖", content: "number、string、boolean 类型的值，下层直接胜出。User 设置的 maxRetries=5 会覆盖 Enterprise 的 maxRetries=3。", code: "// Enterprise: { maxRetries: 3 }\n// User:       { maxRetries: 5 }\n// Result:     { maxRetries: 5 }  ← User 胜出" },
  { title: "嵌套对象：浅合并", content: "对象类型的值，两层的 key 合并到一起。User 只需要指定要覆盖的 key，其余从上层继承。", code: "// Enterprise: { compaction: { enabled: true, threshold: 0.75 } }\n// User:       { compaction: { threshold: 0.6 } }\n// Result:     { compaction: { enabled: true, threshold: 0.6 } }" },
  { title: "数组：整体替换", content: "数组类型的值不会合并——下层数组直接替换上层。这是有意的设计：数组合并的语义太模糊（追加？去重？排序？）。", code: "// Enterprise: { allowedTools: ['read', 'edit', 'bash'] }\n// User:       { allowedTools: ['read', 'edit'] }\n// Result:     { allowedTools: ['read', 'edit'] }  ← 整体替换" },
]} />
```

- [ ] **Step 3: 添加 CollapseDetail — Skill 渐进式加载**

```tsx
<CollapseDetail client:visible title="深入：Skill 的渐进式披露机制">
  <p>Skills 系统遵循成本反转原理。metadata（名称、描述、触发条件）常驻在 system prompt 中，总共只占几百 token。但每个 Skill 的完整内容可能有数千 token。</p>
  <p>当 Agent 判断需要某个 Skill 时，通过 Skill tool 按需加载完整内容。这样既保证了 Agent 知道有哪些 Skill 可用，又不会用大量 Skill 内容污染上下文。</p>
  <p>这正是"按需取回"优于"常驻保留"的又一个例子。</p>
</CollapseDetail>
```

- [ ] **Step 4: 添加 AnimatedDiagram — 三层分离**

```tsx
<AnimatedDiagram client:visible type="layers" data={{
  layers: [
    { id: "knowledge", label: "知识层 Knowledge", items: ["CLAUDE.md", "AGENTS.md", ".cursorrules"], color: "#4ade80" },
    { id: "capability", label: "能力层 Capability", items: ["Skills", "MCP Servers", "Custom Tools"], color: "#60a5fa" },
    { id: "policy", label: "策略层 Policy", items: ["Settings", "Permissions", "Model Config"], color: "#f472b6" },
  ],
  direction: "top-down",
}} />
```

- [ ] **Step 5: Commit**

```bash
git add src/content/chapters/13-adaptation.mdx
git commit -m "feat: add VideoEmbed, StepFlow, CollapseDetail and AnimatedDiagram to Ch13"
```

---

## Task 16: 改造 Ch14 MDX — Delivery

**Files:**
- Modify: `src/content/chapters/14-delivery.mdx`

- [ ] **Step 1: 添加 imports 和 VideoEmbed**

```tsx
import VideoEmbed from '../../components/tutorial/VideoEmbed.astro';
import AnimatedDiagram from '../../components/tutorial/AnimatedDiagram';
```

在交付模式讨论的位置插入：
```tsx
<VideoEmbed compositionId="DeliveryFanout" title="事件流分发" description="AgentSession 的事件流扇出到 TUI / Print / RPC / SDK 四种交付模式" duration="8s" />
```

- [ ] **Step 2: 添加 CodeComparison — Text vs JSON mode**

添加 export const（如果还没有的话）：
```tsx
export const codeTextModeOutput = `$ pi --print "explain this function"
This function takes a configuration object
and merges it with the default settings
using a deep merge strategy...`;

export const codeJsonModeOutput = `$ pi --print --output-format json "explain this function"
{"type":"message_start","message":{"role":"assistant"}}
{"type":"content_block_delta","delta":{"text":"This function"}}
{"type":"content_block_delta","delta":{"text":" takes a config"}}
{"type":"message_stop"}`;
```

```tsx
<CodeComparison client:visible
  left={{ code: codeTextModeOutput, label: "Text Mode — 只输出最终文本", language: "bash" }}
  right={{ code: codeJsonModeOutput, label: "JSON Mode — 流式事件序列", language: "json" }}
/>
```

- [ ] **Step 3: 添加 AnimatedDiagram — Hook 事件点**

```tsx
<AnimatedDiagram client:visible type="flow" data={{
  nodes: [
    { id: "start", label: "Agent Start", type: "event" },
    { id: "tool-call", label: "Tool Call", type: "event" },
    { id: "before-hook", label: "beforeToolCall", type: "handler" },
    { id: "execute", label: "Tool Execute", type: "endpoint" },
    { id: "after-hook", label: "afterToolCall", type: "handler" },
    { id: "result", label: "Tool Result", type: "event" },
  ],
  edges: [
    { from: "start", to: "tool-call" },
    { from: "tool-call", to: "before-hook", label: "intercept" },
    { from: "before-hook", to: "execute", label: "allow/deny" },
    { from: "execute", to: "after-hook" },
    { from: "after-hook", to: "result" },
  ],
}} />
```

- [ ] **Step 4: Commit**

```bash
git add src/content/chapters/14-delivery.mdx
git commit -m "feat: add VideoEmbed, CodeComparison and AnimatedDiagram to Ch14"
```

---

## Task 17: 渲染视频 + 最终验证

**Files:** (no new files)

- [ ] **Step 1: 渲染 6 个新动画**

```bash
cd /Users/panghu/code/rsearch/pi_demo/pi-tutorial
npm run render-videos
```

Expected: 6 个新 MP4 文件出现在 `public/videos/`：
- `HarnessGaps.mp4`
- `MessageRouting.mp4`
- `EditMatching.mp4`
- `MemoryHierarchy.mp4`
- `ConfigMerge.mp4`
- `DeliveryFanout.mp4`

- [ ] **Step 2: 验证 Astro build 通过**

```bash
npx astro build
```

Expected: 构建成功，无错误

- [ ] **Step 3: 开发服务器人工验证**

```bash
npx astro dev
```

逐章检查（http://localhost:4321/）：
- 每章的 VideoEmbed 能正常播放动画
- StepFlow 组件可点击步进，前后切换正常
- CollapseDetail 可展开/折叠
- AnimatedDiagram 滚动进入视口时有入场动画
- CodeComparison 可切换上下/左右布局
- 既有 SourceReader 功能不受影响

- [ ] **Step 4: Commit**

```bash
git add public/videos/
git commit -m "feat: render Part 2 Remotion videos"
```

---

## Summary

| Task | 内容 | 关键文件 |
|------|------|---------|
| 1 | StepFlow 组件 | `src/components/tutorial/StepFlow.tsx` |
| 2 | CollapseDetail 组件 | `src/components/tutorial/CollapseDetail.tsx` |
| 3 | AnimatedDiagram 组件 | `src/components/tutorial/AnimatedDiagram.tsx` |
| 4 | Ch9 HarnessGaps 动画 | `remotion/src/sequences/09-harness/HarnessGaps.tsx` |
| 5 | Ch10 MessageRouting 动画 | `remotion/src/sequences/10-control/MessageRouting.tsx` |
| 6 | Ch11 EditMatching 动画 | `remotion/src/sequences/11-trust/EditMatching.tsx` |
| 7 | Ch12 MemoryHierarchy 动画 | `remotion/src/sequences/12-memory/MemoryHierarchy.tsx` |
| 8 | Ch13 ConfigMerge 动画 | `remotion/src/sequences/13-adapt/ConfigMerge.tsx` |
| 9 | Ch14 DeliveryFanout 动画 | `remotion/src/sequences/14-deliver/DeliveryFanout.tsx` |
| 10 | 注册 Compositions + 渲染配置 | `remotion/src/Root.tsx`, `remotion/render-batch.ts` |
| 11 | 改造 Ch9 MDX | `src/content/chapters/09-harness-engineering.mdx` |
| 12 | 改造 Ch10 MDX | `src/content/chapters/10-control-loop.mdx` |
| 13 | 改造 Ch11 MDX | `src/content/chapters/11-boundary-trust.mdx` |
| 14 | 改造 Ch12 MDX | `src/content/chapters/12-memory-attention.mdx` |
| 15 | 改造 Ch13 MDX | `src/content/chapters/13-adaptation.mdx` |
| 16 | 改造 Ch14 MDX | `src/content/chapters/14-delivery.mdx` |
| 17 | 渲染视频 + 最终验证 | `public/videos/*.mp4` |
