import React, { useState, useEffect, useRef } from 'react';

/* ─── IntersectionObserver hook (matches AnimatedDiagram pattern) ─── */

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

/* ─── Phase data ─── */

const PHASES = [
  {
    number: 1,
    label: '准备',
    labelEn: 'Prepare',
    color: '#6e8efb',
    steps: ['查找工具', '验证参数', 'beforeToolCall hook'],
  },
  {
    number: 2,
    label: '执行',
    labelEn: 'Execute',
    color: '#4ade80',
    tools: [
      { name: 'Tool A', color: '#4ade80' },
      { name: 'Tool B', color: '#34d399' },
      { name: 'Tool C', color: '#22c55e' },
    ],
  },
  {
    number: 3,
    label: '完成',
    labelEn: 'Finalize',
    color: '#D97757',
    steps: ['afterToolCall hook', '结果截断', '注入消息'],
  },
] as const;

/* ─── Keyframe injection (runs once) ─── */

const STYLE_ID = 'tool-call-flow-keyframes';

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes tcf-bar-fill-a {
      from { width: 0%; }
      to   { width: 92%; }
    }
    @keyframes tcf-bar-fill-b {
      from { width: 0%; }
      to   { width: 78%; }
    }
    @keyframes tcf-bar-fill-c {
      from { width: 0%; }
      to   { width: 100%; }
    }
    @keyframes tcf-bar-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes tcf-pulse-glow {
      0%, 100% { box-shadow: 0 0 6px rgba(217,119,87,0.2); }
      50%      { box-shadow: 0 0 18px rgba(217,119,87,0.5); }
    }
    @keyframes tcf-arrow-draw {
      from { stroke-dashoffset: 40; }
      to   { stroke-dashoffset: 0; }
    }
    @keyframes tcf-arrow-head-in {
      from { opacity: 0; transform: translateX(-6px); }
      to   { opacity: 0.55; transform: translateX(0); }
    }
  `;
  document.head.appendChild(style);
}

/* ─── Sub-components ─── */

function PhaseCard({
  phase,
  inView,
  phaseIndex,
}: {
  phase: typeof PHASES[number];
  inView: boolean;
  phaseIndex: number;
}) {
  const baseDelay = phaseIndex * 300;
  const cardDelay = baseDelay;

  return (
    <div style={{
      flex: '1 1 260px',
      minWidth: 220,
      maxWidth: 420,
      borderRadius: 12,
      border: `1.5px solid ${phase.color}40`,
      background: `${phase.color}08`,
      padding: '20px 18px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.92)',
      transition: `opacity 0.5s ease ${cardDelay}ms, transform 0.5s ease ${cardDelay}ms`,
    }}>
      {/* Phase badge + title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: `${phase.color}22`,
          border: `1.5px solid ${phase.color}66`,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.75rem',
          fontWeight: 700,
          color: phase.color,
          flexShrink: 0,
        }}>
          {phase.number}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{
            fontFamily: "'DM Sans', system-ui",
            fontSize: '1rem',
            fontWeight: 700,
            color: phase.color,
            lineHeight: 1.2,
          }}>
            {phase.label}
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.6875rem',
            fontWeight: 500,
            color: `${phase.color}99`,
            lineHeight: 1.3,
          }}>
            {phase.labelEn}
          </span>
        </div>
      </div>

      {/* Steps or tools */}
      {'steps' in phase && phase.steps && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {phase.steps.map((step, i) => {
            const stepDelay = baseDelay + 180 + i * 120;
            const isLastPhaseLastStep = phaseIndex === 2 && i === (phase.steps as readonly string[]).length - 1;
            return (
              <div
                key={step}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: `1px solid ${isLastPhaseLastStep ? `${phase.color}88` : `${phase.color}44`}`,
                  background: isLastPhaseLastStep ? `${phase.color}18` : `${phase.color}0a`,
                  fontFamily: "'DM Sans', system-ui",
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--text-primary, #e0e0e0)',
                  opacity: inView ? 1 : 0,
                  transform: inView ? 'translateX(0)' : 'translateX(-20px)',
                  transition: `opacity 0.4s ease ${stepDelay}ms, transform 0.4s ease ${stepDelay}ms`,
                  animation: isLastPhaseLastStep && inView
                    ? `tcf-pulse-glow 2.5s ease-in-out ${stepDelay + 400}ms infinite`
                    : 'none',
                }}
              >
                {step}
                {isLastPhaseLastStep && (
                  <span style={{
                    marginLeft: 8,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.6875rem',
                    color: `${phase.color}aa`,
                    fontWeight: 400,
                  }}>
                    // ordering guaranteed
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {'tools' in phase && phase.tools && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
          {phase.tools.map((tool, i) => {
            const barDelay = baseDelay + 200 + i * 100;
            const barName = ['a', 'b', 'c'][i];
            return (
              <div key={tool.name} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                opacity: inView ? 1 : 0,
                transition: `opacity 0.3s ease ${barDelay}ms`,
              }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: tool.color,
                  minWidth: 52,
                  flexShrink: 0,
                }}>
                  {tool.name}
                </span>
                <div style={{
                  flex: 1,
                  height: 22,
                  borderRadius: 4,
                  background: `${tool.color}10`,
                  border: `1px solid ${tool.color}30`,
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <div style={{
                    height: '100%',
                    borderRadius: 3,
                    background: `linear-gradient(90deg, ${tool.color}30, ${tool.color}70)`,
                    backgroundSize: '200% 100%',
                    width: inView ? undefined : '0%',
                    animation: inView
                      ? `tcf-bar-fill-${barName} 1.2s ease ${barDelay + 200}ms forwards, tcf-bar-shimmer 2s ease-in-out ${barDelay + 1400}ms infinite`
                      : 'none',
                    boxShadow: `0 0 8px ${tool.color}30`,
                  }} />
                </div>
              </div>
            );
          })}
          <div style={{
            textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.6875rem',
            color: 'var(--text-secondary, #b0b0c0)',
            opacity: inView ? 0.6 : 0,
            transition: `opacity 0.5s ease ${baseDelay + 800}ms`,
            marginTop: 2,
          }}>
            并行执行
          </div>
        </div>
      )}
    </div>
  );
}

function ArrowConnector({ inView, delay }: { inView: boolean; delay: number }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      width: 36,
      minHeight: 24,
      alignSelf: 'center',
    }}>
      <svg
        width="36"
        height="20"
        viewBox="0 0 36 20"
        style={{ overflow: 'visible' }}
      >
        <line
          x1="0"
          y1="10"
          x2="28"
          y2="10"
          stroke="var(--text-secondary, #b0b0c0)"
          strokeWidth="1.5"
          strokeDasharray="40"
          strokeDashoffset={inView ? undefined : 40}
          style={{
            animation: inView
              ? `tcf-arrow-draw 0.6s ease ${delay}ms forwards`
              : 'none',
            opacity: 0.55,
          }}
        />
        <polygon
          points="26,5 36,10 26,15"
          fill="var(--text-secondary, #b0b0c0)"
          style={{
            opacity: inView ? undefined : 0,
            animation: inView
              ? `tcf-arrow-head-in 0.3s ease ${delay + 400}ms forwards`
              : 'none',
          }}
        />
      </svg>
    </div>
  );
}

/* ─── Main component ─── */

export default function ToolCallFlowDiagram() {
  const [ref, inView] = useInView(0.1);

  useEffect(() => {
    ensureKeyframes();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        margin: '1.5rem 0',
        padding: '24px 20px 20px',
        borderRadius: 8,
        border: '1px solid var(--border, #2a2a3a)',
        background: 'var(--bg-card, #1e1e2e)',
      }}
    >
      {/* Title */}
      <div style={{
        textAlign: 'center',
        marginBottom: 24,
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
        <h3 style={{
          margin: 0,
          fontFamily: "'DM Sans', system-ui",
          fontSize: '1.125rem',
          fontWeight: 700,
          color: 'var(--text-primary, #e0e0e0)',
          letterSpacing: '0.04em',
        }}>
          工具调用完整链路
        </h3>
        <p style={{
          margin: '4px 0 0',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.6875rem',
          color: 'var(--text-secondary, #b0b0c0)',
          opacity: 0.6,
        }}>
          Tool Call Pipeline
        </p>
      </div>

      {/* Three-column layout with arrows */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        justifyContent: 'center',
        gap: 0,
      }}>
        {PHASES.map((phase, i) => (
          <React.Fragment key={phase.number}>
            {i > 0 && (
              <ArrowConnector
                inView={inView}
                delay={i * 300 + 150}
              />
            )}
            <PhaseCard
              phase={phase}
              inView={inView}
              phaseIndex={i}
            />
          </React.Fragment>
        ))}
      </div>

      {/* Bottom connecting line */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginTop: 16,
        opacity: inView ? 1 : 0,
        transition: `opacity 0.6s ease 1200ms`,
      }}>
        <div style={{
          width: '90%',
          maxWidth: 800,
          height: 1,
          background: 'var(--accent, #D97757)',
          opacity: 0.25,
          borderRadius: 1,
          backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, var(--bg-card, #1e1e2e) 4px, var(--bg-card, #1e1e2e) 8px)',
        }} />
      </div>
    </div>
  );
}
