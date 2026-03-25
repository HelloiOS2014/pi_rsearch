import React, { useState, useEffect, useRef } from 'react';

/* ─── IntersectionObserver hook ─── */

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

/* ─── Gap data ─── */

interface Gap {
  label: string;
  chapter: string;
  color: string;
  description: string;
}

const GAPS: Gap[] = [
  {
    label: '控制',
    chapter: 'Ch10',
    color: '#60a5fa',
    description: '循环终止、Token 预算、审批门 — 谁决定 Agent 何时停下？',
  },
  {
    label: '边界与信任',
    chapter: 'Ch11',
    color: '#fbbf24',
    description: '权限模型、沙箱隔离、Tool 白名单 — 如何划定能力边界？',
  },
  {
    label: '记忆',
    chapter: 'Ch12',
    color: '#a78bfa',
    description: '上下文压缩、对话摘要、持久化 — 长对话如何不失忆？',
  },
  {
    label: '适应',
    chapter: 'Ch13',
    color: '#f472b6',
    description: '多层配置合并、运行时覆盖 — 同一框架如何服务不同场景？',
  },
  {
    label: '交付',
    chapter: 'Ch14',
    color: '#22d3ee',
    description: 'CLI 打包、MCP 协议、SDK 分发 — 从代码到产品的最后一公里。',
  },
];

/* ─── Keyframe injection ─── */

const STYLE_ID = 'harness-gaps-keyframes';

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes hg-pulse {
      0%, 100% { box-shadow: 0 0 8px rgba(217,119,87,0.2); }
      50%      { box-shadow: 0 0 22px rgba(217,119,87,0.45); }
    }
    @keyframes hg-line-draw {
      from { width: 0; }
      to   { width: 4px; }
    }
  `;
  document.head.appendChild(style);
}

/* ─── Component ─── */

export default function HarnessGapsDiagram() {
  const [ref, inView] = useInView(0.1);
  const [hovered, setHovered] = useState<number | null>(null);

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
      {/* Agent Core badge */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: 24,
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0) scale(1)' : 'translateY(-12px) scale(0.9)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 28px',
          borderRadius: 10,
          border: '1.5px solid var(--accent, #D97757)',
          background: 'rgba(217,119,87,0.08)',
          animation: inView ? 'hg-pulse 3s ease-in-out 600ms infinite' : 'none',
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--accent, #D97757)',
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'DM Sans', system-ui",
            fontSize: '1.0625rem',
            fontWeight: 700,
            color: 'var(--text-primary, #e0e0e0)',
            letterSpacing: '0.02em',
          }}>
            Agent Core
          </span>
        </div>
      </div>

      {/* Subtitle */}
      <div style={{
        textAlign: 'center',
        marginBottom: 20,
        opacity: inView ? 1 : 0,
        transition: 'opacity 0.5s ease 200ms',
      }}>
        <span style={{
          fontFamily: "'DM Sans', system-ui",
          fontSize: '0.8125rem',
          color: 'var(--text-secondary, #b0b0c0)',
          opacity: 0.7,
        }}>
          从核心循环到生产级框架，需要跨越 5 道鸿沟
        </span>
      </div>

      {/* Gap cards */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {GAPS.map((gap, i) => {
          const delay = 200 + i * 120;
          const isHovered = hovered === i;

          return (
            <div
              key={gap.chapter}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                borderRadius: 8,
                border: `1px solid ${isHovered ? `${gap.color}66` : `${gap.color}30`}`,
                background: isHovered ? `${gap.color}12` : `${gap.color}06`,
                overflow: 'hidden',
                cursor: 'default',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateX(0)' : 'translateX(-24px)',
                transition: `opacity 0.45s ease ${delay}ms, transform 0.45s ease ${delay}ms, background 0.2s, border-color 0.2s`,
              }}
            >
              {/* Colored left border */}
              <div style={{
                width: 4,
                flexShrink: 0,
                background: gap.color,
                opacity: isHovered ? 1 : 0.65,
                transition: 'opacity 0.2s',
              }} />

              {/* Content */}
              <div style={{
                flex: 1,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                flexWrap: 'wrap',
              }}>
                {/* Chapter badge */}
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px 10px',
                  borderRadius: 4,
                  background: `${gap.color}18`,
                  border: `1px solid ${gap.color}44`,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: gap.color,
                  flexShrink: 0,
                  letterSpacing: '0.04em',
                }}>
                  {gap.chapter}
                </span>

                {/* Gap name */}
                <span style={{
                  fontFamily: "'DM Sans', system-ui",
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  color: gap.color,
                  flexShrink: 0,
                  minWidth: 80,
                }}>
                  {gap.label}
                </span>

                {/* Description */}
                <span style={{
                  fontFamily: "'DM Sans', system-ui",
                  fontSize: '0.8125rem',
                  fontWeight: 400,
                  color: 'var(--text-secondary, #b0b0c0)',
                  lineHeight: 1.5,
                  flex: 1,
                  minWidth: 180,
                }}>
                  {gap.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom connector line */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginTop: 18,
        opacity: inView ? 1 : 0,
        transition: 'opacity 0.6s ease 900ms',
      }}>
        <div style={{
          width: '85%',
          maxWidth: 700,
          height: 1,
          background: 'var(--accent, #D97757)',
          opacity: 0.2,
          borderRadius: 1,
          backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, var(--bg-card, #1e1e2e) 4px, var(--bg-card, #1e1e2e) 8px)',
        }} />
      </div>
    </div>
  );
}
