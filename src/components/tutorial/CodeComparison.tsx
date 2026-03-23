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

/* ─── Syntax highlighting ─── */
const KW = new Set('import,export,from,const,let,var,function,return,if,else,for,while,do,switch,case,break,continue,new,this,class,extends,implements,interface,type,enum,async,await,yield,try,catch,finally,throw,typeof,instanceof,in,of,void,delete,default,true,false,null,undefined,as,is,keyof,readonly,static,public,private,protected,abstract,declare'.split(','));
const BI = new Set('console,process,Promise,Array,Object,String,Number,Boolean,Map,Set,Error,JSON,Math,Date,RegExp,Symbol,Buffer,setTimeout,fetch,AbortController'.split(','));
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

/* ─── Panel ─── */
function Panel({ config, accent, tag }: { config: CodePanelConfig; accent: string; tag: string }) {
  const lines = useMemo(() => config.code.replace(/\n$/, '').split('\n'), [config.code]);
  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border, #2a2a3a)', background: 'var(--bg-card, #1e1e2e)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
        background: `linear-gradient(135deg, ${accent}14 0%, ${accent}06 100%)`,
        borderBottom: '1px solid var(--border, #2a2a3a)',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}44` }} />
        <span style={{ fontFamily: "'DM Sans', system-ui", fontSize: '0.8125rem', fontWeight: 600, color: accent }}>{config.label}</span>
        {config.language && <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{config.language}</span>}
        <span style={{ marginLeft: config.language ? 0 : 'auto', fontSize: '0.625rem', fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: `${accent}20`, color: accent, letterSpacing: '0.08em' }}>{tag}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <pre style={{
          margin: 0, padding: '0.75rem 0', background: 'transparent', border: 'none',
          fontFamily: "'JetBrains Mono', 'SF Mono', monospace", fontSize: '0.8125rem', lineHeight: 1.6,
        }}>
          <code style={{ display: 'block' }}>
            {lines.map((line, i) => (
              <div key={i} style={{ display: 'flex', padding: '0 14px 0 0' }}>
                <span style={{ display: 'inline-block', width: 36, textAlign: 'right', paddingRight: 10, flexShrink: 0, color: 'var(--text-muted)', opacity: 0.35, fontSize: '0.75rem', userSelect: 'none' }}>{i + 1}</span>
                <span>{hl(line)}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function CodeComparison({ left, right }: CodeComparisonProps) {
  const [mode, setMode] = useState<'stacked' | 'side'>('stacked');
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const h = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    h(mq); mq.addEventListener('change', h as any);
    return () => mq.removeEventListener('change', h as any);
  }, []);
  const eff = isMobile ? 'stacked' : mode;
  return (
    <div style={{ margin: '1.5rem 0' }}>
      {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6, gap: 3 }}>
          {(['stacked', 'side'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '3px 8px', borderRadius: 3, border: 'none', cursor: 'pointer',
              fontSize: '0.6875rem', fontFamily: "'DM Sans', system-ui",
              background: mode === m ? 'var(--accent, #D97757)' : 'var(--bg-card, #1e1e2e)',
              color: mode === m ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s',
            }}>{m === 'stacked' ? '☰ 上下' : '◫ 左右'}</button>
          ))}
        </div>
      )}
      <div style={{
        display: eff === 'side' ? 'grid' : 'flex',
        gridTemplateColumns: eff === 'side' ? '1fr 1fr' : undefined,
        flexDirection: eff === 'stacked' ? 'column' as const : undefined,
        gap: eff === 'stacked' ? 10 : 8,
      }}>
        <Panel config={left} accent="#608cd2" tag="A" />
        <Panel config={right} accent="#D97757" tag="B" />
      </div>
    </div>
  );
}
