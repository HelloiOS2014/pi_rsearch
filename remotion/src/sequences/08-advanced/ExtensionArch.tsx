import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

// ── Event types radiating from the bus ─────────────────────────────────
const EVENT_TYPES = [
  "tool_call",
  "tool_result",
  "llm_start",
  "llm_end",
  "token",
  "error",
  "retry",
  "session_start",
  "session_end",
  "message_add",
  "tool_register",
  "config_change",
  "memory_save",
  "memory_load",
  "abort",
  "stats_request",
];

// ── Extensions that connect to specific events ─────────────────────────
interface Extension {
  name: string;
  color: string;
  events: string[]; // which events this extension subscribes to
  angle: number;    // angular position around the bus
  radius: number;
}

const EXTENSIONS: Extension[] = [
  { name: "Audit Logger", color: "#4ade80", events: ["tool_call", "tool_result", "error"], angle: -40, radius: 400 },
  { name: "Rate Limiter", color: "#f472b6", events: ["llm_start", "token", "retry"], angle: 30, radius: 380 },
  { name: "Custom Tools", color: "#60a5fa", events: ["tool_register", "tool_call"], angle: 100, radius: 400 },
  { name: "Memory Cache", color: "#fbbf24", events: ["memory_save", "memory_load", "session_start"], angle: 170, radius: 390 },
  { name: "Stats Reporter", color: "#a78bfa", events: ["stats_request", "tool_result", "llm_end"], angle: 240, radius: 400 },
  { name: "Error Handler", color: "#fb923c", events: ["error", "retry", "abort"], angle: 310, radius: 380 },
];

const CENTER_X = 960;
const CENTER_Y = 500;
const EVENT_RADIUS = 200;

export const ExtensionArch: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Phase timings ────────────────────────────────────────────────────
  // 0-60:   Title + bus appears
  // 60-180: Events radiate outward
  // 180-300: Extensions attach
  // 300-410: Event particles flow
  // 410-450: Exit fade

  const exitOpacity = interpolate(frame, [410, 450], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Title ────────────────────────────────────────────────────────────
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Central bus ──────────────────────────────────────────────────────
  const busProgress = spring({
    frame: frame - 20,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const busPulse = frame >= 300 && frame <= 410
    ? interpolate(Math.sin((frame - 300) * 0.06), [-1, 1], [0.3, 0.8])
    : 0;

  // ── Event dots radiate ───────────────────────────────────────────────
  const eventProgress = EVENT_TYPES.map((_, i) => {
    const delay = 60 + i * 7;
    return spring({
      frame: frame - delay,
      fps,
      config: { damping: 14, stiffness: 130 },
    });
  });

  // ── Extension boxes appear ───────────────────────────────────────────
  const extProgress = EXTENSIONS.map((_, i) => {
    const delay = 180 + i * 20;
    return spring({
      frame: frame - delay,
      fps,
      config: { damping: 12, stiffness: 120 },
    });
  });

  // ── Connection lines from extensions to events ───────────────────────
  const connectionProgress = interpolate(frame, [250, 320], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Particle flow animation ──────────────────────────────────────────
  const particleActive = frame >= 300 && frame <= 410;
  const particlePhase = particleActive
    ? interpolate(frame, [300, 410], [0, Math.PI * 4], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  // ── Compute event dot positions ──────────────────────────────────────
  const eventPositions = EVENT_TYPES.map((_, i) => {
    const angle = (i / EVENT_TYPES.length) * Math.PI * 2 - Math.PI / 2;
    return {
      x: CENTER_X + Math.cos(angle) * EVENT_RADIUS,
      y: CENTER_Y + Math.sin(angle) * EVENT_RADIUS,
      angle,
    };
  });

  // ── Compute extension positions ──────────────────────────────────────
  const extPositions = EXTENSIONS.map((ext) => {
    const rad = (ext.angle * Math.PI) / 180;
    return {
      x: CENTER_X + Math.cos(rad) * ext.radius,
      y: CENTER_Y + Math.sin(rad) * ext.radius,
    };
  });

  // ── Find event index by name ─────────────────────────────────────────
  const eventIndex = (name: string) => EVENT_TYPES.indexOf(name);

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
          top: 40,
          width: "100%",
          textAlign: "center",
          fontSize: 44,
          fontWeight: 700,
          color: "#e0e0e0",
          opacity: titleOpacity,
          letterSpacing: 2,
        }}
      >
        Extension Architecture
      </div>
      <div
        style={{
          position: "absolute",
          top: 100,
          width: "100%",
          textAlign: "center",
          fontSize: 20,
          color: "rgba(255,255,255,0.35)",
          opacity: titleOpacity,
          fontFamily: "'SF Mono', monospace",
        }}
      >
        Event Bus + Plugin System
      </div>

      {/* SVG layer */}
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      >
        <defs>
          <filter id="extGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="busGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D97757" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#D97757" stopOpacity="0.05" />
          </radialGradient>
        </defs>

        {/* Central bus circle */}
        <circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={80 * busProgress}
          fill="url(#busGradient)"
          stroke="#D97757"
          strokeWidth={2}
          opacity={busProgress}
        />
        {busPulse > 0.2 && (
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={80 + busPulse * 15}
            fill="none"
            stroke="#D97757"
            strokeWidth={1}
            opacity={busPulse * 0.5}
          />
        )}

        {/* Event dots */}
        {EVENT_TYPES.map((name, i) => {
          const pos = eventPositions[i];
          const p = eventProgress[i];
          const dotX = interpolate(p, [0, 1], [CENTER_X, pos.x]);
          const dotY = interpolate(p, [0, 1], [CENTER_Y, pos.y]);

          return (
            <g key={`evt-${i}`}>
              {/* Line from center to dot */}
              <line
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={dotX}
                y2={dotY}
                stroke="rgba(217,119,87,0.15)"
                strokeWidth={1}
                opacity={p}
              />
              <circle
                cx={dotX}
                cy={dotY}
                r={6}
                fill={busPulse > 0.4 ? "#D97757" : "rgba(217,119,87,0.7)"}
                opacity={p}
                filter={busPulse > 0.4 ? "url(#extGlow)" : undefined}
              />
              {/* Label */}
              {p > 0.8 && (
                <text
                  x={dotX + (pos.x > CENTER_X ? 12 : -12)}
                  y={dotY + 4}
                  fontSize={11}
                  fill="rgba(255,255,255,0.5)"
                  fontFamily="'SF Mono', monospace"
                  textAnchor={pos.x > CENTER_X ? "start" : "end"}
                >
                  {name}
                </text>
              )}
            </g>
          );
        })}

        {/* Connection lines from extensions to their events */}
        {EXTENSIONS.map((ext, ei) => {
          const extPos = extPositions[ei];
          return ext.events.map((evtName, li) => {
            const evtIdx = eventIndex(evtName);
            if (evtIdx < 0) return null;
            const evtPos = eventPositions[evtIdx];

            return (
              <line
                key={`conn-${ei}-${li}`}
                x1={extPos.x}
                y1={extPos.y}
                x2={extPos.x + (evtPos.x - extPos.x) * connectionProgress}
                y2={extPos.y + (evtPos.y - extPos.y) * connectionProgress}
                stroke={`${ext.color}40`}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                opacity={extProgress[ei] * connectionProgress}
              />
            );
          });
        })}

        {/* Flowing particles along connection lines */}
        {particleActive &&
          EXTENSIONS.map((ext, ei) => {
            // One particle per extension, cycling through its events
            const evtIdx = eventIndex(
              ext.events[Math.floor(((particlePhase + ei) / 2) % ext.events.length)]
            );
            if (evtIdx < 0) return null;
            const extPos = extPositions[ei];
            const evtPos = eventPositions[evtIdx];

            const t = ((Math.sin(particlePhase + ei * 1.2) + 1) / 2);
            const px = interpolate(t, [0, 1], [extPos.x, evtPos.x]);
            const py = interpolate(t, [0, 1], [extPos.y, evtPos.y]);

            return (
              <circle
                key={`particle-${ei}`}
                cx={px}
                cy={py}
                r={4}
                fill={ext.color}
                filter="url(#extGlow)"
                opacity={0.8}
              />
            );
          })}
      </svg>

      {/* Central bus label */}
      <div
        style={{
          position: "absolute",
          left: CENTER_X - 60,
          top: CENTER_Y - 18,
          width: 120,
          textAlign: "center",
          fontSize: 20,
          fontWeight: 700,
          color: "#D97757",
          opacity: busProgress,
          fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
        }}
      >
        Event Bus
      </div>

      {/* Extension boxes */}
      {EXTENSIONS.map((ext, ei) => {
        const pos = extPositions[ei];
        const p = extProgress[ei];

        return (
          <div
            key={`ext-${ei}`}
            style={{
              position: "absolute",
              left: pos.x - 75,
              top: pos.y - 22,
              width: 150,
              height: 44,
              borderRadius: 10,
              border: `2px solid ${ext.color}70`,
              backgroundColor: `${ext.color}12`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
              color: ext.color,
              fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
              opacity: p,
              transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`,
              boxShadow: busPulse > 0.3
                ? `0 0 ${8 + busPulse * 12}px ${ext.color}30`
                : "none",
            }}
          >
            {ext.name}
          </div>
        );
      })}

      {/* Bottom description */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          width: "100%",
          textAlign: "center",
          fontSize: 18,
          color: "rgba(255,255,255,0.3)",
          fontFamily: "'SF Mono', monospace",
          opacity: interpolate(frame, [350, 390], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        tool_call event → extension intercepts → modified result flows back
      </div>
    </AbsoluteFill>
  );
};
