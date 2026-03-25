import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

const ACCENT = "#D97757";
const BG = "#0a0a1a";

interface Endpoint {
  label: string;
  color: string;
  x: number;
  y: number;
}

const ENDPOINTS: Endpoint[] = [
  { label: "TUI", color: "#4ade80", x: 210, y: 150 },       // top-left
  { label: "Print", color: "#60a5fa", x: 1710, y: 150 },     // top-right
  { label: "RPC", color: "#fbbf24", x: 210, y: 930 },        // bottom-left
  { label: "SDK", color: "#a78bfa", x: 1710, y: 930 },       // bottom-right
];

const CENTER_X = 960;
const CENTER_Y = 540;

const PARTICLE_PERIOD = 40; // frames for one particle traversal
const PARTICLES_PER_PIPE = 3;

export const DeliveryFanout: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Phase 1: Center node appears (frame 0-30) ---
  const centerScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 160 },
  });

  // Pulsing glow on center node (continuous after appearance)
  const glowIntensity = interpolate(
    Math.sin(frame * 0.08),
    [-1, 1],
    [0.3, 0.9],
  );

  // --- Phase 2: Pipes grow outward (frame 30-80) ---
  const pipeProgress = (index: number) => {
    const stagger = index * 5;
    return interpolate(frame, [30 + stagger, 80 + stagger], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  // --- Phase 3: Endpoint nodes appear (frame 80-120) ---
  const endpointScale = (index: number) =>
    spring({
      frame: frame - (85 + index * 8),
      fps,
      config: { damping: 12, stiffness: 150 },
    });

  // --- Phase 4: Particle flow (frame 120+) ---
  const particlesActive = frame >= 120;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
      }}
    >
      {/* SVG layer for pipes and particles */}
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {ENDPOINTS.map((ep, i) => {
          const progress = pipeProgress(i);
          if (progress <= 0) return null;

          const dx = ep.x - CENTER_X;
          const dy = ep.y - CENTER_Y;
          const endX = CENTER_X + dx * progress;
          const endY = CENTER_Y + dy * progress;

          return (
            <line
              key={`pipe-${i}`}
              x1={CENTER_X}
              y1={CENTER_Y}
              x2={endX}
              y2={endY}
              stroke={ep.color}
              strokeWidth={3.5}
              strokeOpacity={0.6}
            />
          );
        })}

        {/* Particles */}
        {particlesActive &&
          ENDPOINTS.map((ep, i) => {
            const dx = ep.x - CENTER_X;
            const dy = ep.y - CENTER_Y;

            return Array.from({ length: PARTICLES_PER_PIPE }).map((_, pi) => {
              const offset = pi * (PARTICLE_PERIOD / PARTICLES_PER_PIPE);
              const stagger = i * 7;
              const t =
                ((frame - 120 + offset + stagger) % PARTICLE_PERIOD) /
                PARTICLE_PERIOD;

              const px = CENTER_X + dx * t;
              const py = CENTER_Y + dy * t;

              // Fade in at start, fade out at end
              const alpha = interpolate(t, [0, 0.1, 0.85, 1], [0, 1, 1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });

              const radius = interpolate(t, [0, 0.5, 1], [6, 10, 6], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });

              return (
                <circle
                  key={`particle-${i}-${pi}`}
                  cx={px}
                  cy={py}
                  r={radius}
                  fill={ep.color}
                  opacity={alpha * 0.9}
                >
                  {/* Glow effect */}
                </circle>
              );
            });
          })}

        {/* Particle glow layer */}
        {particlesActive &&
          ENDPOINTS.map((ep, i) => {
            const dx = ep.x - CENTER_X;
            const dy = ep.y - CENTER_Y;

            return Array.from({ length: PARTICLES_PER_PIPE }).map((_, pi) => {
              const offset = pi * (PARTICLE_PERIOD / PARTICLES_PER_PIPE);
              const stagger = i * 7;
              const t =
                ((frame - 120 + offset + stagger) % PARTICLE_PERIOD) /
                PARTICLE_PERIOD;

              const px = CENTER_X + dx * t;
              const py = CENTER_Y + dy * t;

              const alpha = interpolate(t, [0, 0.1, 0.85, 1], [0, 1, 1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });

              return (
                <circle
                  key={`glow-${i}-${pi}`}
                  cx={px}
                  cy={py}
                  r={18}
                  fill={ep.color}
                  opacity={alpha * 0.28}
                />
              );
            });
          })}
      </svg>

      {/* Center node: AgentSession */}
      <div
        style={{
          position: "absolute",
          left: CENTER_X,
          top: CENTER_Y,
          transform: `translate(-50%, -50%) scale(${centerScale})`,
          padding: "22px 44px",
          borderRadius: 16,
          border: `2px solid ${ACCENT}`,
          backgroundColor: `rgba(217, 119, 87, 0.12)`,
          boxShadow: `0 0 ${20 + glowIntensity * 40}px rgba(217, 119, 87, ${glowIntensity * 0.5})`,
          color: "#f0e6e0",
          fontSize: 36,
          fontWeight: 700,
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          whiteSpace: "nowrap",
        }}
      >
        AgentSession
      </div>

      {/* Endpoint nodes */}
      {ENDPOINTS.map((ep, i) => {
        const scale = endpointScale(i);
        if (scale <= 0.01) return null;

        return (
          <div
            key={`endpoint-${i}`}
            style={{
              position: "absolute",
              left: ep.x,
              top: ep.y,
              transform: `translate(-50%, -50%) scale(${scale})`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            {/* Icon area */}
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: 16,
                border: `2px solid ${ep.color}`,
                backgroundColor: `${ep.color}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                color: ep.color,
                fontFamily: "'SF Mono', monospace",
                boxShadow: `0 0 20px ${ep.color}30`,
              }}
            >
              {ep.label === "TUI" && ">_"}
              {ep.label === "Print" && "{}"}
              {ep.label === "RPC" && "\u21C4"}
              {ep.label === "SDK" && "</>"}
            </div>
            {/* Label */}
            <div
              style={{
                fontSize: 36,
                fontWeight: 600,
                color: ep.color,
                fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
                letterSpacing: 1,
              }}
            >
              {ep.label}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
