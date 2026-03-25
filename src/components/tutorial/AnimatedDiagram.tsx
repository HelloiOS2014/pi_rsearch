import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/* ─── Types ─── */

interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  highlight?: boolean;
  annotation?: string;
}
interface TreeData {
  root: TreeNode;
  direction?: 'top-down' | 'left-right';
}

interface FlowNode {
  id: string;
  label: string;
  type?: 'event' | 'handler' | 'endpoint';
}
interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}
interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

interface Layer {
  id: string;
  label: string;
  items: string[];
  color?: string;
}
interface LayersData {
  layers: Layer[];
  direction?: 'top-down' | 'bottom-up';
}

type AnimatedDiagramProps =
  | { type: 'tree'; data: TreeData }
  | { type: 'flow'; data: FlowData }
  | { type: 'layers'; data: LayersData };

/* ─── Color constants ─── */

const FLOW_COLORS: Record<string, string> = {
  event: '#4ade80',
  handler: '#60a5fa',
  endpoint: '#D97757',
};

/* ─── Hook: IntersectionObserver trigger ─── */

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

/* ─── Tree Diagram ─── */

function TreeDiagram({ data }: { data: TreeData }) {
  const [ref, inView] = useInView();
  const isLR = data.direction === 'left-right';

  // Flatten with depth for stagger timing
  const flatNodes = useMemo(() => {
    const result: { node: TreeNode; depth: number }[] = [];
    function walk(n: TreeNode, d: number) {
      result.push({ node: n, depth: d });
      n.children?.forEach(c => walk(c, d + 1));
    }
    walk(data.root, 0);
    return result;
  }, [data.root]);

  const renderNode = useCallback((node: TreeNode, depth: number, idx: number) => {
    const delay = idx * 80;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} style={{
        display: 'flex',
        flexDirection: isLR ? 'row' : 'column',
        alignItems: 'center',
        gap: isLR ? 16 : 10,
      }}>
        {/* Node pill */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(14px)',
          transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`,
        }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              background: node.highlight
                ? 'rgba(217,119,87,0.15)'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${node.highlight ? 'var(--accent, #D97757)' : 'var(--border, #2a2a3a)'}`,
              fontFamily: "'DM Sans', system-ui",
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: node.highlight ? 'var(--accent, #D97757)' : 'var(--text-primary, #e0e0e0)',
              whiteSpace: 'nowrap',
              cursor: 'default',
              transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.background = node.highlight
                ? 'rgba(217,119,87,0.25)' : 'rgba(255,255,255,0.08)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 8px rgba(217,119,87,0.2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.background = node.highlight
                ? 'rgba(217,119,87,0.15)' : 'rgba(255,255,255,0.04)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
          >
            {node.label}
          </div>
          {node.annotation && (
            <span style={{
              fontSize: '0.6875rem',
              color: 'var(--text-secondary, #b0b0c0)',
              fontFamily: "'DM Sans', system-ui",
              fontStyle: 'italic',
            }}>{node.annotation}</span>
          )}
        </div>

        {/* Children */}
        {hasChildren && (
          <div style={{
            display: 'flex',
            flexDirection: isLR ? 'column' : 'row',
            alignItems: 'center',
            gap: isLR ? 8 : 16,
            position: 'relative',
          }}>
            {/* Connector line */}
            <div style={{
              position: 'absolute',
              ...(isLR
                ? { left: -10, top: '50%', width: 10, height: 1, background: 'var(--border, #2a2a3a)' }
                : { top: -8, left: '50%', width: 1, height: 8, background: 'var(--border, #2a2a3a)' }),
              opacity: inView ? 1 : 0,
              transition: `opacity 0.4s ease ${delay + 60}ms`,
            }} />
            {node.children!.map((child) => {
              const childIdx = flatNodes.findIndex(f => f.node.id === child.id);
              return renderNode(child, depth + 1, childIdx);
            })}
          </div>
        )}
      </div>
    );
  }, [inView, isLR, flatNodes]);

  return (
    <div ref={ref} style={{
      display: 'flex',
      flexDirection: isLR ? 'row' : 'column',
      alignItems: 'center',
      gap: isLR ? 20 : 12,
      padding: '16px 8px',
      overflowX: 'auto',
    }}>
      {renderNode(data.root, 0, 0)}
    </div>
  );
}

/* ─── Flow Diagram ─── */

function FlowDiagram({ data }: { data: FlowData }) {
  const [ref, inView] = useInView();
  const [hovered, setHovered] = useState<string | null>(null);

  // Build edge lookup for labels between nodes
  const edgeMap = useMemo(() => {
    const m = new Map<string, string | undefined>();
    data.edges.forEach(e => m.set(`${e.from}->${e.to}`, e.label));
    return m;
  }, [data.edges]);

  // Order nodes by edge traversal (simple: follow edges from first)
  const orderedNodes = useMemo(() => {
    if (data.nodes.length === 0) return [];
    const visited = new Set<string>();
    const result: FlowNode[] = [];
    // Build adjacency
    const adj = new Map<string, string[]>();
    data.edges.forEach(e => {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from)!.push(e.to);
    });
    // BFS from nodes that have no incoming
    const hasIncoming = new Set(data.edges.map(e => e.to));
    const starts = data.nodes.filter(n => !hasIncoming.has(n.id));
    const queue = starts.length > 0 ? [...starts] : [data.nodes[0]];
    for (const s of queue) {
      if (visited.has(s.id)) continue;
      visited.add(s.id);
      result.push(s);
      const nexts = adj.get(s.id) || [];
      for (const nid of nexts) {
        const nn = data.nodes.find(n => n.id === nid);
        if (nn && !visited.has(nn.id)) {
          visited.add(nn.id);
          result.push(nn);
          queue.push(nn);
        }
      }
    }
    // Add any remaining unvisited
    data.nodes.forEach(n => {
      if (!visited.has(n.id)) result.push(n);
    });
    return result;
  }, [data.nodes, data.edges]);

  return (
    <div ref={ref} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      padding: '16px 8px',
      overflowX: 'auto',
    }}>
      {orderedNodes.map((node, i) => {
        const delay = i * 100;
        const color = FLOW_COLORS[node.type || ''] || 'var(--text-primary, #e0e0e0)';
        const isHovered = hovered === node.id;
        const prevNode = i > 0 ? orderedNodes[i - 1] : null;
        const edgeLabel = prevNode ? edgeMap.get(`${prevNode.id}->${node.id}`) : undefined;

        return (
          <React.Fragment key={node.id}>
            {/* Arrow + edge label between nodes */}
            {i > 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                opacity: inView ? 1 : 0,
                transition: `opacity 0.3s ease ${delay - 40}ms`,
                flexShrink: 0,
              }}>
                {edgeLabel && (
                  <span style={{
                    fontSize: '0.625rem',
                    color: 'var(--text-secondary, #b0b0c0)',
                    fontFamily: "'DM Sans', system-ui",
                    whiteSpace: 'nowrap',
                  }}>{edgeLabel}</span>
                )}
                <svg width="32" height="12" viewBox="0 0 32 12" style={{ flexShrink: 0 }}>
                  <line x1="0" y1="6" x2="24" y2="6" stroke="var(--border, #2a2a3a)" strokeWidth="1.5" />
                  <polygon points="24,2 32,6 24,10" fill="var(--border, #2a2a3a)" />
                </svg>
              </div>
            )}

            {/* Node */}
            <div
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                background: isHovered ? `${color}20` : `${color}10`,
                border: `1.5px solid ${isHovered ? color : `${color}44`}`,
                fontFamily: "'DM Sans', system-ui",
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: color,
                whiteSpace: 'nowrap',
                cursor: 'default',
                flexShrink: 0,
                opacity: inView ? 1 : 0,
                transform: inView ? 'scale(1)' : 'scale(0.7)',
                transition: `opacity 0.35s ease ${delay}ms, transform 0.35s ease ${delay}ms, background 0.2s, border-color 0.2s`,
              }}
            >
              {node.type && (
                <span style={{
                  display: 'block',
                  fontSize: '0.5625rem',
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.08em',
                  color: `${color}99`,
                  marginBottom: 2,
                }}>{node.type}</span>
              )}
              {node.label}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Layers Diagram ─── */

function LayersDiagram({ data }: { data: LayersData }) {
  const [ref, inView] = useInView();
  const [hovered, setHovered] = useState<string | null>(null);

  const ordered = useMemo(() => {
    return data.direction === 'bottom-up' ? [...data.layers].reverse() : data.layers;
  }, [data.layers, data.direction]);

  return (
    <div ref={ref} style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '12px 0',
    }}>
      {ordered.map((layer, i) => {
        const delay = i * 90;
        const color = layer.color || 'var(--accent, #D97757)';
        const isHovered = hovered === layer.id;

        return (
          <div
            key={layer.id}
            onMouseEnter={() => setHovered(layer.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 16px',
              borderRadius: 6,
              background: isHovered ? `${color}14` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isHovered ? `${color}66` : 'var(--border, #2a2a3a)'}`,
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(-24px)',
              transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms, background 0.2s, border-color 0.2s`,
              cursor: 'default',
            }}
          >
            {/* Color bar */}
            <div style={{
              width: 4,
              alignSelf: 'stretch',
              borderRadius: 2,
              background: color,
              flexShrink: 0,
              opacity: 0.7,
            }} />

            {/* Label */}
            <span style={{
              fontFamily: "'DM Sans', system-ui",
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: color,
              minWidth: 80,
              flexShrink: 0,
            }}>{layer.label}</span>

            {/* Items */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              flex: 1,
            }}>
              {layer.items.map((item, j) => (
                <span key={j} style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: `${color}10`,
                  border: `1px solid ${color}22`,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.75rem',
                  color: 'var(--text-primary, #e0e0e0)',
                  whiteSpace: 'nowrap',
                }}>{item}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Component ─── */

export default function AnimatedDiagram(props: AnimatedDiagramProps) {
  return (
    <div style={{
      margin: '1.5rem 0',
      padding: 20,
      borderRadius: 8,
      border: '1px solid var(--border, #2a2a3a)',
      background: 'var(--bg-card, #1e1e2e)',
    }}>
      {props.type === 'tree' && <TreeDiagram data={props.data} />}
      {props.type === 'flow' && <FlowDiagram data={props.data} />}
      {props.type === 'layers' && <LayersDiagram data={props.data} />}
    </div>
  );
}
