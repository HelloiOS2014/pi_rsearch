import { useState, useRef, useEffect, type CSSProperties } from 'react';

interface CodePanelConfig {
  code: string;
  label: string;
  language?: string;
}

interface CodeComparisonProps {
  left: CodePanelConfig;
  right: CodePanelConfig;
}

/* ── Inline style objects ── */

const containerStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  borderRadius: 8,
  overflow: 'hidden',
  border: '1px solid var(--border, #2a2a3a)',
  background: 'var(--bg-card, #1e1e2e)',
  fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
  fontSize: '0.8125rem',
  lineHeight: 1.65,
};

const containerMobileStyle: CSSProperties = {
  ...containerStyle,
  gridTemplateColumns: '1fr',
};

const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  overflow: 'hidden',
};

const panelRightBorderStyle: CSSProperties = {
  borderRight: '1px solid var(--border, #2a2a3a)',
};

const panelTopBorderStyle: CSSProperties = {
  borderTop: '1px solid var(--border, #2a2a3a)',
};

const headerBaseStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 14px',
  fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
  fontSize: '0.8125rem',
  fontWeight: 600,
  letterSpacing: '0.01em',
  borderBottom: '1px solid var(--border, #2a2a3a)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};

const leftHeaderStyle: CSSProperties = {
  ...headerBaseStyle,
  background: 'linear-gradient(135deg, rgba(96, 140, 210, 0.12) 0%, rgba(96, 140, 210, 0.04) 100%)',
  color: '#8cb4e0',
};

const rightHeaderStyle: CSSProperties = {
  ...headerBaseStyle,
  background: 'linear-gradient(135deg, rgba(217, 119, 87, 0.12) 0%, rgba(217, 119, 87, 0.04) 100%)',
  color: 'var(--accent, #D97757)',
};

const dotStyle = (color: string): CSSProperties => ({
  width: 7,
  height: 7,
  borderRadius: '50%',
  backgroundColor: color,
  flexShrink: 0,
  boxShadow: `0 0 6px ${color}44`,
});

const codeScrollAreaStyle: CSSProperties = {
  overflowX: 'auto',
  overflowY: 'auto',
  flex: 1,
};

const codeTableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'auto',
};

const lineNumberCellStyle: CSSProperties = {
  width: 1,
  paddingLeft: 14,
  paddingRight: 10,
  textAlign: 'right',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  color: 'var(--text-muted, #6a6a80)',
  opacity: 0.6,
  fontSize: '0.75rem',
  verticalAlign: 'top',
  whiteSpace: 'nowrap',
};

const codeCellStyle: CSSProperties = {
  paddingRight: 14,
  whiteSpace: 'pre',
  color: 'var(--text-primary, #e0e0e0)',
};

const lineRowStyle: CSSProperties = {
  transition: 'background 0.15s ease',
};

/* ── Subcomponents ── */

function CodePanel({
  config,
  side,
  isMobile,
}: {
  config: CodePanelConfig;
  side: 'left' | 'right';
  isMobile: boolean;
}) {
  const lines = config.code.replace(/\n$/, '').split('\n');
  const headerStyle = side === 'left' ? leftHeaderStyle : rightHeaderStyle;
  const accentColor = side === 'left' ? '#608cd2' : 'var(--accent, #D97757)';
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  const borderStyle =
    side === 'left' && !isMobile
      ? panelRightBorderStyle
      : side === 'right' && isMobile
        ? panelTopBorderStyle
        : {};

  return (
    <div style={{ ...panelStyle, ...borderStyle }}>
      {/* Sticky header */}
      <div style={headerStyle}>
        <span style={dotStyle(accentColor)} />
        <span>{config.label}</span>
        {config.language && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '0.6875rem',
              fontWeight: 400,
              color: 'var(--text-muted, #6a6a80)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
            }}
          >
            {config.language}
          </span>
        )}
      </div>

      {/* Scrollable code area */}
      <div style={codeScrollAreaStyle}>
        <table style={codeTableStyle} role="presentation">
          <tbody>
            {lines.map((line, i) => (
              <tr
                key={i}
                style={{
                  ...lineRowStyle,
                  background:
                    hoveredLine === i
                      ? 'rgba(255,255,255,0.03)'
                      : 'transparent',
                }}
                onMouseEnter={() => setHoveredLine(i)}
                onMouseLeave={() => setHoveredLine(null)}
              >
                <td style={lineNumberCellStyle}>{i + 1}</td>
                <td style={codeCellStyle}>{line || ' '}</td>
              </tr>
            ))}
            {/* Bottom padding row */}
            <tr>
              <td style={{ height: 12 }} colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main component ── */

export default function CodeComparison({ left, right }: CodeComparisonProps) {
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    handler(mq);
    mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () =>
      mq.removeEventListener(
        'change',
        handler as (e: MediaQueryListEvent) => void,
      );
  }, []);

  return (
    <div
      ref={containerRef}
      style={isMobile ? containerMobileStyle : containerStyle}
    >
      <CodePanel config={left} side="left" isMobile={isMobile} />
      <CodePanel config={right} side="right" isMobile={isMobile} />
    </div>
  );
}
