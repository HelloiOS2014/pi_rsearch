import React, { useState, useEffect, useMemo } from 'react';

interface CodePanelConfig {
  code: string;
  label: string;
  language?: string;
}

interface CodeComparisonProps {
  left: CodePanelConfig;
  right: CodePanelConfig;
}

/* ─── Syntax highlighting (shared with SourceReader) ─── */

const KW = new Set([
  'import','export','from','const','let','var','function','return','if','else',
  'for','while','do','switch','case','break','continue','new','this','class',
  'extends','implements','interface','type','enum','async','await','yield',
  'try','catch','finally','throw','typeof','instanceof','in','of','void',
  'delete','default','true','false','null','undefined','as','is','keyof',
  'readonly','static','public','private','protected','abstract','declare',
]);

const BI = new Set([
  'console','process','Promise','Array','Object','String','Number','Boolean',
  'Map','Set','Error','JSON','Math','Date','RegExp','Symbol','Buffer',
  'setTimeout','setInterval','fetch','AbortController',
]);

function hl(text: string): JSX.Element[] {
  const out: JSX.Element[] = [];
  const re = /(\/\/.*$|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+\.?\d*\b)|(\b[a-zA-Z_$][\w$]*\b)|(=>|\.\.\.|\?\.|&&|\|\||[!=]==?|[<>]=?|[+\-*/%]=?|[{}()[\];:,.])|(\s+)/g;
  let m: RegExpExecArray | null;
  let last = 0, k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    const [full, cmt, str, num, id] = m;
    const color = cmt ? '#5c6370' : str ? '#98c379' : num ? '#d19a66'
      : id ? (KW.has(id) ? '#c678dd' : BI.has(id) || /^[A-Z]/.test(id) ? '#e5c07b' : '#e0e0e0')
      : '#56b6c2';
    out.push(<span key={k++} style={{ color, ...(cmt ? { fontStyle: 'italic' as const } : {}) }}>{full}</span>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(<span key={k++}>{text.slice(last)}</span>);
  return out;
}

/* ─── Code Panel ─── */

function Panel({ config, accent, tag }: { config: CodePanelConfig; accent: string; tag: string }) {
  const lines = useMemo(() => config.code.replace(/\n$/, '').split('\n'), [config.code]);

  return (
    <div style={{ background: '#1a1a2e', borderRadius: 8, border: '1px solid var(--border, #2a2a3a)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px',
        background: `linear-gradient(135deg, ${accent}14 0%, ${accent}06 100%)`,
        borderBottom: '1px solid var(--border, #2a2a3a)',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}44` }} />
        <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '0.8125rem', fontWeight: 600, color: accent }}>
          {config.label}
        </span>
        {config.language && (
          <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
            {config.language}
          </span>
        )}
        <span style={{
          marginLeft: config.language ? 0 : 'auto',
          fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em',
          padding: '2px 6px', borderRadius: 3,
          background: `${accent}20`, color: accent,
        }}>
          {tag}
        </span>
      </div>

      {/* Code */}
      <div style={{ overflowX: 'auto', padding: '10px 0', fontFamily: "'JetBrains Mono', 'SF Mono', monospace", fontSize: '0.8125rem', lineHeight: 1.5 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i}>
                <td style={{
                  width: 1, paddingLeft: 14, paddingRight: 12,
                  textAlign: 'right', userSelect: 'none',
                  color: 'var(--text-muted)', opacity: 0.4,
                  fontSize: '0.75rem', whiteSpace: 'nowrap', verticalAlign: 'top',
                }}>{i + 1}</td>
                <td style={{ paddingRight: 16, whiteSpace: 'pre' }}>{hl(line)}</td>
              </tr>
            ))}
            <tr><td colSpan={2} style={{ height: 8 }} /></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export default function CodeComparison({ left, right }: CodeComparisonProps) {
  const [mode, setMode] = useState<'stacked' | 'side'>('stacked');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const h = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    h(mq);
    mq.addEventListener('change', h as any);
    return () => mq.removeEventListener('change', h as any);
  }, []);

  // Mobile always stacked
  const effectiveMode = isMobile ? 'stacked' : mode;

  return (
    <div style={{ margin: '1.5rem 0' }}>
      {/* Mode toggle (desktop only) */}
      {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, gap: 4 }}>
          <button
            onClick={() => setMode('stacked')}
            style={{
              padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
              fontSize: '0.6875rem', fontFamily: "'DM Sans', system-ui, sans-serif",
              background: mode === 'stacked' ? 'var(--accent, #D97757)' : 'var(--bg-card, #1e1e2e)',
              color: mode === 'stacked' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            ☰ 上下
          </button>
          <button
            onClick={() => setMode('side')}
            style={{
              padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
              fontSize: '0.6875rem', fontFamily: "'DM Sans', system-ui, sans-serif",
              background: mode === 'side' ? 'var(--accent, #D97757)' : 'var(--bg-card, #1e1e2e)',
              color: mode === 'side' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            ◫ 左右
          </button>
        </div>
      )}

      {/* Panels */}
      <div style={{
        display: effectiveMode === 'side' ? 'grid' : 'flex',
        gridTemplateColumns: effectiveMode === 'side' ? '1fr 1fr' : undefined,
        flexDirection: effectiveMode === 'stacked' ? 'column' as const : undefined,
        gap: effectiveMode === 'stacked' ? 12 : 10,
      }}>
        <Panel config={left} accent="#608cd2" tag="A" />
        <Panel config={right} accent="#D97757" tag="B" />
      </div>
    </div>
  );
}
