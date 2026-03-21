import { useState, useCallback, useMemo, type CSSProperties } from 'react';

interface SourceReaderProps {
  code: string;
  filename: string;
  language?: string;
  startLine?: number;
  highlights?: Array<{
    line: number;
    note: string;
  }>;
  githubUrl?: string;
}

/* ─── Inline keyframes injected once ─── */
const KEYFRAMES_ID = '__source-reader-keyframes';
function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes sr-slideDown {
      from { opacity: 0; max-height: 0; transform: translateY(-4px); }
      to   { opacity: 1; max-height: 120px; transform: translateY(0); }
    }
    @keyframes sr-slideUp {
      from { opacity: 1; max-height: 120px; transform: translateY(0); }
      to   { opacity: 0; max-height: 0; transform: translateY(-4px); }
    }
    @keyframes sr-expandBody {
      from { opacity: 0; max-height: 0; }
      to   { opacity: 1; max-height: 2000px; }
    }
    @keyframes sr-collapseBody {
      from { opacity: 1; max-height: 2000px; }
      to   { opacity: 0; max-height: 0; }
    }
    @keyframes sr-pulseGlow {
      0%, 100% { box-shadow: inset 3px 0 0 var(--accent, #D97757), 0 0 0 transparent; }
      50%      { box-shadow: inset 3px 0 0 var(--accent, #D97757), 0 0 8px rgba(217,119,87,0.1); }
    }
  `;
  document.head.appendChild(style);
}

/* ─── Style constants ─── */
const colors = {
  bg: '#1e1e2e',
  bgHeader: '#181828',
  bgHeaderHover: '#1c1c32',
  border: '#2a2a3a',
  borderSubtle: '#1a1a2e',
  accent: '#D97757',
  accentWarm: '#E8956F',
  accentDeep: '#C4613F',
  textPrimary: '#e0e0e0',
  textSecondary: '#b0b0c0',
  textMuted: '#6a6a80',
  highlightBg: 'rgba(217, 119, 87, 0.08)',
  highlightBorder: '#D97757',
  annotationBg: '#16162a',
  annotationBorder: 'rgba(217, 119, 87, 0.25)',
  dotRed: '#ff5f57',
  dotYellow: '#febc2e',
  dotGreen: '#28c840',
};

const mono = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";
const sans = "'DM Sans', system-ui, -apple-system, sans-serif";

/* ─── GitHub icon (inline SVG) ─── */
function GitHubIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={{ flexShrink: 0 }}
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/* ─── Chevron icon ─── */
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
        flexShrink: 0,
      }}
    >
      <polyline points="3 4.5 6 7.5 9 4.5" />
    </svg>
  );
}

/* ─── Annotation note icon ─── */
function NoteIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, opacity: 0.7 }}
    >
      <path d="M1.5 3a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 10.5 3v4.5a1.5 1.5 0 0 1-1.5 1.5H5.25L3 11.25V9H3A1.5 1.5 0 0 1 1.5 7.5V3z" />
    </svg>
  );
}

/* ─── Main component ─── */
export default function SourceReader({
  code,
  filename,
  language = 'typescript',
  startLine = 1,
  highlights = [],
  githubUrl,
}: SourceReaderProps) {
  ensureKeyframes();

  const [expanded, setExpanded] = useState(true);
  const [openAnnotations, setOpenAnnotations] = useState<Set<number>>(new Set());
  const [headerHovered, setHeaderHovered] = useState(false);

  const lines = useMemo(() => code.split('\n'), [code]);

  const highlightMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const h of highlights) {
      map.set(h.line, h.note);
    }
    return map;
  }, [highlights]);

  const toggleAnnotation = useCallback((lineNum: number) => {
    setOpenAnnotations((prev) => {
      const next = new Set(prev);
      if (next.has(lineNum)) {
        next.delete(lineNum);
      } else {
        next.add(lineNum);
      }
      return next;
    });
  }, []);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  /* ─── File extension label ─── */
  const extLabel = useMemo(() => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'TypeScript',
      tsx: 'React TSX',
      js: 'JavaScript',
      jsx: 'React JSX',
      py: 'Python',
      rs: 'Rust',
      go: 'Go',
      md: 'Markdown',
      json: 'JSON',
      yaml: 'YAML',
      yml: 'YAML',
      toml: 'TOML',
      css: 'CSS',
      html: 'HTML',
    };
    return ext ? langMap[ext] || language : language;
  }, [filename, language]);

  /* ─── Styles ─── */
  const containerStyle: CSSProperties = {
    borderRadius: '10px',
    border: `1px solid ${colors.border}`,
    overflow: 'hidden',
    fontFamily: mono,
    fontSize: '0.8125rem',
    lineHeight: '1.65',
    margin: '1.5rem 0',
    background: colors.bg,
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2)',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    background: headerHovered ? colors.bgHeaderHover : colors.bgHeader,
    borderBottom: expanded ? `1px solid ${colors.border}` : 'none',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background 0.2s ease',
    position: 'relative',
  };

  const dotsStyle: CSSProperties = {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    flexShrink: 0,
  };

  const dotBase: CSSProperties = {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    transition: 'opacity 0.2s ease',
  };

  const filenameStyle: CSSProperties = {
    flex: 1,
    fontSize: '0.75rem',
    color: colors.textSecondary,
    letterSpacing: '0.01em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: mono,
  };

  const langBadgeStyle: CSSProperties = {
    fontSize: '0.625rem',
    color: colors.textMuted,
    background: 'rgba(106, 106, 128, 0.12)',
    padding: '2px 7px',
    borderRadius: '4px',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    fontWeight: 500,
    fontFamily: sans,
    flexShrink: 0,
  };

  const githubLinkStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.6875rem',
    color: colors.textMuted,
    textDecoration: 'none',
    padding: '3px 8px',
    borderRadius: '4px',
    border: `1px solid ${colors.borderSubtle}`,
    transition: 'all 0.2s ease',
    fontFamily: sans,
    flexShrink: 0,
    letterSpacing: '0.01em',
  };

  const bodyStyle: CSSProperties = {
    overflow: 'hidden',
    animation: expanded
      ? 'sr-expandBody 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards'
      : 'sr-collapseBody 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
  };

  const scrollAreaStyle: CSSProperties = {
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: '600px',
    scrollbarWidth: 'thin',
    scrollbarColor: `${colors.border} transparent`,
  };

  const tableStyle: CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    borderSpacing: 0,
  };

  return (
    <div style={containerStyle} data-source-reader data-language={language}>
      {/* ─── Header / Tab Bar ─── */}
      <div
        style={headerStyle}
        onClick={toggleExpanded}
        onMouseEnter={() => setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} source code: ${filename}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpanded();
          }
        }}
      >
        {/* macOS dots */}
        <div style={dotsStyle}>
          <span style={{ ...dotBase, background: colors.dotRed }} />
          <span style={{ ...dotBase, background: colors.dotYellow }} />
          <span style={{ ...dotBase, background: colors.dotGreen }} />
        </div>

        {/* Chevron */}
        <ChevronIcon expanded={expanded} />

        {/* Filename */}
        <span style={filenameStyle}>{filename}</span>

        {/* Language badge */}
        <span style={langBadgeStyle}>{extLabel}</span>

        {/* GitHub link */}
        {githubUrl && (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={githubLinkStyle}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = colors.accent;
              (e.currentTarget as HTMLAnchorElement).style.borderColor = colors.accent;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = colors.textMuted;
              (e.currentTarget as HTMLAnchorElement).style.borderColor = colors.borderSubtle;
            }}
          >
            <GitHubIcon />
            <span>View source</span>
          </a>
        )}
      </div>

      {/* ─── Code Body ─── */}
      <div style={bodyStyle} aria-hidden={!expanded}>
        <div style={scrollAreaStyle}>
          <table style={tableStyle}>
            <tbody>
              {lines.map((line, idx) => {
                const lineNum = startLine + idx;
                const hasHighlight = highlightMap.has(lineNum);
                const note = highlightMap.get(lineNum);
                const isAnnotationOpen = openAnnotations.has(lineNum);

                return (
                  <LineRow
                    key={lineNum}
                    lineNum={lineNum}
                    content={line}
                    hasHighlight={hasHighlight}
                    note={note}
                    isAnnotationOpen={isAnnotationOpen}
                    onToggle={toggleAnnotation}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom fade edge */}
        <div
          style={{
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${colors.border}, transparent)`,
          }}
        />
      </div>
    </div>
  );
}

/* ─── Line Row Sub-component ─── */
interface LineRowProps {
  lineNum: number;
  content: string;
  hasHighlight: boolean;
  note?: string;
  isAnnotationOpen: boolean;
  onToggle: (lineNum: number) => void;
}

function LineRow({
  lineNum,
  content,
  hasHighlight,
  note,
  isAnnotationOpen,
  onToggle,
}: LineRowProps) {
  const [hovered, setHovered] = useState(false);

  const rowStyle: CSSProperties = {
    background: hasHighlight
      ? colors.highlightBg
      : hovered
        ? 'rgba(255, 255, 255, 0.015)'
        : 'transparent',
    cursor: hasHighlight ? 'pointer' : 'default',
    transition: 'background 0.15s ease',
    borderLeft: hasHighlight ? `3px solid ${colors.highlightBorder}` : '3px solid transparent',
    ...(hasHighlight && hovered
      ? { background: 'rgba(217, 119, 87, 0.12)' }
      : {}),
  };

  const lineNumStyle: CSSProperties = {
    width: '52px',
    minWidth: '52px',
    padding: '0 12px 0 14px',
    textAlign: 'right',
    color: hasHighlight ? colors.accentDeep : colors.textMuted,
    fontSize: '0.75rem',
    userSelect: 'none',
    verticalAlign: 'top',
    lineHeight: '1.65',
    fontFamily: mono,
    opacity: hovered ? 1 : 0.7,
    transition: 'opacity 0.15s ease, color 0.15s ease',
    position: 'relative',
  };

  const codeStyle: CSSProperties = {
    padding: '0 16px 0 4px',
    whiteSpace: 'pre',
    color: colors.textPrimary,
    fontFamily: mono,
    lineHeight: '1.65',
    verticalAlign: 'top',
  };

  const annotationIndicatorStyle: CSSProperties = {
    position: 'absolute',
    right: '-2px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: colors.accent,
    opacity: isAnnotationOpen ? 1 : 0.5,
    transition: 'opacity 0.2s ease',
  };

  const annotationRowStyle: CSSProperties = {
    background: colors.annotationBg,
    borderLeft: `3px solid ${colors.annotationBorder}`,
  };

  const annotationCellStyle: CSSProperties = {
    padding: '0',
    overflow: 'hidden',
  };

  const annotationInnerStyle: CSSProperties = {
    animation: isAnnotationOpen
      ? 'sr-slideDown 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards'
      : 'sr-slideUp 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards',
    overflow: 'hidden',
  };

  const annotationContentStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '8px 16px 8px 70px',
    fontSize: '0.75rem',
    color: colors.accentWarm,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    lineHeight: '1.5',
    letterSpacing: '0.01em',
  };

  return (
    <>
      <tr
        style={rowStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => hasHighlight && onToggle(lineNum)}
      >
        <td style={lineNumStyle}>
          {lineNum}
          {hasHighlight && (
            <span style={annotationIndicatorStyle}>
              <NoteIcon />
            </span>
          )}
        </td>
        <td style={codeStyle}>{content || '\u200B'}</td>
      </tr>
      {hasHighlight && note && (
        <tr style={annotationRowStyle} aria-hidden={!isAnnotationOpen}>
          <td colSpan={2} style={annotationCellStyle}>
            <div style={annotationInnerStyle}>
              <div style={annotationContentStyle}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: colors.accent,
                    marginTop: '6px',
                    flexShrink: 0,
                  }}
                />
                <span>{note}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
