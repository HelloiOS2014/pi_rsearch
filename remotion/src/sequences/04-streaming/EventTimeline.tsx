import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

const ACCENT = "#D97757";

interface EventDef {
  label: string;
  color: string;
  category: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  agent: "#6e8efb",
  turn: "#4ade80",
  message: ACCENT,
  tool: "#a78bfa",
};

const SIMPLE_EVENTS: EventDef[] = [
  { label: "agent_start", color: CATEGORY_COLORS.agent, category: "agent" },
  { label: "turn_start", color: CATEGORY_COLORS.turn, category: "turn" },
  { label: "message_start", color: CATEGORY_COLORS.message, category: "message" },
  { label: "message_update", color: CATEGORY_COLORS.message, category: "message" },
  { label: "message_update", color: CATEGORY_COLORS.message, category: "message" },
  { label: "message_update", color: CATEGORY_COLORS.message, category: "message" },
  { label: "message_end", color: CATEGORY_COLORS.message, category: "message" },
  { label: "turn_end", color: CATEGORY_COLORS.turn, category: "turn" },
  { label: "agent_end", color: CATEGORY_COLORS.agent, category: "agent" },
];

const TOOL_EVENTS: EventDef[] = [
  { label: "agent_start", color: CATEGORY_COLORS.agent, category: "agent" },
  { label: "turn_start", color: CATEGORY_COLORS.turn, category: "turn" },
  { label: "message_start", color: CATEGORY_COLORS.message, category: "message" },
  { label: "message_update", color: CATEGORY_COLORS.message, category: "message" },
  { label: "message_end", color: CATEGORY_COLORS.message, category: "message" },
  { label: "tool_execution_start", color: CATEGORY_COLORS.tool, category: "tool" },
  { label: "tool_update", color: CATEGORY_COLORS.tool, category: "tool" },
  { label: "tool_execution_end", color: CATEGORY_COLORS.tool, category: "tool" },
  { label: "message_start", color: CATEGORY_COLORS.message, category: "message" },
  { label: "message_update", color: CATEGORY_COLORS.message, category: "message" },
  { label: "message_end", color: CATEGORY_COLORS.message, category: "message" },
  { label: "turn_end", color: CATEGORY_COLORS.turn, category: "turn" },
  { label: "agent_end", color: CATEGORY_COLORS.agent, category: "agent" },
];

const TIMELINE_LEFT_X = 160;
const TIMELINE_RIGHT_X = 1060;
const TIMELINE_TOP = 200;
const TIMELINE_BOTTOM = 940;

const LEGEND_ITEMS = [
  { label: "Agent 生命周期", color: CATEGORY_COLORS.agent },
  { label: "Turn 生命周期", color: CATEGORY_COLORS.turn },
  { label: "Message 生命周期", color: CATEGORY_COLORS.message },
  { label: "Tool 生命周期", color: CATEGORY_COLORS.tool },
];

export const EventTimeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Title (0-30) ---
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Exit fade (420-450) ---
  const exitOpacity = interpolate(frame, [420, 450], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Column headers (30-60) ---
  const headerProgress = spring({
    frame: frame - 30,
    fps,
    config: { damping: 14, stiffness: 160 },
  });

  // --- Timeline lines (40-60) ---
  const lineProgress = interpolate(frame, [40, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Simple events appear (60-220) ---
  const simpleEventProgress = SIMPLE_EVENTS.map((_, i) => {
    const delay = 60 + i * 18;
    return spring({
      frame: frame - delay,
      fps,
      config: { damping: 12, stiffness: 140 },
    });
  });

  // --- Tool events appear (140-380) ---
  const toolEventProgress = TOOL_EVENTS.map((_, i) => {
    const delay = 140 + i * 16;
    return spring({
      frame: frame - delay,
      fps,
      config: { damping: 12, stiffness: 140 },
    });
  });

  // --- Legend (30-60) ---
  const legendOpacity = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Helpers ---
  const getNodeY = (index: number, total: number) => {
    const range = TIMELINE_BOTTOM - TIMELINE_TOP;
    return TIMELINE_TOP + (range / (total - 1)) * index;
  };

  const renderEventNode = (
    evt: EventDef,
    index: number,
    total: number,
    centerX: number,
    progress: number,
    side: "left" | "right"
  ) => {
    const y = getNodeY(index, total);
    const labelOffset = side === "left" ? -16 : 16;
    const textAlign = side === "left" ? ("right" as const) : ("left" as const);
    const labelWidth = 220;
    const labelX =
      side === "left" ? centerX - 12 - labelWidth + labelOffset : centerX + 12 + labelOffset;

    // Glow when appearing
    const glowIntensity = progress > 0.5 && progress < 0.95 ? 0.8 : 0.3;

    return (
      <React.Fragment key={`${side}-${index}`}>
        {/* Node dot */}
        <div
          style={{
            position: "absolute",
            left: centerX - 8,
            top: y - 8,
            width: 16,
            height: 16,
            borderRadius: "50%",
            backgroundColor: evt.color,
            opacity: progress,
            transform: `scale(${interpolate(progress, [0, 1], [0, 1])})`,
            boxShadow: `0 0 ${8 + glowIntensity * 12}px ${evt.color}${Math.round(glowIntensity * 80)
              .toString(16)
              .padStart(2, "0")}`,
          }}
        />
        {/* Label */}
        <div
          style={{
            position: "absolute",
            left: labelX,
            top: y - 12,
            width: labelWidth,
            textAlign,
            fontSize: 16,
            fontWeight: 500,
            color: evt.color,
            opacity: progress,
            fontFamily: "'SF Mono', monospace",
            whiteSpace: "nowrap",
          }}
        >
          {evt.label}
        </div>
      </React.Fragment>
    );
  };

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
        AgentEvent 完整生命周期
      </div>

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          top: 110,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 32,
          opacity: legendOpacity,
        }}
      >
        {LEGEND_ITEMS.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: item.color,
              }}
            />
            <span
              style={{
                fontSize: 16,
                color: "#999",
                fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Column headers */}
      <div
        style={{
          position: "absolute",
          left: TIMELINE_LEFT_X - 100,
          top: TIMELINE_TOP - 50,
          width: 200,
          textAlign: "center",
          fontSize: 24,
          fontWeight: 600,
          color: "#e0e0e0",
          opacity: headerProgress,
          transform: `translateY(${interpolate(headerProgress, [0, 1], [20, 0])}px)`,
        }}
      >
        无工具调用
      </div>
      <div
        style={{
          position: "absolute",
          left: TIMELINE_RIGHT_X - 100,
          top: TIMELINE_TOP - 50,
          width: 200,
          textAlign: "center",
          fontSize: 24,
          fontWeight: 600,
          color: "#e0e0e0",
          opacity: headerProgress,
          transform: `translateY(${interpolate(headerProgress, [0, 1], [20, 0])}px)`,
        }}
      >
        有工具调用
      </div>

      {/* SVG timeline lines */}
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      >
        {/* Left timeline line */}
        <line
          x1={TIMELINE_LEFT_X}
          y1={TIMELINE_TOP}
          x2={TIMELINE_LEFT_X}
          y2={TIMELINE_TOP + (TIMELINE_BOTTOM - TIMELINE_TOP) * lineProgress}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
        {/* Right timeline line */}
        <line
          x1={TIMELINE_RIGHT_X}
          y1={TIMELINE_TOP}
          x2={TIMELINE_RIGHT_X}
          y2={TIMELINE_TOP + (TIMELINE_BOTTOM - TIMELINE_TOP) * lineProgress}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
      </svg>

      {/* Simple timeline events (left) */}
      {SIMPLE_EVENTS.map((evt, i) =>
        renderEventNode(evt, i, SIMPLE_EVENTS.length, TIMELINE_LEFT_X, simpleEventProgress[i], "left")
      )}

      {/* Tool timeline events (right) */}
      {TOOL_EVENTS.map((evt, i) =>
        renderEventNode(evt, i, TOOL_EVENTS.length, TIMELINE_RIGHT_X, toolEventProgress[i], "right")
      )}

      {/* Bracket highlight for tool events on the right */}
      {(() => {
        const toolStartIdx = 5;
        const toolEndIdx = 7;
        const bracketY1 = getNodeY(toolStartIdx, TOOL_EVENTS.length);
        const bracketY2 = getNodeY(toolEndIdx, TOOL_EVENTS.length);
        const bracketX = TIMELINE_RIGHT_X + 260;
        const bracketOpacity = interpolate(frame, [280, 310], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <>
            <svg
              width={1920}
              height={1080}
              style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
            >
              <path
                d={`M ${bracketX - 20} ${bracketY1} L ${bracketX} ${bracketY1} L ${bracketX} ${bracketY2} L ${bracketX - 20} ${bracketY2}`}
                fill="none"
                stroke={`rgba(167,139,250,${bracketOpacity * 0.6})`}
                strokeWidth={2}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                left: bracketX + 10,
                top: (bracketY1 + bracketY2) / 2 - 12,
                fontSize: 15,
                color: "#a78bfa",
                opacity: bracketOpacity,
                fontFamily: "'SF Mono', monospace",
                whiteSpace: "nowrap",
              }}
            >
              Tool 阶段
            </div>
          </>
        );
      })()}
    </AbsoluteFill>
  );
};
