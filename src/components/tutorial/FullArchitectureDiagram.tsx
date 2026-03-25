import React, { useState, useEffect, useRef } from 'react';

/* ─── Hook: IntersectionObserver trigger ─── */

function useInView(threshold = 0.15): [React.RefObject<HTMLDivElement | null>, boolean] {
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

/* ─── Architecture Components Data ─── */

interface ArchComponent {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  gridArea: string;
}

const COMPONENTS: ArchComponent[] = [
  {
    id: 'system-prompt',
    emoji: '📋',
    title: 'System Prompt',
    subtitle: '构建指令',
    description: '定义 Agent 的身份、能力边界和行为规则',
    color: '#4ade80',
    gridArea: 'sp',
  },
  {
    id: 'session-manager',
    emoji: '💾',
    title: 'Session Manager',
    subtitle: '会话管理',
    description: '维护对话历史，管理上下文窗口',
    color: '#38bdf8',
    gridArea: 'sm',
  },
  {
    id: 'agent-loop',
    emoji: '🔄',
    title: 'Agent Loop',
    subtitle: '核心循环',
    description: 'Think → Act → Observe 的无限循环，直到任务完成',
    color: '#D97757',
    gridArea: 'al',
  },
  {
    id: 'tool-system',
    emoji: '🔧',
    title: 'Tool System',
    subtitle: '工具系统',
    description: '注册、路由和执行工具调用',
    color: '#a78bfa',
    gridArea: 'ts',
  },
  {
    id: 'compaction',
    emoji: '📦',
    title: 'Compaction',
    subtitle: '压缩',
    description: '当上下文超出窗口时，智能压缩历史消息',
    color: '#fbbf24',
    gridArea: 'cp',
  },
  {
    id: 'extensions',
    emoji: '🧩',
    title: 'Extensions',
    subtitle: '扩展',
    description: '事件钩子、自定义工具、UI 渲染等扩展点',
    color: '#f472b6',
    gridArea: 'ex',
  },
];

const TOOLS = [
  { label: 'read_file', icon: '📄' },
  { label: 'write_file', icon: '✏️' },
  { label: 'run_cmd', icon: '⚡' },
  { label: 'search', icon: '🔍' },
];

/* ─── CSS keyframes injector ─── */

const KEYFRAMES_ID = 'full-arch-keyframes';

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;

  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes archCardIn {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.92);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    @keyframes archPulse {
      0%, 100% {
        box-shadow: 0 0 12px rgba(217,119,87,0.25), 0 0 30px rgba(217,119,87,0.08);
      }
      50% {
        box-shadow: 0 0 20px rgba(217,119,87,0.4), 0 0 50px rgba(217,119,87,0.15);
      }
    }
    @keyframes archToolSlide {
      from {
        opacity: 0;
        transform: translateX(-12px) scale(0.85);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }
    @keyframes archConnectorGrow {
      from { transform: scaleX(0); }
      to { transform: scaleX(1); }
    }
    @keyframes archConnectorGrowY {
      from { transform: scaleY(0); }
      to { transform: scaleY(1); }
    }
    @keyframes archStorageFade {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes archDataDot {
      0% { left: 0%; opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { left: 100%; opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

/* ─── Sub-components ─── */

function ArchCard({
  comp,
  index,
  inView,
}: {
  comp: ArchComponent;
  index: number;
  inView: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isCenter = comp.id === 'agent-loop';
  const delay = index * 120;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridArea: comp.gridArea,
        position: 'relative',
        padding: isCenter ? '20px 16px' : '16px 14px',
        borderRadius: 10,
        border: `1.5px solid ${hovered ? comp.color : `${comp.color}55`}`,
        background: hovered
          ? `${comp.color}18`
          : isCenter
            ? `${comp.color}0d`
            : 'rgba(255,255,255,0.02)',
        cursor: 'default',
        transition: 'background 0.25s, border-color 0.25s, box-shadow 0.25s',
        animation: inView
          ? `archCardIn 0.5s ease ${delay}ms both${isCenter ? ', archPulse 3s ease-in-out 1s infinite' : ''}`
          : 'none',
        opacity: inView ? undefined : 0,
        boxShadow: hovered
          ? `0 0 16px ${comp.color}30`
          : isCenter
            ? `0 0 12px ${comp.color}20`
            : 'none',
      }}
    >
      {/* Color accent bar at top */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 16,
        right: 16,
        height: 2,
        borderRadius: '0 0 2px 2px',
        background: comp.color,
        opacity: 0.6,
      }} />

      {/* Emoji + Title row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
      }}>
        <span style={{ fontSize: isCenter ? '1.25rem' : '1rem' }}>{comp.emoji}</span>
        <div>
          <div style={{
            fontFamily: "'DM Sans', system-ui",
            fontSize: isCenter ? '0.9375rem' : '0.8125rem',
            fontWeight: 700,
            color: comp.color,
            lineHeight: 1.3,
          }}>
            {comp.title}
          </div>
          <div style={{
            fontFamily: "'DM Sans', system-ui",
            fontSize: '0.6875rem',
            fontWeight: 500,
            color: `${comp.color}aa`,
            lineHeight: 1.3,
          }}>
            {comp.subtitle}
          </div>
        </div>
      </div>

      {/* Description */}
      <p style={{
        margin: 0,
        fontFamily: "'DM Sans', system-ui",
        fontSize: '0.75rem',
        lineHeight: 1.55,
        color: 'var(--text-secondary, #b0b0c0)',
      }}>
        {comp.description}
      </p>

      {/* Code file hint for center card */}
      {isCenter && (
        <div style={{
          marginTop: 8,
          padding: '3px 8px',
          borderRadius: 4,
          background: 'rgba(0,0,0,0.2)',
          display: 'inline-block',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.6875rem',
          color: `${comp.color}cc`,
        }}>
          agent.ts
        </div>
      )}
    </div>
  );
}

function ToolFanout({ inView }: { inView: boolean }) {
  const toolColor = '#a78bfa';

  return (
    <div style={{
      gridArea: 'tf',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      justifyContent: 'center',
    }}>
      {/* Header */}
      <div style={{
        fontFamily: "'DM Sans', system-ui",
        fontSize: '0.6875rem',
        fontWeight: 600,
        color: `${toolColor}99`,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.06em',
        marginBottom: 2,
        animation: inView ? 'archToolSlide 0.4s ease 600ms both' : 'none',
        opacity: inView ? undefined : 0,
      }}>
        Tools
      </div>

      {TOOLS.map((tool, i) => (
        <ToolPill key={tool.label} tool={tool} index={i} inView={inView} color={toolColor} />
      ))}
    </div>
  );
}

function ToolPill({
  tool,
  index,
  inView,
  color,
}: {
  tool: { label: string; icon: string };
  index: number;
  inView: boolean;
  color: string;
}) {
  const [hovered, setHovered] = useState(false);
  const delay = 650 + index * 80;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 6,
        border: `1px solid ${hovered ? `${color}88` : `${color}33`}`,
        background: hovered ? `${color}18` : `${color}08`,
        cursor: 'default',
        transition: 'background 0.2s, border-color 0.2s',
        animation: inView ? `archToolSlide 0.35s ease ${delay}ms both` : 'none',
        opacity: inView ? undefined : 0,
      }}
    >
      <span style={{ fontSize: '0.75rem' }}>{tool.icon}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.6875rem',
        fontWeight: 500,
        color: color,
        whiteSpace: 'nowrap',
      }}>
        {tool.label}
      </span>
    </div>
  );
}

function SessionStorage({ inView }: { inView: boolean }) {
  const [hovered, setHovered] = useState(false);
  const color = '#38bdf8';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridArea: 'ss',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 8,
        border: `1px solid ${hovered ? `${color}66` : `${color}33`}`,
        background: hovered ? `${color}12` : `${color}08`,
        cursor: 'default',
        transition: 'background 0.2s, border-color 0.2s',
        animation: inView ? 'archStorageFade 0.4s ease 800ms both' : 'none',
        opacity: inView ? undefined : 0,
      }}
    >
      <span style={{ fontSize: '0.875rem' }}>🗄️</span>
      <div>
        <div style={{
          fontFamily: "'DM Sans', system-ui",
          fontSize: '0.75rem',
          fontWeight: 600,
          color: color,
        }}>
          Session Storage
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.625rem',
          color: `${color}99`,
        }}>
          messages[], context
        </div>
      </div>
    </div>
  );
}

/* ─── Connectors ─── */

function HorizontalConnector({ inView, delay, gridArea, color = 'var(--border, #2a2a3a)' }: {
  inView: boolean;
  delay: number;
  gridArea: string;
  color?: string;
}) {
  return (
    <div style={{
      gridArea,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 2px',
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        height: 2,
        transformOrigin: 'left center',
        animation: inView ? `archConnectorGrow 0.3s ease ${delay}ms both` : 'none',
        opacity: inView ? undefined : 0,
      }}>
        {/* Line */}
        <div style={{
          width: '100%',
          height: '100%',
          background: color,
          opacity: 0.5,
          borderRadius: 1,
        }} />
        {/* Arrowhead */}
        <div style={{
          position: 'absolute',
          right: -1,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 0,
          height: 0,
          borderTop: '4px solid transparent',
          borderBottom: '4px solid transparent',
          borderLeft: `6px solid ${color}`,
          opacity: 0.5,
        }} />
        {/* Animated data dot */}
        {inView && (
          <div style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: color,
            animation: `archDataDot 2.5s ease-in-out ${delay + 600}ms infinite`,
          }} />
        )}
      </div>
    </div>
  );
}

function VerticalConnector({ inView, delay, gridArea, color = 'var(--border, #2a2a3a)', direction = 'down' }: {
  inView: boolean;
  delay: number;
  gridArea: string;
  color?: string;
  direction?: 'down' | 'up';
}) {
  return (
    <div style={{
      gridArea,
      display: 'flex',
      justifyContent: 'center',
      alignItems: direction === 'down' ? 'flex-start' : 'flex-end',
      padding: '2px 0',
    }}>
      <div style={{
        position: 'relative',
        width: 2,
        height: '100%',
        transformOrigin: direction === 'down' ? 'center top' : 'center bottom',
        animation: inView ? `archConnectorGrowY 0.3s ease ${delay}ms both` : 'none',
        opacity: inView ? undefined : 0,
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          background: color,
          opacity: 0.4,
          borderRadius: 1,
        }} />
        {/* Arrowhead pointing down */}
        <div style={{
          position: 'absolute',
          ...(direction === 'down' ? { bottom: -1 } : { top: -1 }),
          left: '50%',
          transform: `translateX(-50%)${direction === 'up' ? ' rotate(180deg)' : ''}`,
          width: 0,
          height: 0,
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: `6px solid ${color}`,
          opacity: 0.4,
        }} />
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export default function FullArchitectureDiagram() {
  const [ref, inView] = useInView(0.1);

  useEffect(() => {
    ensureKeyframes();
  }, []);

  /*
   * Grid layout (desktop 2x3 with connectors between):
   *
   *   [SystemPrompt] → [SessionManager] → [AgentLoop]
   *          ↓                 ↓                ↓
   *   [ToolSystem] [tools]  [Compaction]     [Extensions]
   *                         [Session Storage below SM]
   *
   * Grid areas (including connector slots):
   *   sp  c1  sm  c2  al
   *   v1  .   v2  .   v3
   *   ts  tf  cp  .   ex
   *   .   .   ss  .   .
   */

  return (
    <div
      ref={ref}
      style={{
        margin: '1.5rem 0',
        padding: 20,
        borderRadius: 8,
        border: '1px solid var(--border, #2a2a3a)',
        background: 'var(--bg-card, #1e1e2e)',
      }}
    >
      {/* Title */}
      <div style={{
        textAlign: 'center',
        marginBottom: 16,
        animation: inView ? 'archCardIn 0.4s ease both' : 'none',
        opacity: inView ? undefined : 0,
      }}>
        <h3 style={{
          margin: 0,
          fontFamily: "'DM Sans', system-ui",
          fontSize: '1.0625rem',
          fontWeight: 700,
          color: 'var(--text-primary, #e0e0e0)',
          letterSpacing: '0.02em',
        }}>
          Coding Agent 完整架构
        </h3>
        <p style={{
          margin: '4px 0 0',
          fontFamily: "'DM Sans', system-ui",
          fontSize: '0.75rem',
          color: 'var(--text-secondary, #b0b0c0)',
        }}>
          从零搭建一个完整的 Coding Agent
        </p>
      </div>

      {/* Data flow label */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.625rem',
        color: 'rgba(255,255,255,0.2)',
        marginBottom: 8,
        animation: inView ? 'archCardIn 0.3s ease 400ms both' : 'none',
        opacity: inView ? undefined : 0,
      }}>
        Data Flow →
      </div>

      {/* Grid container - desktop */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 24px 1fr 24px 1fr',
        gridTemplateRows: 'auto 16px auto auto',
        gridTemplateAreas: `
          "sp c1 sm c2 al"
          "v1 .  v2 .  v3"
          "ts tf cp .  ex"
          ".  .  ss .  ."
        `,
        gap: '0',
        alignItems: 'stretch',
      }}>
        {/* Row 1: System Prompt → Session Manager → Agent Loop */}
        {COMPONENTS.slice(0, 3).map((comp, i) => (
          <ArchCard key={comp.id} comp={comp} index={i} inView={inView} />
        ))}

        {/* Horizontal connectors in row 1 */}
        <HorizontalConnector inView={inView} delay={350} gridArea="c1" color="#4ade80" />
        <HorizontalConnector inView={inView} delay={400} gridArea="c2" color="#38bdf8" />

        {/* Vertical connectors between rows */}
        <VerticalConnector inView={inView} delay={500} gridArea="v1" color="#4ade80" />
        <VerticalConnector inView={inView} delay={550} gridArea="v2" color="#38bdf8" />
        <VerticalConnector inView={inView} delay={560} gridArea="v3" color="#D97757" />

        {/* Row 2: Tool System, Tools, Compaction, Extensions */}
        {COMPONENTS.slice(3).map((comp, i) => (
          <ArchCard key={comp.id} comp={comp} index={i + 3} inView={inView} />
        ))}

        {/* Tool fan-out area */}
        <ToolFanout inView={inView} />

        {/* Session Storage */}
        <SessionStorage inView={inView} />
      </div>

      {/* Responsive: single column on narrow screens */}
      <style>{`
        @media (max-width: 640px) {
          [data-arch-grid] {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto !important;
            grid-template-areas: none !important;
          }
        }
      `}</style>

      {/* We apply responsive via a wrapper data attribute */}
      <ResponsiveOverride />
    </div>
  );
}

/* ─── Responsive fallback for narrow screens ─── */

function ResponsiveOverride() {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    setIsNarrow(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!isNarrow) return null;

  return (
    <style>{`
      div[style*="grid-template-columns: 1fr 24px"] {
        grid-template-columns: 1fr !important;
        grid-template-rows: repeat(auto-fill, auto) !important;
        grid-template-areas:
          "sp"
          "sm"
          "al"
          "ts"
          "tf"
          "cp"
          "ex"
          "ss" !important;
        gap: 8px !important;
      }
      div[style*="grid-template-columns: 1fr 24px"] > div[style*="grid-area: c1"],
      div[style*="grid-template-columns: 1fr 24px"] > div[style*="grid-area: c2"],
      div[style*="grid-template-columns: 1fr 24px"] > div[style*="grid-area: v1"],
      div[style*="grid-template-columns: 1fr 24px"] > div[style*="grid-area: v2"],
      div[style*="grid-template-columns: 1fr 24px"] > div[style*="grid-area: v3"] {
        display: none !important;
      }
    `}</style>
  );
}
