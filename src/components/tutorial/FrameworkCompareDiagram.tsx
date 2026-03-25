import React, { useState, useEffect, useRef } from 'react';

/* ─── Types ─── */

interface FlowStep {
  label: string;
  mono?: boolean;
}

interface FrameworkDef {
  id: string;
  name: string;
  tagline: string;
  color: string;
  flowSteps: FlowStep[];
  loopLabel?: string;
  loopBack?: boolean;
  characteristics: string[];
}

/* ─── Framework data ─── */

const FRAMEWORKS: FrameworkDef[] = [
  {
    id: 'pi',
    name: 'Pi (Manual Loop)',
    tagline: 'Minimal, explicit loop, direct tool calls',
    color: 'var(--accent, #D97757)',
    flowSteps: [
      { label: 'User Prompt' },
      { label: 'while loop', mono: true },
      { label: 'llm.chat()', mono: true },
      { label: 'tool_call → execute()', mono: true },
      { label: 'Result' },
    ],
    loopLabel: 'while has_tool_calls',
    loopBack: true,
    characteristics: [
      'Full control over every iteration',
      '~50 lines of code for the core loop',
      'No abstractions — you see every API call',
      'Easy to debug: add a print() anywhere',
    ],
  },
  {
    id: 'langchain',
    name: 'LangChain (StateGraph)',
    tagline: 'Chain/Graph abstraction, many layers',
    color: '#60a5fa',
    flowSteps: [
      { label: 'User Prompt' },
      { label: 'StateGraph.compile()', mono: true },
      { label: 'llm_call node', mono: true },
      { label: 'tool_exec node', mono: true },
      { label: 'Result' },
    ],
    loopLabel: 'conditional edge',
    loopBack: true,
    characteristics: [
      'Declarative graph definition',
      'Built-in state management',
      'Rich ecosystem of pre-built chains',
      'More indirection — harder to trace flow',
    ],
  },
  {
    id: 'vercel',
    name: 'Vercel AI SDK',
    tagline: 'Streaming-first, React integration',
    color: '#4ade80',
    flowSteps: [
      { label: 'User Prompt' },
      { label: 'streamText()', mono: true },
      { label: 'maxSteps: 5', mono: true },
      { label: '(internal loop)', mono: true },
      { label: 'Streamed Result' },
    ],
    loopBack: false,
    characteristics: [
      'One function call does everything',
      'Streaming built in from the start',
      'Tight React/Next.js integration',
      'Less visibility into internal steps',
    ],
  },
];

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

/* ─── Flow Diagram for a single framework ─── */

function FlowDiagram({ fw, visible }: { fw: FrameworkDef; visible: boolean }) {
  // The loop-back arrow connects step index 3 back to step index 2
  const loopFromIdx = 3;
  const loopToIdx = 2;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 0,
      padding: '20px 0 8px',
      position: 'relative',
    }}>
      {fw.flowSteps.map((step, i) => {
        const delay = i * 80;
        const isFirst = i === 0;
        const isLast = i === fw.flowSteps.length - 1;

        return (
          <React.Fragment key={i}>
            {/* Arrow between steps */}
            {i > 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                opacity: visible ? 1 : 0,
                transition: `opacity 0.3s ease ${delay - 30}ms`,
              }}>
                <svg width="20" height="28" viewBox="0 0 20 28">
                  <line x1="10" y1="0" x2="10" y2="20" stroke={`${fw.color}`} strokeWidth="1.5" strokeOpacity="0.4" />
                  <polygon points="6,20 10,28 14,20" fill={fw.color} fillOpacity="0.5" />
                </svg>
              </div>
            )}

            {/* Step node */}
            <div style={{
              padding: '10px 24px',
              borderRadius: isFirst || isLast ? 20 : 8,
              border: `1.5px solid`,
              borderColor: isFirst || isLast ? `${fw.color}66` : fw.color,
              background: isFirst || isLast ? 'rgba(255,255,255,0.03)' : `color-mix(in srgb, ${fw.color} 8%, transparent)`,
              fontFamily: step.mono ? "'JetBrains Mono', monospace" : "'DM Sans', system-ui",
              fontSize: step.mono ? '0.8125rem' : '0.875rem',
              fontWeight: 600,
              color: isFirst || isLast ? 'var(--text-primary, #e0e0e0)' : fw.color,
              minWidth: 180,
              textAlign: 'center',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.85)',
              transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`,
              position: 'relative',
              zIndex: 2,
            }}>
              {step.label}
            </div>
          </React.Fragment>
        );
      })}

      {/* Loop-back arrow on the right side */}
      {fw.loopBack && (
        <div style={{
          position: 'absolute',
          right: 'calc(50% - 140px)',
          top: 0,
          bottom: 0,
          width: 60,
          pointerEvents: 'none',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.6s ease 0.4s',
          zIndex: 1,
        }}>
          <svg
            width="60"
            height="100%"
            viewBox="0 0 60 300"
            preserveAspectRatio="none"
            style={{ overflow: 'visible' }}
          >
            {/* Curved path from step[loopFromIdx] back up to step[loopToIdx] */}
            <path
              d={`
                M 0 ${(loopFromIdx * 70) + 45}
                L 40 ${(loopFromIdx * 70) + 45}
                L 40 ${(loopToIdx * 70) + 45}
                L 8 ${(loopToIdx * 70) + 45}
              `}
              stroke={fw.color}
              strokeWidth="1.5"
              strokeOpacity="0.35"
              strokeDasharray="5 3"
              fill="none"
            />
            <polygon
              points={`8,${(loopToIdx * 70) + 41} 0,${(loopToIdx * 70) + 45} 8,${(loopToIdx * 70) + 49}`}
              fill={fw.color}
              fillOpacity="0.45"
            />
          </svg>
          {/* Loop label */}
          {fw.loopLabel && (
            <span style={{
              position: 'absolute',
              right: -2,
              top: '50%',
              transform: 'translateY(-50%) rotate(90deg)',
              transformOrigin: 'center center',
              fontSize: '0.625rem',
              fontFamily: "'JetBrains Mono', monospace",
              color: fw.color,
              opacity: 0.5,
              whiteSpace: 'nowrap',
              letterSpacing: '0.04em',
            }}>
              {fw.loopLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Characteristics list ─── */

function CharacteristicsList({ items, color, visible }: { items: string[]; color: string; visible: boolean }) {
  return (
    <ul style={{
      listStyle: 'none',
      margin: '16px 0 0',
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {items.map((item, i) => {
        const delay = 400 + i * 60;
        return (
          <li key={i} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            color: 'var(--text-secondary, #b0b0c0)',
            fontFamily: "'DM Sans', system-ui",
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateX(0)' : 'translateX(-10px)',
            transition: `opacity 0.35s ease ${delay}ms, transform 0.35s ease ${delay}ms`,
          }}>
            <span style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
              marginTop: 6,
              opacity: 0.7,
            }} />
            {item}
          </li>
        );
      })}
    </ul>
  );
}

/* ─── Main Component ─── */

export default function FrameworkCompareDiagram() {
  const [containerRef, inView] = useInView(0.1);
  const [activeTab, setActiveTab] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [displayedTab, setDisplayedTab] = useState(0);

  // Handle tab switching with fade transition
  const switchTab = (idx: number) => {
    if (idx === activeTab || transitioning) return;
    setTransitioning(true);
    // Start fade out
    setTimeout(() => {
      setDisplayedTab(idx);
      setActiveTab(idx);
      // Fade in happens via CSS
      setTimeout(() => setTransitioning(false), 50);
    }, 200);
  };

  const fw = FRAMEWORKS[displayedTab];

  return (
    <div
      ref={containerRef}
      style={{
        margin: '1.5rem 0',
        borderRadius: 8,
        border: '1px solid var(--border, #2a2a3a)',
        background: 'var(--bg-card, #1e1e2e)',
        overflow: 'hidden',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      {/* Title */}
      <div style={{
        padding: '16px 20px 0',
        textAlign: 'center',
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '1.125rem',
          fontWeight: 700,
          color: 'var(--text-primary, #e0e0e0)',
          fontFamily: "'DM Sans', system-ui",
          letterSpacing: '0.02em',
        }}>
          Framework Comparison
        </h3>
        <p style={{
          margin: '4px 0 0',
          fontSize: '0.75rem',
          color: 'var(--text-secondary, #b0b0c0)',
          fontFamily: "'JetBrains Mono', monospace",
          opacity: 0.6,
        }}>
          Same task, three approaches
        </p>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: 2,
        padding: '14px 20px 0',
        borderBottom: '1px solid var(--border, #2a2a3a)',
      }}>
        {FRAMEWORKS.map((f, i) => {
          const isActive = activeTab === i;
          return (
            <button
              key={f.id}
              onClick={() => switchTab(i)}
              style={{
                flex: 1,
                padding: '10px 8px',
                border: 'none',
                borderBottom: `2px solid ${isActive ? f.color : 'transparent'}`,
                background: isActive ? `color-mix(in srgb, ${f.color} 6%, transparent)` : 'transparent',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                fontFamily: "'DM Sans', system-ui",
                fontSize: '0.8125rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? f.color : 'var(--text-secondary, #b0b0c0)',
                transition: 'all 0.25s ease',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLButtonElement).style.color = f.color;
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary, #b0b0c0)';
                }
              }}
            >
              {f.name}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{
        padding: '8px 20px 20px',
        opacity: transitioning ? 0 : 1,
        transform: transitioning ? 'translateY(6px)' : 'translateY(0)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        minHeight: 420,
      }}>
        {/* Tagline */}
        <div style={{
          textAlign: 'center',
          padding: '12px 0 4px',
        }}>
          <span style={{
            display: 'inline-block',
            padding: '4px 14px',
            borderRadius: 12,
            background: `color-mix(in srgb, ${fw.color} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${fw.color} 20%, transparent)`,
            fontSize: '0.75rem',
            fontFamily: "'DM Sans', system-ui",
            fontWeight: 500,
            color: fw.color,
            opacity: 0.85,
          }}>
            {fw.tagline}
          </span>
        </div>

        {/* Flow diagram */}
        <FlowDiagram fw={fw} visible={inView && !transitioning} />

        {/* Divider */}
        <div style={{
          height: 1,
          background: 'var(--border, #2a2a3a)',
          margin: '12px 0 4px',
        }} />

        {/* Characteristics */}
        <div style={{ padding: '0 4px' }}>
          <span style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            color: fw.color,
            opacity: 0.6,
            fontFamily: "'DM Sans', system-ui",
          }}>
            Key Characteristics
          </span>
          <CharacteristicsList
            items={fw.characteristics}
            color={fw.color}
            visible={inView && !transitioning}
          />
        </div>
      </div>

      {/* Footer: task label */}
      <div style={{
        padding: '8px 20px 12px',
        textAlign: 'center',
        borderTop: '1px solid var(--border, #2a2a3a)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <span style={{
          fontSize: '0.6875rem',
          color: 'var(--text-secondary, #b0b0c0)',
          fontFamily: "'JetBrains Mono', monospace",
          opacity: 0.4,
        }}>
          Task: Read file &rarr; Count lines &rarr; Report
        </span>
      </div>
    </div>
  );
}
