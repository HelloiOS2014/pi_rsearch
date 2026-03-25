import React, { useState, useRef, useEffect, useCallback } from 'react';

interface CollapseDetailProps {
  title: string;
  children: React.ReactNode;
}

export default function CollapseDetail({ title, children }: CollapseDetailProps) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setMaxHeight(contentRef.current.scrollHeight);
    }
  }, [expanded, children]);

  const toggle = useCallback(() => setExpanded(prev => !prev), []);

  return (
    <div style={{
      margin: '1.5rem 0',
      borderRadius: 8,
      border: '1px solid var(--border, #2a2a3a)',
      background: 'var(--bg-card, #1e1e2e)',
      overflow: 'hidden',
    }}>
      {/* Header / toggle */}
      <button
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '10px 14px',
          border: 'none',
          borderBottom: expanded ? '1px solid var(--border, #2a2a3a)' : '1px solid transparent',
          background: 'transparent',
          cursor: 'pointer',
          userSelect: 'none',
          textAlign: 'left',
        }}
      >
        {/* Arrow */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 18,
          flexShrink: 0,
          color: 'var(--accent, #D97757)',
          fontSize: '0.7rem',
          transition: 'transform 0.25s ease',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        }}>
          ▶
        </span>

        {/* Title */}
        <span style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-primary, #e0e0e0)',
        }}>
          {title}
        </span>
      </button>

      {/* Collapsible content */}
      <div
        ref={contentRef}
        style={{
          maxHeight: expanded ? maxHeight : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div style={{
          margin: '0 14px 14px 14px',
          paddingTop: 10,
          paddingLeft: 14,
          borderLeft: '3px solid var(--accent, #D97757)',
        }}>
          <div style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: '0.875rem',
            lineHeight: 1.7,
            color: 'var(--text-secondary, #b0b0c0)',
          }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
