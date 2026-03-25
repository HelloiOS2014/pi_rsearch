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

/* ─── Data ─── */

const RED = '#f87171';
const BLUE = '#60a5fa';
const YELLOW = '#fbbf24';
const GREEN = '#4ade80';

interface ConfigEntry {
  key: string;
  value: string;
}

interface ConfigLayer {
  label: string;
  color: string;
  entries: ConfigEntry[];
}

const LAYERS: ConfigLayer[] = [
  {
    label: 'Enterprise',
    color: '#a78bfa',
    entries: [
      { key: 'maxRetries', value: '3' },
      { key: 'compaction', value: '{ enabled: true, threshold: 0.75 }' },
      { key: 'tools', value: '["read", "edit", "bash"]' },
    ],
  },
  {
    label: 'Organization',
    color: '#818cf8',
    entries: [
      { key: 'compaction', value: '{ threshold: 0.6 }' },
    ],
  },
  {
    label: 'Project',
    color: '#6366f1',
    entries: [
      { key: 'maxRetries', value: '5' },
    ],
  },
  {
    label: 'User',
    color: '#8b5cf6',
    entries: [
      { key: 'tools', value: '["read", "edit"]' },
    ],
  },
];

interface MergeBehavior {
  id: string;
  title: string;
  titleEn: string;
  color: string;
  description: string;
  highlightKeys: string[];
  highlightLayers: string[];
  resultKey: string;
  resultValue: string;
  resultAnnotation: string;
}

const BEHAVIORS: MergeBehavior[] = [
  {
    id: 'primitive',
    title: 'Primitive Override',
    titleEn: '原语覆盖',
    color: RED,
    description: '后层的标量值直接覆盖前层。Project 的 maxRetries: 5 覆盖 Enterprise 的 3。',
    highlightKeys: ['maxRetries'],
    highlightLayers: ['Enterprise', 'Project'],
    resultKey: 'maxRetries',
    resultValue: '5',
    resultAnnotation: 'override',
  },
  {
    id: 'object',
    title: 'Object Merge',
    titleEn: '对象合并',
    color: BLUE,
    description: '对象类型做深合并。Organization 的 threshold: 0.6 覆盖同名字段，Enterprise 的 enabled: true 被保留。',
    highlightKeys: ['compaction'],
    highlightLayers: ['Enterprise', 'Organization'],
    resultKey: 'compaction',
    resultValue: '{ enabled: true, threshold: 0.6 }',
    resultAnnotation: 'merged',
  },
  {
    id: 'array',
    title: 'Array Replace',
    titleEn: '数组替换',
    color: YELLOW,
    description: '数组整体替换而非追加。User 的 tools 列表直接替换 Enterprise 的完整列表。',
    highlightKeys: ['tools'],
    highlightLayers: ['Enterprise', 'User'],
    resultKey: 'tools',
    resultValue: '["read", "edit"]',
    resultAnnotation: 'replaced',
  },
];

/* ─── Keyframe injection ─── */

const STYLE_ID = 'config-merge-keyframes';

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes cm-highlight-pulse {
      0%, 100% { opacity: 0.6; }
      50%      { opacity: 1; }
    }
    @keyframes cm-arrow-draw {
      from { stroke-dashoffset: 50; }
      to   { stroke-dashoffset: 0; }
    }
    @keyframes cm-result-glow {
      0%, 100% { box-shadow: none; }
      50%      { box-shadow: 0 0 14px var(--glow-color, rgba(74,222,128,0.3)); }
    }
  `;
  document.head.appendChild(style);
}

/* ─── Sub-components ─── */

function ConfigCard({
  layer,
  index,
  inView,
  activeBehavior,
}: {
  layer: ConfigLayer;
  index: number;
  inView: boolean;
  activeBehavior: MergeBehavior | null;
}) {
  const delay = index * 100;
  const isHighlightedLayer = activeBehavior?.highlightLayers.includes(layer.label);

  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 8,
      border: `1px solid ${isHighlightedLayer ? `${layer.color}88` : `${layer.color}35`}`,
      background: isHighlightedLayer ? `${layer.color}12` : `${layer.color}06`,
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(16px)',
      transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms, border-color 0.3s, background 0.3s`,
    }}>
      {/* Layer label */}
      <div style={{
        fontFamily: "'DM Sans', system-ui",
        fontSize: '0.8125rem',
        fontWeight: 700,
        color: layer.color,
        marginBottom: 6,
        letterSpacing: '0.02em',
      }}>
        {layer.label}
      </div>

      {/* Entries */}
      {layer.entries.map((entry) => {
        const isHighlightedKey = activeBehavior?.highlightKeys.includes(entry.key);
        const isActive = isHighlightedLayer && isHighlightedKey;

        // Determine if this entry is "struck through" (overridden by a later layer)
        const isOverridden = activeBehavior && isActive &&
          activeBehavior.highlightLayers.indexOf(layer.label) <
          activeBehavior.highlightLayers.length - 1 &&
          activeBehavior.id !== 'object'; // Object merge doesn't strike through

        return (
          <div key={entry.key} style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 4,
            padding: '2px 0',
            position: 'relative',
            lineHeight: 1.5,
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.75rem',
              fontWeight: 500,
              color: isActive
                ? activeBehavior!.color
                : 'var(--text-primary, #e0e0e0)',
              transition: 'color 0.3s',
            }}>
              {entry.key}
            </span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.2)',
            }}>:</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.7rem',
              fontWeight: isActive ? 600 : 400,
              color: isActive
                ? activeBehavior!.color
                : 'var(--text-secondary, #b0b0c0)',
              textDecoration: isOverridden ? 'line-through' : 'none',
              opacity: isOverridden ? 0.5 : 1,
              transition: 'color 0.3s, opacity 0.3s',
              wordBreak: 'break-all' as const,
              animation: isActive && !isOverridden
                ? 'cm-highlight-pulse 2s ease-in-out infinite'
                : 'none',
            }}>
              {entry.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MergedResult({
  inView,
  activeBehavior,
}: {
  inView: boolean;
  activeBehavior: MergeBehavior | null;
}) {
  const mergedEntries = [
    { key: 'maxRetries', value: '5', color: RED, annotation: 'override' },
    { key: 'compaction', value: '{ enabled: true, threshold: 0.6 }', color: BLUE, annotation: 'merged' },
    { key: 'tools', value: '["read", "edit"]', color: YELLOW, annotation: 'replaced' },
  ];

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 8,
      border: `1.5px solid ${GREEN}55`,
      background: `${GREEN}06`,
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.5s ease 500ms, transform 0.5s ease 500ms',
    }}>
      {/* Title */}
      <div style={{
        fontFamily: "'DM Sans', system-ui",
        fontSize: '0.8125rem',
        fontWeight: 700,
        color: GREEN,
        marginBottom: 10,
        letterSpacing: '0.02em',
      }}>
        Merged Config
      </div>

      {/* Merged entries */}
      {mergedEntries.map((entry) => {
        const isActiveResult = activeBehavior?.resultKey === entry.key;

        return (
          <div key={entry.key} style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 4,
            padding: '3px 0',
            lineHeight: 1.5,
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--text-primary, #e0e0e0)',
            }}>
              {entry.key}
            </span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.2)',
            }}>:</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.7rem',
              fontWeight: isActiveResult ? 700 : 500,
              color: entry.color,
              opacity: isActiveResult ? 1 : 0.7,
              transition: 'opacity 0.3s, font-weight 0.3s',
              wordBreak: 'break-all' as const,
              textShadow: isActiveResult ? `0 0 10px ${entry.color}50` : 'none',
            }}>
              {entry.value}
            </span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.625rem',
              color: entry.color,
              opacity: isActiveResult ? 0.8 : 0.4,
              marginLeft: 4,
              flexShrink: 0,
              transition: 'opacity 0.3s',
            }}>
              {entry.annotation}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main component ─── */

export default function ConfigMergeDiagram() {
  const [ref, inView] = useInView(0.1);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    ensureKeyframes();
  }, []);

  const total = BEHAVIORS.length;
  const activeBehavior = BEHAVIORS[currentStep] || null;
  const progress = total > 1 ? ((currentStep + 1) / total) * 100 : 100;

  const goPrev = () => setCurrentStep(i => Math.max(0, i - 1));
  const goNext = () => setCurrentStep(i => Math.min(total - 1, i + 1));

  return (
    <div
      ref={ref}
      style={{
        margin: '1.5rem 0',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid var(--border, #2a2a3a)',
        background: 'var(--bg-card, #1e1e2e)',
      }}
    >
      {/* Progress bar */}
      <div style={{
        height: 3,
        background: 'rgba(255,255,255,0.04)',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: activeBehavior?.color || 'var(--accent, #D97757)',
          borderRadius: '0 2px 2px 0',
          transition: 'width 0.3s ease, background 0.3s ease',
        }} />
      </div>

      {/* Step header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        borderBottom: '1px solid var(--border, #2a2a3a)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          borderRadius: '50%',
          flexShrink: 0,
          background: activeBehavior?.color || 'var(--accent, #D97757)',
          color: '#fff',
          fontSize: '0.6875rem',
          fontWeight: 700,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          transition: 'background 0.3s',
        }}>
          {currentStep + 1}
        </span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: '0.875rem',
            fontWeight: 600,
            color: activeBehavior?.color || 'var(--text-primary, #e0e0e0)',
            transition: 'color 0.3s',
          }}>
            {activeBehavior?.title}
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.6875rem',
            color: 'var(--text-secondary, #b0b0c0)',
            opacity: 0.7,
          }}>
            {activeBehavior?.titleEn}
          </span>
        </div>
        <span style={{
          fontSize: '0.6875rem',
          color: 'var(--text-muted)',
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>
          {currentStep + 1} / {total}
        </span>
      </div>

      {/* Main content area */}
      <div style={{ padding: '16px' }}>
        {/* Description */}
        <p style={{
          margin: '0 0 16px',
          fontSize: '0.8125rem',
          lineHeight: 1.65,
          color: 'var(--text-secondary, #b0b0c0)',
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>
          {activeBehavior?.description}
        </p>

        {/* Two-column layout: Config layers | Merged result */}
        <div style={{
          display: 'flex',
          gap: 16,
          alignItems: 'stretch',
          flexWrap: 'wrap',
        }}>
          {/* Left: Config layers */}
          <div style={{
            flex: '1 1 280px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            minWidth: 240,
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: 'var(--text-secondary, #b0b0c0)',
              opacity: 0.5,
              marginBottom: 4,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
            }}>
              Config Layers
            </div>
            {LAYERS.map((layer, i) => (
              <ConfigCard
                key={layer.label}
                layer={layer}
                index={i}
                inView={inView}
                activeBehavior={activeBehavior}
              />
            ))}
          </div>

          {/* Center: Merge arrow */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            padding: '0 4px',
            alignSelf: 'center',
            opacity: inView ? 1 : 0,
            transition: 'opacity 0.5s ease 600ms',
          }}>
            <svg
              width="40"
              height="24"
              viewBox="0 0 40 24"
              style={{ overflow: 'visible' }}
            >
              <line
                x1="0"
                y1="12"
                x2="30"
                y2="12"
                stroke={activeBehavior?.color || GREEN}
                strokeWidth="1.5"
                strokeDasharray="50"
                style={{
                  animation: inView ? 'cm-arrow-draw 0.8s ease 700ms forwards' : 'none',
                  opacity: 0.6,
                  transition: 'stroke 0.3s',
                }}
              />
              <polygon
                points="28,7 38,12 28,17"
                fill={activeBehavior?.color || GREEN}
                style={{
                  opacity: inView ? 0.6 : 0,
                  transition: 'opacity 0.3s ease 1000ms, fill 0.3s',
                }}
              />
            </svg>
          </div>

          {/* Right: Merged result */}
          <div style={{
            flex: '1 1 240px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 220,
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: 'var(--text-secondary, #b0b0c0)',
              opacity: 0.5,
              marginBottom: 4,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
            }}>
              Result
            </div>
            <MergedResult
              inView={inView}
              activeBehavior={activeBehavior}
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderTop: '1px solid var(--border, #2a2a3a)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 5 }}>
          {BEHAVIORS.map((b, i) => (
            <button key={b.id} onClick={() => setCurrentStep(i)} style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              padding: 0,
              border: 'none',
              cursor: 'pointer',
              background: i === currentStep ? (b.color || 'var(--accent, #D97757)') : 'rgba(255,255,255,0.12)',
              boxShadow: i === currentStep ? `0 0 6px ${b.color}66` : 'none',
              transition: 'all 0.2s',
            }} aria-label={`Go to step ${i + 1}`} />
          ))}
        </div>

        {/* Prev / Next buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={goPrev} disabled={currentStep === 0} style={{
            padding: '4px 12px',
            borderRadius: 4,
            border: 'none',
            cursor: currentStep === 0 ? 'default' : 'pointer',
            fontSize: '0.75rem',
            fontWeight: 500,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            background: currentStep === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
            color: currentStep === 0 ? 'var(--text-muted)' : 'var(--text-secondary, #b0b0c0)',
            opacity: currentStep === 0 ? 0.5 : 1,
            transition: 'all 0.15s',
          }}>
            &larr; Previous
          </button>
          <button onClick={goNext} disabled={currentStep === total - 1} style={{
            padding: '4px 12px',
            borderRadius: 4,
            border: 'none',
            cursor: currentStep === total - 1 ? 'default' : 'pointer',
            fontSize: '0.75rem',
            fontWeight: 500,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            background: currentStep === total - 1 ? 'rgba(255,255,255,0.04)' : (activeBehavior?.color || 'var(--accent, #D97757)'),
            color: currentStep === total - 1 ? 'var(--text-muted)' : '#fff',
            opacity: currentStep === total - 1 ? 0.5 : 1,
            transition: 'all 0.15s',
          }}>
            Next &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
