import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

const ACCENT = "#D97757";

interface Component {
  label: string;
  sublabel: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const COMPONENTS: Component[] = [
  {
    label: "User Input",
    sublabel: "CLI / API",
    color: "#6e8efb",
    x: 100,
    y: 420,
    width: 180,
    height: 100,
  },
  {
    label: "System Prompt",
    sublabel: "prompt.ts",
    color: "#4ade80",
    x: 380,
    y: 420,
    width: 200,
    height: 100,
  },
  {
    label: "LLM",
    sublabel: "agent.ts",
    color: ACCENT,
    x: 680,
    y: 420,
    width: 180,
    height: 100,
  },
  {
    label: "Tool Router",
    sublabel: "tools/*",
    color: "#a78bfa",
    x: 960,
    y: 420,
    width: 200,
    height: 100,
  },
  {
    label: "Event System",
    sublabel: "events.ts",
    color: "#f472b6",
    x: 1260,
    y: 420,
    width: 200,
    height: 100,
  },
  {
    label: "UI / Output",
    sublabel: "render.ts",
    color: "#38bdf8",
    x: 1560,
    y: 420,
    width: 200,
    height: 100,
  },
];

const SESSION: Component = {
  label: "Session Storage",
  sublabel: "session.ts",
  color: "#fbbf24",
  x: 680,
  y: 700,
  width: 260,
  height: 90,
};

const TOOLS = [
  { label: "read_file", color: "#c084fc" },
  { label: "write_file", color: "#c084fc" },
  { label: "run_cmd", color: "#c084fc" },
  { label: "search", color: "#c084fc" },
];

const TOOL_ROUTER_IDX = 3;
const TOOL_BASE_X = 960;
const TOOL_Y_START = 180;
const TOOL_GAP = 60;

export const FullArchitecture: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Title (0-40) ---
  const titleOpacity = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Exit fade (560-600) ---
  const exitOpacity = interpolate(frame, [560, 600], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Components appear left to right (40-280) ---
  const componentProgress = COMPONENTS.map((_, i) => {
    const delay = 40 + i * 40;
    return spring({
      frame: frame - delay,
      fps,
      config: { damping: 14, stiffness: 140 },
    });
  });

  // --- Tools fan out from Tool Router (280-380) ---
  const toolProgress = TOOLS.map((_, i) => {
    const delay = 280 + i * 20;
    return spring({
      frame: frame - delay,
      fps,
      config: { damping: 12, stiffness: 150 },
    });
  });

  // --- Session storage (300-340) ---
  const sessionProgress = spring({
    frame: frame - 300,
    fps,
    config: { damping: 14, stiffness: 140 },
  });

  // --- Arrows between main components (320-400) ---
  const arrowProgress = interpolate(frame, [320, 400], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Session arrows (380-420) ---
  const sessionArrowProgress = interpolate(frame, [380, 420], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Tool arrows (360-400) ---
  const toolArrowProgress = interpolate(frame, [360, 400], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Final pulse glow (450-560) ---
  const pulseActive = frame >= 450 && frame <= 560;
  const pulseIntensity = pulseActive
    ? interpolate(Math.sin((frame - 450) * 0.06), [-1, 1], [0.15, 0.6])
    : 0;

  // --- Data flow particles (420-540) ---
  const particleActive = frame >= 420 && frame <= 540;
  const particleT = particleActive
    ? interpolate(frame, [420, 540], [0, 3], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  // --- Render a component box ---
  const renderComponent = (comp: Component, progress: number, glow: number) => (
    <div
      key={comp.label}
      style={{
        position: "absolute",
        left: comp.x - comp.width / 2,
        top: comp.y - comp.height / 2,
        width: comp.width,
        height: comp.height,
        borderRadius: 14,
        border: `2px solid ${comp.color}${glow > 0.3 ? "aa" : "50"}`,
        backgroundColor: `${comp.color}${glow > 0.3 ? "20" : "0d"}`,
        opacity: progress,
        transform: `scale(${interpolate(progress, [0, 1], [0.8, 1])}) translateX(${interpolate(
          progress,
          [0, 1],
          [-30, 0]
        )}px)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow:
          glow > 0.2
            ? `0 0 ${10 + glow * 25}px ${comp.color}${Math.round(glow * 50)
                .toString(16)
                .padStart(2, "0")}`
            : "none",
      }}
    >
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#e0e0e0",
          fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
          textAlign: "center",
        }}
      >
        {comp.label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 400,
          color: `${comp.color}cc`,
          fontFamily: "'SF Mono', monospace",
          marginTop: 4,
        }}
      >
        {comp.sublabel}
      </div>
    </div>
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a1a",
        opacity: exitOpacity,
        fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
      }}
    >
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 50,
          width: "100%",
          textAlign: "center",
          fontSize: 44,
          fontWeight: 700,
          color: "#e0e0e0",
          opacity: titleOpacity,
          letterSpacing: 3,
        }}
      >
        Coding Agent 完整架构
      </div>

      {/* SVG layer for arrows */}
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      >
        <defs>
          <filter id="archGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              fill="rgba(255,255,255,0.4)"
            />
          </marker>
          <marker
            id="arrowheadUp"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              fill="rgba(251,191,36,0.5)"
            />
          </marker>
        </defs>

        {/* Horizontal arrows between main components */}
        {COMPONENTS.slice(0, -1).map((comp, i) => {
          const next = COMPONENTS[i + 1];
          const x1 = comp.x + comp.width / 2;
          const x2 = next.x - next.width / 2;
          const y = comp.y;
          const len = x2 - x1;

          return (
            <line
              key={`arrow-${i}`}
              x1={x1}
              y1={y}
              x2={x1 + len * arrowProgress}
              y2={y}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={2}
              markerEnd={arrowProgress > 0.9 ? "url(#arrowhead)" : undefined}
            />
          );
        })}

        {/* Arrows from Tool Router up to each tool */}
        {TOOLS.map((_, i) => {
          const toolX = TOOL_BASE_X + (i - 1.5) * (140);
          const routerTop = COMPONENTS[TOOL_ROUTER_IDX].y - COMPONENTS[TOOL_ROUTER_IDX].height / 2;
          const toolBottom = TOOL_Y_START + i * TOOL_GAP + 30;

          return (
            <line
              key={`tool-arrow-${i}`}
              x1={COMPONENTS[TOOL_ROUTER_IDX].x}
              y1={routerTop}
              x2={COMPONENTS[TOOL_ROUTER_IDX].x + (toolX - COMPONENTS[TOOL_ROUTER_IDX].x) * toolArrowProgress}
              y2={routerTop - (routerTop - toolBottom) * toolArrowProgress}
              stroke={`rgba(192,132,252,${toolArrowProgress * 0.5})`}
              strokeWidth={2}
              strokeDasharray="6 4"
            />
          );
        })}

        {/* Session storage arrows (from LLM and Event System down to Session) */}
        {[2, 4].map((compIdx) => {
          const comp = COMPONENTS[compIdx];
          const compBottom = comp.y + comp.height / 2;
          const sessionTop = SESSION.y - SESSION.height / 2;

          return (
            <line
              key={`session-${compIdx}`}
              x1={comp.x}
              y1={compBottom}
              x2={comp.x + (SESSION.x - comp.x) * sessionArrowProgress}
              y2={compBottom + (sessionTop - compBottom) * sessionArrowProgress}
              stroke={`rgba(251,191,36,${sessionArrowProgress * 0.4})`}
              strokeWidth={2}
              strokeDasharray="6 4"
            />
          );
        })}

        {/* Data flow particle along the main pipeline */}
        {particleActive && (() => {
          // Particle travels from component 0 to component 5
          const totalPath = COMPONENTS.length - 1;
          const segment = Math.min(Math.floor(particleT), totalPath - 1);
          const segFrac = particleT - segment;
          if (segment >= totalPath) return null;
          const fromComp = COMPONENTS[segment];
          const toComp = COMPONENTS[segment + 1];
          const px = interpolate(segFrac, [0, 1], [fromComp.x, toComp.x]);
          const py = fromComp.y;

          return (
            <circle
              cx={px}
              cy={py}
              r={8}
              fill={ACCENT}
              filter="url(#archGlow)"
              opacity={0.9}
            />
          );
        })()}
      </svg>

      {/* Main components */}
      {COMPONENTS.map((comp, i) =>
        renderComponent(comp, componentProgress[i], pulseIntensity)
      )}

      {/* Tool boxes (fanning upward from Tool Router) */}
      {TOOLS.map((tool, i) => {
        const toolX = TOOL_BASE_X + (i - 1.5) * 140;
        const toolY = TOOL_Y_START + i * TOOL_GAP;

        return (
          <div
            key={tool.label}
            style={{
              position: "absolute",
              left: toolX - 70,
              top: toolY - 15,
              width: 140,
              height: 30,
              borderRadius: 8,
              border: `1px solid ${tool.color}50`,
              backgroundColor: `${tool.color}12`,
              opacity: toolProgress[i],
              transform: `scale(${interpolate(toolProgress[i], [0, 1], [0.7, 1])})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 500,
              color: tool.color,
              fontFamily: "'SF Mono', monospace",
              boxShadow:
                pulseActive
                  ? `0 0 ${8 + pulseIntensity * 15}px ${tool.color}${Math.round(
                      pulseIntensity * 40
                    )
                      .toString(16)
                      .padStart(2, "0")}`
                  : "none",
            }}
          >
            {tool.label}
          </div>
        );
      })}

      {/* Session storage */}
      {renderComponent(SESSION, sessionProgress, pulseIntensity)}

      {/* Bottom label */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          width: "100%",
          textAlign: "center",
          fontSize: 24,
          fontWeight: 600,
          color: "#e0e0e0",
          opacity: interpolate(frame, [480, 520], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          letterSpacing: 2,
        }}
      >
        从零搭建一个完整的 Coding Agent
      </div>

      {/* Architecture flow label */}
      <div
        style={{
          position: "absolute",
          left: 100,
          bottom: 540,
          fontSize: 14,
          color: "rgba(255,255,255,0.25)",
          fontFamily: "'SF Mono', monospace",
          opacity: arrowProgress,
        }}
      >
        Data Flow &rarr;
      </div>
    </AbsoluteFill>
  );
};
