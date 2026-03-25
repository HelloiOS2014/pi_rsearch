import React, { useState, useEffect, useRef } from 'react';

/* ─── Types ─── */

interface EventDef {
  label: string;
  color: string;
  category: string;
  description?: string;
  repeat?: number; // indicates a repeating event group
}

/* ─── Color constants ─── */

const CATEGORY_COLORS: Record<string, string> = {
  agent: '#6e8efb',
  turn: '#4ade80',
  message: '#D97757',
  tool: '#a78bfa',
};

/* ─── Event data ─── */

const SIMPLE_EVENTS: EventDef[] = [
  { label: 'agent_start', color: CATEGORY_COLORS.agent, category: 'agent', description: 'Agent 开始执行' },
  { label: 'turn_start', color: CATEGORY_COLORS.turn, category: 'turn', description: '新的对话轮次' },
  { label: 'message_start', color: CATEGORY_COLORS.message, category: 'message', description: '消息创建' },
  { label: 'message_update', color: CATEGORY_COLORS.message, category: 'message', description: '流式内容到达', repeat: 3 },
  { label: 'message_end', color: CATEGORY_COLORS.message, category: 'message', description: '消息完成' },
  { label: 'turn_end', color: CATEGORY_COLORS.turn, category: 'turn', description: '轮次结束' },
  { label: 'agent_end', color: CATEGORY_COLORS.agent, category: 'agent', description: 'Agent 执行完毕' },
];

const TOOL_EVENTS: EventDef[] = [
  { label: 'agent_start', color: CATEGORY_COLORS.agent, category: 'agent', description: 'Agent 开始执行' },
  { label: 'turn_start', color: CATEGORY_COLORS.turn, category: 'turn', description: '新的对话轮次' },
  { label: 'message_start', color: CATEGORY_COLORS.message, category: 'message', description: '模型消息（含 tool_use）' },
  { label: 'message_update', color: CATEGORY_COLORS.message, category: 'message', description: '流式内容' },
  { label: 'message_end', color: CATEGORY_COLORS.message, category: 'message', description: '消息完成' },
  { label: 'tool_execution_start', color: CATEGORY_COLORS.tool, category: 'tool', description: '开始执行工具' },
  { label: 'tool_update', color: CATEGORY_COLORS.tool, category: 'tool', description: '工具输出流' },
  { label: 'tool_execution_end', color: CATEGORY_COLORS.tool, category: 'tool', description: '工具执行完毕' },
  { label: 'message_start', color: CATEGORY_COLORS.message, category: 'message', description: '工具结果后的回复' },
  { label: 'message_update', color: CATEGORY_COLORS.message, category: 'message', description: '流式内容' },
  { label: 'message_end', color: CATEGORY_COLORS.message, category: 'message', description: '消息完成' },
  { label: 'turn_end', color: CATEGORY_COLORS.turn, category: 'turn', description: '轮次结束' },
  { label: 'agent_end', color: CATEGORY_COLORS.agent, category: 'agent', description: 'Agent 执行完毕' },
];

const LEGEND_ITEMS = [
  { label: 'Agent 生命周期', color: CATEGORY_COLORS.agent },
  { label: 'Turn 生命周期', color: CATEGORY_COLORS.turn },
  { label: 'Message 生命周期', color: CATEGORY_COLORS.message },
  { label: 'Tool 生命周期', color: CATEGORY_COLORS.tool },
];

/* ─── Hook: IntersectionObserver trigger ─── */

function useInView(threshold = 0.1): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, inView];
}

/* ─── Single Timeline ─── */

function Timeline({ events, inView }: { events: EventDef[]; inView: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Identify tool bracket indices (for TOOL_EVENTS only)
  const toolStartIdx = events.findIndex(e => e.category === 'tool');
  const toolEndIdx = events.length - 1 - [...events].reverse().findIndex(e => e.category === 'tool');
  const hasToolBracket = toolStartIdx !== -1 && toolEndIdx > toolStartIdx;

  return (
    <div ref={containerRef} style={{ position: 'relative', paddingRight: hasToolBracket ? 36 : 0 }}>
      {/* Vertical timeline line */}
      <div style={{
        position: 'absolute',
        left: 7,
        top: 8,
        bottom: 8,
        width: 2,
        background: 'var(--border, #2a2a3a)',
        opacity: inView ? 1 : 0,
        transition: 'opacity 0.6s ease 0.1s',
        borderRadius: 1,
      }} />

      {/* Event nodes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {events.map((evt, i) => {
          const staggerDelay = i * 80;
          const isRepeat = evt.repeat;

          return (
            <div
              key={`${evt.label}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '8px 0',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateX(0)' : 'translateX(-16px)',
                transition: `opacity 0.4s ease ${staggerDelay}ms, transform 0.4s ease ${staggerDelay}ms`,
              }}
            >
              {/* Dot */}
              <div style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: evt.color,
                flexShrink: 0,
                marginTop: 2,
                boxShadow: `0 0 8px ${evt.color}40`,
                position: 'relative',
                zIndex: 1,
              }}>
                {/* Pulse ring on appear */}
                <div style={{
                  position: 'absolute',
                  inset: -3,
                  borderRadius: '50%',
                  border: `2px solid ${evt.color}`,
                  opacity: inView ? 0 : 0.6,
                  transform: inView ? 'scale(1.6)' : 'scale(1)',
                  transition: `opacity 0.6s ease ${staggerDelay + 200}ms, transform 0.6s ease ${staggerDelay + 200}ms`,
                }} />
              </div>

              {/* Label + description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <code style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: evt.color,
                    lineHeight: 1.4,
                    wordBreak: 'break-all',
                  }}>
                    {evt.label}
                  </code>
                  {isRepeat && (
                    <span style={{
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      color: evt.color,
                      background: `${evt.color}18`,
                      border: `1px solid ${evt.color}33`,
                      borderRadius: 4,
                      padding: '1px 6px',
                      fontFamily: "'JetBrains Mono', monospace",
                      whiteSpace: 'nowrap',
                    }}>
                      x{evt.repeat}
                    </span>
                  )}
                </div>
                {evt.description && (
                  <span style={{
                    fontFamily: "'DM Sans', system-ui",
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary, #b0b0c0)',
                    lineHeight: 1.4,
                  }}>
                    {evt.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tool bracket on right side */}
      {hasToolBracket && (
        <ToolBracket
          startIdx={toolStartIdx}
          endIdx={toolEndIdx}
          inView={inView}
        />
      )}
    </div>
  );
}

/* ─── Tool bracket (uses refs for positioning) ─── */

function ToolBracket({
  startIdx,
  endIdx,
  inView,
}: {
  startIdx: number;
  endIdx: number;
  inView: boolean;
}) {
  const bracketDelay = Math.max(startIdx, endIdx) * 80 + 200;
  const color = CATEGORY_COLORS.tool;
  // Calculate approximate positions based on node spacing
  const nodeHeight = 40; // approximate height per node (padding + content)
  const topOffset = startIdx * nodeHeight + 10;
  const height = (endIdx - startIdx) * nodeHeight + 16;

  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: topOffset,
      height: height,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      opacity: inView ? 1 : 0,
      transition: `opacity 0.5s ease ${bracketDelay}ms`,
      pointerEvents: 'none',
    }}>
      <svg
        width="14"
        height="100%"
        viewBox="0 0 14 100"
        preserveAspectRatio="none"
        style={{ flexShrink: 0, overflow: 'visible' }}
      >
        <path
          d="M 2 0 L 12 0 L 12 100 L 2 100"
          fill="none"
          stroke={`${color}88`}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span style={{
        fontSize: '0.6875rem',
        color: color,
        fontFamily: "'JetBrains Mono', monospace",
        whiteSpace: 'nowrap',
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
        letterSpacing: '0.05em',
      }}>
        Tool 阶段
      </span>
    </div>
  );
}

/* ─── Main Component ─── */

export default function EventTimelineDiagram() {
  const [ref, inView] = useInView(0.05);
  const [activeTab, setActiveTab] = useState<'simple' | 'tool'>('simple');

  const tabs = [
    { key: 'simple' as const, label: '无工具调用', events: SIMPLE_EVENTS },
    { key: 'tool' as const, label: '有工具调用', events: TOOL_EVENTS },
  ];

  return (
    <div
      ref={ref}
      style={{
        margin: '1.5rem 0',
        borderRadius: 8,
        border: '1px solid var(--border, #2a2a3a)',
        background: 'var(--bg-card, #1e1e2e)',
        overflow: 'hidden',
      }}
    >
      {/* Header with title */}
      <div style={{
        padding: '14px 16px 0',
        textAlign: 'center',
      }}>
        <h3 style={{
          margin: 0,
          fontFamily: "'DM Sans', system-ui",
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--text-primary, #e0e0e0)',
          letterSpacing: '0.02em',
        }}>
          AgentEvent 完整生命周期
        </h3>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '8px 20px',
        padding: '10px 16px',
        opacity: inView ? 1 : 0,
        transition: 'opacity 0.5s ease 0.1s',
      }}>
        {LEGEND_ITEMS.map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: item.color,
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: '0.6875rem',
              color: 'var(--text-secondary, #b0b0c0)',
              fontFamily: "'DM Sans', system-ui",
              whiteSpace: 'nowrap',
            }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border, #2a2a3a)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: 'none',
                borderBottom: isActive
                  ? '2px solid var(--accent, #D97757)'
                  : '2px solid transparent',
                background: isActive
                  ? 'rgba(217,119,87,0.06)'
                  : 'transparent',
                color: isActive
                  ? 'var(--accent, #D97757)'
                  : 'var(--text-secondary, #b0b0c0)',
                fontFamily: "'DM Sans', system-ui",
                fontSize: '0.8125rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                letterSpacing: '0.02em',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary, #e0e0e0)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary, #b0b0c0)';
                }
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Timeline content */}
      <div style={{ padding: '16px 20px 20px' }}>
        {tabs.map((tab) => (
          <div
            key={tab.key}
            style={{
              display: activeTab === tab.key ? 'block' : 'none',
            }}
          >
            <Timeline
              events={tab.events}
              inView={inView && activeTab === tab.key}
            />
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div style={{
        padding: '8px 16px 12px',
        textAlign: 'center',
        opacity: inView ? 0.6 : 0,
        transition: 'opacity 0.5s ease 0.8s',
      }}>
        <span style={{
          fontFamily: "'DM Sans', system-ui",
          fontSize: '0.6875rem',
          color: 'var(--text-secondary, #b0b0c0)',
        }}>
          切换标签查看{activeTab === 'simple' ? '有' : '无'}工具调用的事件流
        </span>
      </div>
    </div>
  );
}
