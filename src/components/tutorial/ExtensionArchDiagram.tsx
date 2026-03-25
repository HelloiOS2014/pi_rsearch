import React, { useState, useEffect, useRef, useMemo } from 'react';

/* ─── Data ─── */

const EVENT_TYPES = [
  'tool_call', 'tool_result', 'llm_start', 'llm_end',
  'token', 'error', 'retry', 'session_start',
  'session_end', 'message_add', 'tool_register', 'config_change',
  'memory_save', 'memory_load', 'abort', 'stats_request',
] as const;

interface Extension {
  name: string;
  color: string;
  icon: string;
  events: string[];
}

const EXTENSIONS: Extension[] = [
  { name: 'State Reporter', color: '#a78bfa', icon: '\u{1F4CA}', events: ['stats_request', 'tool_result', 'llm_end', 'session_start', 'session_end'] },
  { name: 'Error Handler', color: '#fb923c', icon: '\u{1F6E1}', events: ['error', 'retry', 'abort'] },
  { name: 'Audit Logger', color: '#4ade80', icon: '\u{1F4DD}', events: ['tool_call', 'tool_result', 'error', 'message_add'] },
  { name: 'Memory Cache', color: '#fbbf24', icon: '\u{1F9E0}', events: ['memory_save', 'memory_load', 'session_start', 'session_end'] },
  { name: 'Rate Limiter', color: '#f472b6', icon: '\u{23F1}', events: ['llm_start', 'token', 'retry'] },
  { name: 'Custom Tools', color: '#60a5fa', icon: '\u{1F527}', events: ['tool_register', 'tool_call', 'config_change'] },
];

/* ─── Hook: IntersectionObserver ─── */

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

/* ─── Hook: pulse animation for the bus ─── */

function usePulse(active: boolean) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 1200);
    }, 2400);
    // Kick off immediately
    setPulse(true);
    setTimeout(() => setPulse(false), 1200);
    return () => clearInterval(interval);
  }, [active]);

  return pulse;
}

/* ─── Build reverse lookup: event -> extensions that subscribe ─── */

function buildEventToExtensions(): Map<string, number[]> {
  const m = new Map<string, number[]>();
  EVENT_TYPES.forEach(evt => m.set(evt, []));
  EXTENSIONS.forEach((ext, i) => {
    ext.events.forEach(evt => {
      m.get(evt)?.push(i);
    });
  });
  return m;
}

/* ─── Component ─── */

export default function ExtensionArchDiagram() {
  const [ref, inView] = useInView(0.1);
  const [hoveredExt, setHoveredExt] = useState<number | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const pulse = usePulse(inView);

  const eventToExtensions = useMemo(buildEventToExtensions, []);

  // When hovering an extension, which events light up
  const highlightedEvents = useMemo<Set<string>>(() => {
    if (hoveredExt !== null) return new Set(EXTENSIONS[hoveredExt].events);
    if (hoveredEvent !== null) return new Set([hoveredEvent]);
    return new Set();
  }, [hoveredExt, hoveredEvent]);

  // When hovering an event, which extensions light up
  const highlightedExtensions = useMemo<Set<number>>(() => {
    if (hoveredExt !== null) return new Set([hoveredExt]);
    if (hoveredEvent !== null) return new Set(eventToExtensions.get(hoveredEvent) || []);
    return new Set();
  }, [hoveredExt, hoveredEvent, eventToExtensions]);

  const isHighlighting = hoveredExt !== null || hoveredEvent !== null;

  // Color for a highlighted event badge: blend colors of subscribing extensions
  function getEventHighlightColor(evt: string): string {
    if (hoveredExt !== null) return EXTENSIONS[hoveredExt].color;
    // When hovering an event, use the first subscribing extension's color
    const extIndices = eventToExtensions.get(evt) || [];
    if (extIndices.length > 0) return EXTENSIONS[extIndices[0]].color;
    return 'var(--accent, #D97757)';
  }

  /* ─── Keyframes (injected once) ─── */
  const styleId = 'ext-arch-keyframes';
  useEffect(() => {
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes ext-arch-pulse {
        0% { box-shadow: 0 0 0 0 rgba(217,119,87,0.4); }
        70% { box-shadow: 0 0 0 12px rgba(217,119,87,0); }
        100% { box-shadow: 0 0 0 0 rgba(217,119,87,0); }
      }
      @keyframes ext-arch-particle {
        0% { transform: translateY(0); opacity: 0; }
        15% { opacity: 1; }
        85% { opacity: 1; }
        100% { transform: translateY(24px); opacity: 0; }
      }
      @keyframes ext-arch-shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div
      ref={ref}
      style={{
        margin: '1.5rem 0',
        padding: 24,
        borderRadius: 8,
        border: '1px solid var(--border, #2a2a3a)',
        background: 'var(--bg-card, #1e1e2e)',
        fontFamily: "'DM Sans', system-ui",
        overflow: 'hidden',
      }}
    >
      {/* ── Title ── */}
      <div style={{
        textAlign: 'center',
        marginBottom: 8,
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(-12px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
        <div style={{
          fontSize: '1.125rem',
          fontWeight: 700,
          color: 'var(--text-primary, #e0e0e0)',
          letterSpacing: '0.02em',
        }}>
          Extension Architecture
        </div>
        <div style={{
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.35)',
          fontFamily: "'JetBrains Mono', monospace",
          marginTop: 4,
        }}>
          Event Bus + Plugin System
        </div>
      </div>

      {/* ── Event Bus Card ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: 16,
        opacity: inView ? 1 : 0,
        transform: inView ? 'scale(1)' : 'scale(0.85)',
        transition: 'opacity 0.5s ease 0.15s, transform 0.5s ease 0.15s',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 28px',
          borderRadius: 8,
          background: 'rgba(217,119,87,0.1)',
          border: '2px solid rgba(217,119,87,0.5)',
          color: 'var(--accent, #D97757)',
          fontWeight: 700,
          fontSize: '1rem',
          letterSpacing: '0.04em',
          position: 'relative',
          animation: pulse ? 'ext-arch-pulse 1.2s ease-out' : 'none',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 6h10M8 12h10M8 18h10M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
          Event Bus
          {/* Particle dots flowing down when pulsing */}
          {pulse && (
            <>
              <div style={{
                position: 'absolute',
                bottom: -6,
                left: '30%',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'var(--accent, #D97757)',
                animation: 'ext-arch-particle 1s ease-out forwards',
              }} />
              <div style={{
                position: 'absolute',
                bottom: -6,
                left: '55%',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'var(--accent, #D97757)',
                animation: 'ext-arch-particle 1s ease-out 0.2s forwards',
              }} />
              <div style={{
                position: 'absolute',
                bottom: -6,
                left: '75%',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'var(--accent, #D97757)',
                animation: 'ext-arch-particle 1s ease-out 0.4s forwards',
              }} />
            </>
          )}
        </div>
      </div>

      {/* ── Connector line from bus to events ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: 8,
        opacity: inView ? 1 : 0,
        transition: 'opacity 0.4s ease 0.3s',
      }}>
        <div style={{
          width: 2,
          height: 20,
          background: 'linear-gradient(to bottom, rgba(217,119,87,0.5), rgba(217,119,87,0.1))',
          borderRadius: 1,
        }} />
      </div>

      {/* ── Section label: events ── */}
      <div style={{
        textAlign: 'center',
        marginBottom: 10,
        opacity: inView ? 1 : 0,
        transition: 'opacity 0.4s ease 0.35s',
      }}>
        <span style={{
          fontSize: '0.625rem',
          fontWeight: 700,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          16 Event Types
        </span>
      </div>

      {/* ── Event Grid (4x4) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 6,
        marginBottom: 16,
        maxWidth: 560,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        {EVENT_TYPES.map((evt, i) => {
          const delay = 0.35 + i * 0.04;
          const isLit = highlightedEvents.has(evt);
          const isDimmed = isHighlighting && !isLit;
          const litColor = isLit ? getEventHighlightColor(evt) : '';

          return (
            <div
              key={evt}
              onMouseEnter={() => setHoveredEvent(evt)}
              onMouseLeave={() => setHoveredEvent(null)}
              style={{
                padding: '5px 6px',
                borderRadius: 5,
                border: `1px solid ${isLit ? `${litColor}88` : 'var(--border, #2a2a3a)'}`,
                background: isLit
                  ? `${litColor}18`
                  : 'rgba(255,255,255,0.02)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.6875rem',
                color: isLit
                  ? litColor
                  : isDimmed
                    ? 'rgba(255,255,255,0.2)'
                    : 'var(--text-primary, #e0e0e0)',
                textAlign: 'center',
                cursor: 'default',
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(10px)',
                transition: `
                  opacity 0.35s ease ${delay}s,
                  transform 0.35s ease ${delay}s,
                  background 0.2s ease,
                  border-color 0.2s ease,
                  color 0.2s ease,
                  box-shadow 0.2s ease
                `,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                boxShadow: isLit ? `0 0 8px ${litColor}30` : 'none',
              }}
            >
              {evt}
            </div>
          );
        })}
      </div>

      {/* ── Connector lines from events to extensions ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 8,
        opacity: inView ? 1 : 0,
        transition: 'opacity 0.4s ease 1.1s',
      }}>
        {[0, 1, 2].map(k => (
          <div key={k} style={{
            width: 1,
            height: 18,
            backgroundImage: `repeating-linear-gradient(
              to bottom,
              rgba(255,255,255,0.15) 0px,
              rgba(255,255,255,0.15) 3px,
              transparent 3px,
              transparent 6px
            )`,
          }} />
        ))}
      </div>

      {/* ── Section label: extensions ── */}
      <div style={{
        textAlign: 'center',
        marginBottom: 10,
        opacity: inView ? 1 : 0,
        transition: 'opacity 0.4s ease 1.15s',
      }}>
        <span style={{
          fontSize: '0.625rem',
          fontWeight: 700,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          Extension Plugins
        </span>
      </div>

      {/* ── Extension Plugin Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        maxWidth: 600,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        {EXTENSIONS.map((ext, i) => {
          const delay = 1.2 + i * 0.1;
          const isHovered = hoveredExt === i;
          const isLit = highlightedExtensions.has(i);
          const isDimmed = isHighlighting && !isLit;

          return (
            <div
              key={ext.name}
              onMouseEnter={() => setHoveredExt(i)}
              onMouseLeave={() => setHoveredExt(null)}
              style={{
                padding: '10px 10px 8px',
                borderRadius: 8,
                border: `1.5px solid ${isLit ? `${ext.color}88` : isDimmed ? 'rgba(42,42,58,0.5)' : `${ext.color}44`}`,
                background: isHovered
                  ? `${ext.color}18`
                  : isDimmed
                    ? 'rgba(255,255,255,0.01)'
                    : `${ext.color}08`,
                cursor: 'default',
                opacity: inView ? (isDimmed ? 0.45 : 1) : 0,
                transform: inView ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.9)',
                transition: `
                  opacity 0.4s ease ${delay}s,
                  transform 0.4s ease ${delay}s,
                  background 0.2s ease,
                  border-color 0.2s ease,
                  box-shadow 0.25s ease
                `,
                boxShadow: isHovered ? `0 0 16px ${ext.color}25` : 'none',
                position: 'relative' as const,
              }}
            >
              {/* Color accent bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 12,
                right: 12,
                height: 2,
                borderRadius: '0 0 2px 2px',
                background: ext.color,
                opacity: isLit ? 0.8 : 0.3,
                transition: 'opacity 0.2s',
              }} />

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 6,
              }}>
                <span style={{ fontSize: '0.875rem', lineHeight: 1 }}>{ext.icon}</span>
                <span style={{
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: isLit ? ext.color : isDimmed ? 'rgba(255,255,255,0.3)' : ext.color,
                  transition: 'color 0.2s',
                  fontFamily: "'DM Sans', system-ui",
                }}>
                  {ext.name}
                </span>
              </div>

              {/* Subscribed events list */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 3,
              }}>
                {ext.events.map(evt => (
                  <span key={evt} style={{
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: (isHovered || isLit)
                      ? `${ext.color}20`
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${(isHovered || isLit) ? `${ext.color}40` : 'rgba(255,255,255,0.06)'}`,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.5625rem',
                    color: (isHovered || isLit) ? ext.color : isDimmed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.45)',
                    transition: 'background 0.2s, border-color 0.2s, color 0.2s',
                    whiteSpace: 'nowrap',
                  }}>
                    {evt}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom description ── */}
      <div style={{
        textAlign: 'center',
        marginTop: 16,
        opacity: inView ? 1 : 0,
        transition: 'opacity 0.5s ease 1.8s',
      }}>
        <span style={{
          fontSize: '0.6875rem',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          tool_call event → extension intercepts → modified result flows back
        </span>
      </div>
    </div>
  );
}
