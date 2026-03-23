import React, { useState, useCallback, useMemo } from 'react';

interface SourceReaderProps {
  code: string;
  filename: string;
  language?: string;
  startLine?: number;
  highlights?: Array<{ line: number; note: string }>;
  githubUrl?: string;
}

/* ─── Syntax highlighter ─── */

const KW = new Set('import,export,from,const,let,var,function,return,if,else,for,while,do,switch,case,break,continue,new,this,class,extends,implements,interface,type,enum,async,await,yield,try,catch,finally,throw,typeof,instanceof,in,of,void,delete,default,true,false,null,undefined,as,is,keyof,readonly,static,public,private,protected,abstract,declare,module,namespace,require,super,constructor,get,set'.split(','));
const BI = new Set('console,process,Promise,Array,Object,String,Number,Boolean,Map,Set,Error,JSON,Math,Date,RegExp,Symbol,Buffer,setTimeout,setInterval,fetch,AbortController,AbortSignal'.split(','));

function hl(text: string): JSX.Element[] {
  const out: JSX.Element[] = [];
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+\.?\d*\b)|(\b[a-zA-Z_$][\w$]*\b)|(=>|\.\.\.|\?\.|&&|\|\||[!=]==?|[<>]=?|[{}()[\];:,.])|(\s+)/g;
  let m: RegExpExecArray | null, last = 0, k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    const [full, cmt, str, num, id] = m;
    const c = cmt ? '#5c6370' : str ? '#98c379' : num ? '#d19a66'
      : id ? (KW.has(id) ? '#c678dd' : BI.has(id) || /^[A-Z]/.test(id) ? '#e5c07b' : '#abb2bf') : '#56b6c2';
    out.push(<span key={k++} style={{ color: c, ...(cmt ? { fontStyle: 'italic' as const } : {}) }}>{full}</span>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(<span key={k++}>{text.slice(last)}</span>);
  return out;
}

/* ─── Component ─── */

export default function SourceReader({
  code, filename, language = 'typescript', startLine = 1, highlights = [], githubUrl,
}: SourceReaderProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeNote, setActiveNote] = useState<number | null>(null);
  const lines = useMemo(() => code.replace(/\n$/, '').split('\n'), [code]);
  const hlMap = useMemo(() => new Map(highlights.map(h => [h.line, h.note])), [highlights]);
  const toggleNote = useCallback((n: number) => setActiveNote(p => p === n ? null : n), []);

  return (
    <div style={{
      margin: '1.5rem 0', borderRadius: 8, overflow: 'hidden',
      border: '1px solid var(--border, #2a2a3a)', background: 'var(--bg-card, #1e1e2e)',
    }}>
      {/* Header */}
      <div onClick={() => setCollapsed(!collapsed)} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', cursor: 'pointer', userSelect: 'none',
        background: 'rgba(255,255,255,0.02)', borderBottom: collapsed ? 'none' : '1px solid var(--border, #2a2a3a)',
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff5f57' }} />
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#febc2e' }} />
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#28c840' }} />
        </div>
        <span style={{ flex: 1, color: 'var(--text-muted)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>{filename}</span>
        {githubUrl && <a href={githubUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', textDecoration: 'none', opacity: 0.6 }}>GitHub ↗</a>}
        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : '' }}>▾</span>
      </div>

      {/* Code */}
      {!collapsed && (
        <div style={{ overflowX: 'auto' }}>
          <pre style={{
            margin: 0, padding: '0.75rem 0', background: 'transparent',
            fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
            fontSize: '0.8125rem', lineHeight: 1.6, border: 'none',
          }}>
            <code>
              {lines.map((line, i) => {
                const num = startLine + i;
                const isHl = hlMap.has(num);
                const isActive = activeNote === num;
                const note = hlMap.get(num);
                return (
                  <React.Fragment key={i}>
                    <div
                      onClick={isHl ? () => toggleNote(num) : undefined}
                      style={{
                        display: 'flex', padding: '0 14px 0 0',
                        background: isHl ? (isActive ? 'rgba(217,119,87,0.12)' : 'rgba(217,119,87,0.06)') : 'transparent',
                        borderLeft: isHl ? '3px solid var(--accent, #D97757)' : '3px solid transparent',
                        cursor: isHl ? 'pointer' : 'default',
                      }}
                    >
                      <span style={{
                        display: 'inline-block', width: 45, textAlign: 'right', paddingRight: 12, flexShrink: 0,
                        color: isHl ? 'var(--accent, #D97757)' : 'var(--text-muted)', opacity: isHl ? 0.9 : 0.4,
                        fontSize: '0.75rem', userSelect: 'none',
                      }}>{num}</span>
                      <span>{hl(line)}</span>
                    </div>
                    {isActive && note && (
                      <div style={{
                        margin: '2px 14px 4px 60px', padding: '6px 10px', borderRadius: 5,
                        background: 'rgba(217,119,87,0.08)', border: '1px solid rgba(217,119,87,0.18)',
                        color: 'var(--text-secondary, #b0b0c0)', fontSize: '0.8rem',
                        fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: 1.4,
                      }}>
                        <span style={{ color: 'var(--accent)', fontWeight: 600, marginRight: 5 }}>→</span>{note}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
}
