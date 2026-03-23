import { useState, useCallback, useMemo, useEffect } from 'react';

interface SourceReaderProps {
  code: string;
  filename: string;
  language?: string;
  startLine?: number;
  highlights?: Array<{ line: number; note: string }>;
  githubUrl?: string;
}

/* ─── Minimal TypeScript/JS syntax highlighter ─── */

const KEYWORDS = new Set([
  'import','export','from','const','let','var','function','return','if','else',
  'for','while','do','switch','case','break','continue','new','this','class',
  'extends','implements','interface','type','enum','async','await','yield',
  'try','catch','finally','throw','typeof','instanceof','in','of','void',
  'delete','default','true','false','null','undefined','as','is','keyof',
  'readonly','static','public','private','protected','abstract','declare',
  'module','namespace','require','super','constructor','get','set',
]);

const BUILTINS = new Set([
  'console','process','Promise','Array','Object','String','Number','Boolean',
  'Map','Set','Error','JSON','Math','Date','RegExp','Symbol','Buffer',
  'setTimeout','setInterval','clearTimeout','clearInterval','fetch',
  'parseInt','parseFloat','isNaN','Infinity','NaN','globalThis','window',
  'document','AbortController','AbortSignal','EventEmitter','ReadableStream',
]);

function highlightLine(text: string): JSX.Element[] {
  const tokens: JSX.Element[] = [];
  // Regex: strings → comments → numbers → keywords/identifiers → operators → rest
  const re = /(\/\/.*$|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+\.?\d*\b)|(\b[a-zA-Z_$][\w$]*\b)|(=>|\.\.\.|\?\.|&&|\|\||[!=]==?|[<>]=?|[+\-*/%]=?|[{}()[\];:,.])|(\s+)/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    // Gap before match
    if (match.index > lastIndex) {
      tokens.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    const [full, comment, str, num, ident, op, ws] = match;

    if (comment) {
      tokens.push(<span key={key++} style={{ color: '#5c6370', fontStyle: 'italic' }}>{full}</span>);
    } else if (str) {
      tokens.push(<span key={key++} style={{ color: '#98c379' }}>{full}</span>);
    } else if (num) {
      tokens.push(<span key={key++} style={{ color: '#d19a66' }}>{full}</span>);
    } else if (ident) {
      if (KEYWORDS.has(ident)) {
        tokens.push(<span key={key++} style={{ color: '#c678dd' }}>{full}</span>);
      } else if (BUILTINS.has(ident)) {
        tokens.push(<span key={key++} style={{ color: '#e5c07b' }}>{full}</span>);
      } else if (/^[A-Z]/.test(ident)) {
        tokens.push(<span key={key++} style={{ color: '#e5c07b' }}>{full}</span>);
      } else {
        tokens.push(<span key={key++} style={{ color: '#e0e0e0' }}>{full}</span>);
      }
    } else if (op) {
      tokens.push(<span key={key++} style={{ color: '#56b6c2' }}>{full}</span>);
    } else {
      tokens.push(<span key={key++}>{full}</span>);
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    tokens.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }
  return tokens;
}

/* ─── Component ─── */

export default function SourceReader({
  code,
  filename,
  language = 'typescript',
  startLine = 1,
  highlights = [],
  githubUrl,
}: SourceReaderProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeNote, setActiveNote] = useState<number | null>(null);

  const lines = useMemo(() => code.replace(/\n$/, '').split('\n'), [code]);
  const highlightMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const h of highlights) m.set(h.line, h.note);
    return m;
  }, [highlights]);

  const toggleNote = useCallback((lineNum: number) => {
    setActiveNote(prev => prev === lineNum ? null : lineNum);
  }, []);

  return (
    <div style={{
      margin: '1.5rem 0',
      borderRadius: 10,
      border: '1px solid var(--border, #2a2a3a)',
      background: '#1a1a2e',
      overflow: 'hidden',
      fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      fontSize: '0.8125rem',
      lineHeight: 1.5,
    }}>
      {/* ── Header ── */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 14px',
          background: '#141428',
          borderBottom: collapsed ? 'none' : '1px solid var(--border, #2a2a3a)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
        </div>
        <span style={{ color: 'var(--text-muted, #6a6a80)', fontSize: '0.75rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {filename}
        </span>
        {githubUrl && (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', textDecoration: 'none', opacity: 0.7 }}
          >
            GitHub ↗
          </a>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
          ▾
        </span>
      </div>

      {/* ── Code body ── */}
      {!collapsed && (
        <div style={{ overflowX: 'auto', padding: '10px 0' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto' }}>
            <tbody>
              {lines.map((line, i) => {
                const lineNum = startLine + i;
                const isHighlighted = highlightMap.has(lineNum);
                const isActive = activeNote === lineNum;
                const note = highlightMap.get(lineNum);

                return (
                  <React.Fragment key={i}>
                    <tr
                      onClick={isHighlighted ? () => toggleNote(lineNum) : undefined}
                      style={{
                        background: isHighlighted
                          ? isActive ? 'rgba(217, 119, 87, 0.12)' : 'rgba(217, 119, 87, 0.06)'
                          : 'transparent',
                        cursor: isHighlighted ? 'pointer' : 'default',
                        borderLeft: isHighlighted ? '3px solid var(--accent, #D97757)' : '3px solid transparent',
                      }}
                    >
                      <td style={{
                        width: 1,
                        paddingLeft: 14,
                        paddingRight: 12,
                        textAlign: 'right',
                        userSelect: 'none',
                        color: isHighlighted ? 'var(--accent, #D97757)' : 'var(--text-muted, #6a6a80)',
                        opacity: isHighlighted ? 1 : 0.5,
                        fontSize: '0.75rem',
                        verticalAlign: 'top',
                        whiteSpace: 'nowrap',
                      }}>
                        {lineNum}
                      </td>
                      <td style={{ paddingRight: 16, whiteSpace: 'pre' }}>
                        {highlightLine(line)}
                      </td>
                    </tr>
                    {/* Annotation popover */}
                    {isActive && note && (
                      <tr>
                        <td colSpan={2} style={{ padding: 0 }}>
                          <div style={{
                            margin: '0 14px 6px 40px',
                            padding: '8px 12px',
                            borderRadius: 6,
                            background: 'rgba(217, 119, 87, 0.08)',
                            border: '1px solid rgba(217, 119, 87, 0.2)',
                            color: 'var(--text-secondary, #b0b0c0)',
                            fontSize: '0.8125rem',
                            fontFamily: "'DM Sans', system-ui, sans-serif",
                            lineHeight: 1.5,
                          }}>
                            <span style={{ color: 'var(--accent, #D97757)', fontWeight: 600, marginRight: 6 }}>→</span>
                            {note}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import React from 'react';
