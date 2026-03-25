import React, { useState, useMemo } from 'react';

interface Step {
  title: string;
  content: string;
  code?: string;
}
interface StepFlowProps {
  steps: Step[];
}

/* ─── Syntax highlighter ─── */

const KW = new Set('import,export,from,const,let,var,function,return,if,else,for,while,do,switch,case,break,continue,new,this,class,extends,implements,interface,type,enum,async,await,yield,try,catch,finally,throw,typeof,instanceof,in,of,void,delete,default,true,false,null,undefined,as,is,keyof,readonly,static,public,private,protected,abstract,declare,module,namespace,require,super,constructor,get,set'.split(','));
const BI = new Set('console,process,Promise,Array,Object,String,Number,Boolean,Map,Set,Error,JSON,Math,Date,RegExp,Symbol,Buffer,setTimeout,setInterval,fetch,AbortController,AbortSignal'.split(','));

function hl(text: string): JSX.Element[] {
  const out: JSX.Element[] = [];
  const re = /(\/\/.*$|\/\*.*?\*\/|^\s*\*\s.*$|^\s*\*\/$|^\s*\/\*\*?.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+\.?\d*\b)|(\b[a-zA-Z_$][\w$]*\b)|(=>|\.\.\.|\?\.|&&|\|\||[!=]==?|[<>]=?|[{}()[\];:,.])|(\s+)/g;
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

/* ─── Code Block ─── */

function CodeBlock({ code }: { code: string }) {
  const lines = useMemo(() => code.replace(/\n$/, '').split('\n'), [code]);
  return (
    <div style={{
      borderRadius: 6, overflow: 'hidden', marginTop: 12,
      border: '1px solid var(--border, #2a2a3a)', background: 'rgba(0,0,0,0.15)',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <pre style={{
          margin: 0, padding: '0.75rem 0', background: 'transparent', border: 'none',
          fontFamily: "'JetBrains Mono', 'SF Mono', monospace", fontSize: '0.8125rem', lineHeight: 1.6,
        }}>
          <code style={{ display: 'block' }}>
            {lines.map((line, i) => (
              <div key={i} style={{ display: 'flex', padding: '0 14px 0 0' }}>
                <span style={{
                  display: 'inline-block', width: 36, textAlign: 'right', paddingRight: 10, flexShrink: 0,
                  color: 'var(--text-muted)', opacity: 0.35, fontSize: '0.75rem', userSelect: 'none',
                }}>{i + 1}</span>
                <span style={{ whiteSpace: 'pre' }}>{hl(line)}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

/* ─── Component ─── */

export default function StepFlow({ steps }: StepFlowProps) {
  const [current, setCurrent] = useState(0);
  const total = steps.length;
  const step = steps[current];
  const progress = total > 1 ? ((current + 1) / total) * 100 : 100;

  const goPrev = () => setCurrent(i => Math.max(0, i - 1));
  const goNext = () => setCurrent(i => Math.min(total - 1, i + 1));

  return (
    <div style={{
      margin: '1.5rem 0', borderRadius: 8, overflow: 'hidden',
      border: '1px solid var(--border, #2a2a3a)', background: 'var(--bg-card, #1e1e2e)',
    }}>
      {/* Progress bar */}
      <div style={{
        height: 3, background: 'rgba(255,255,255,0.04)',
      }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'var(--accent, #D97757)',
          borderRadius: '0 2px 2px 0',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        borderBottom: '1px solid var(--border, #2a2a3a)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: 'var(--accent, #D97757)', color: '#fff',
          fontSize: '0.6875rem', fontWeight: 700,
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>{current + 1}</span>
        <span style={{
          flex: 1, fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: '0.875rem', fontWeight: 600,
          color: 'var(--text-primary, #e0e0e0)',
        }}>{step.title}</span>
        <span style={{
          fontSize: '0.6875rem', color: 'var(--text-muted)',
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>{current + 1} / {total}</span>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 16px 12px' }}>
        <p style={{
          margin: 0, fontSize: '0.875rem', lineHeight: 1.65,
          color: 'var(--text-secondary, #b0b0c0)',
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>{step.content}</p>

        {step.code && <CodeBlock code={step.code} />}
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderTop: '1px solid var(--border, #2a2a3a)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 5 }}>
          {steps.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} style={{
              width: 7, height: 7, borderRadius: '50%', padding: 0,
              border: 'none', cursor: 'pointer',
              background: i === current ? 'var(--accent, #D97757)' : 'rgba(255,255,255,0.12)',
              boxShadow: i === current ? '0 0 6px rgba(217,119,87,0.4)' : 'none',
              transition: 'all 0.2s',
            }} aria-label={`Go to step ${i + 1}`} />
          ))}
        </div>

        {/* Prev / Next buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={goPrev} disabled={current === 0} style={{
            padding: '4px 12px', borderRadius: 4, border: 'none', cursor: current === 0 ? 'default' : 'pointer',
            fontSize: '0.75rem', fontWeight: 500,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            background: current === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
            color: current === 0 ? 'var(--text-muted)' : 'var(--text-secondary, #b0b0c0)',
            opacity: current === 0 ? 0.5 : 1,
            transition: 'all 0.15s',
          }}>← Previous</button>
          <button onClick={goNext} disabled={current === total - 1} style={{
            padding: '4px 12px', borderRadius: 4, border: 'none', cursor: current === total - 1 ? 'default' : 'pointer',
            fontSize: '0.75rem', fontWeight: 500,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            background: current === total - 1 ? 'rgba(255,255,255,0.04)' : 'var(--accent, #D97757)',
            color: current === total - 1 ? 'var(--text-muted)' : '#fff',
            opacity: current === total - 1 ? 0.5 : 1,
            transition: 'all 0.15s',
          }}>Next →</button>
        </div>
      </div>
    </div>
  );
}
