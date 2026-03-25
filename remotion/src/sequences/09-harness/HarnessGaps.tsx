import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

const ACCENT = "#D97757";
const CENTER_X = 960;
const CENTER_Y = 540;
const RADIUS = 400;

interface GapNode {
  label: string;
  chapter: string;
  color: string;
  angleDeg: number;
}

const GAPS: GapNode[] = [
  { label: "控制", chapter: "Ch10", color: "#60a5fa", angleDeg: -90 },
  { label: "边界与信任", chapter: "Ch11", color: "#fbbf24", angleDeg: -18 },
  { label: "记忆", chapter: "Ch12", color: "#a78bfa", angleDeg: 54 },
  { label: "适应", chapter: "Ch13", color: "#f472b6", angleDeg: 126 },
  { label: "交付", chapter: "Ch14", color: "#22d3ee", angleDeg: 198 },
];

const degToRad = (deg: number) => (deg * Math.PI) / 180;

export const HarnessGaps: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Background fade in / fade out ---
  const bgOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [260, 300], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Center Agent Core node ---
  const coreScale = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, stiffness: 180 },
  });
  const coreOpacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Glow pulse on center node (after frame 40)
  const glowPulse =
    frame > 40
      ? interpolate(Math.sin((frame - 40) * 0.08), [-1, 1], [0.3, 0.8])
      : 0.3;

  // --- Ring outline ---
  const ringOpacity = interpolate(frame, [30, 50], [0, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Compute gap node positions ---
  const gapPositions = GAPS.map((gap) => {
    const rad = degToRad(gap.angleDeg);
    return {
      x: CENTER_X + RADIUS * Math.cos(rad),
      y: CENTER_Y + RADIUS * Math.sin(rad),
    };
  });

  // --- Bridge and node animations ---
  const BRIDGE_START = 60;
  const BRIDGE_STAGGER = 35;
  const NODE_DELAY_AFTER_BRIDGE = 15;

  const bridgeProgresses = GAPS.map((_, i) => {
    const startFrame = BRIDGE_START + i * BRIDGE_STAGGER;
    return interpolate(frame, [startFrame, startFrame + 25], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });

  const nodeAnimations = GAPS.map((_, i) => {
    const startFrame = BRIDGE_START + i * BRIDGE_STAGGER + NODE_DELAY_AFTER_BRIDGE;
    const s = spring({
      frame: frame - startFrame,
      fps,
      config: { damping: 12, stiffness: 150 },
    });
    return s;
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a1a",
        opacity: bgOpacity * exitOpacity,
      }}
    >
      {/* SVG layer for ring, bridges */}
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {/* Ring outline around the gaps */}
        <circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={2.5}
          strokeDasharray="8 6"
          opacity={ringOpacity}
        />

        {/* Bridges from center to each gap node */}
        {GAPS.map((gap, i) => {
          const pos = gapPositions[i];
          const progress = bridgeProgresses[i];
          if (progress <= 0) return null;

          // Interpolate the endpoint from center toward the node
          const endX = CENTER_X + (pos.x - CENTER_X) * progress;
          const endY = CENTER_Y + (pos.y - CENTER_Y) * progress;

          return (
            <line
              key={`bridge-${i}`}
              x1={CENTER_X}
              y1={CENTER_Y}
              x2={endX}
              y2={endY}
              stroke={gap.color}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={interpolate(progress, [0, 0.3], [0, 0.7], {
                extrapolateRight: "clamp",
              })}
            />
          );
        })}
      </svg>

      {/* Center Agent Core node */}
      <div
        style={{
          position: "absolute",
          left: CENTER_X,
          top: CENTER_Y,
          transform: `translate(-50%, -50%) scale(${interpolate(
            coreScale,
            [0, 1],
            [0.6, 1]
          )})`,
          opacity: coreOpacity,
          padding: "24px 48px",
          borderRadius: 14,
          border: `2.5px solid ${ACCENT}`,
          backgroundColor: "rgba(217, 119, 87, 0.08)",
          boxShadow: `0 0 ${20 + glowPulse * 35}px rgba(217, 119, 87, ${glowPulse * 0.5})`,
          fontSize: 36,
          fontWeight: 700,
          color: "#e0e0e0",
          fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
          whiteSpace: "nowrap",
          zIndex: 10,
        }}
      >
        Agent Core
      </div>

      {/* Gap nodes */}
      {GAPS.map((gap, i) => {
        const pos = gapPositions[i];
        const anim = nodeAnimations[i];
        const scale = interpolate(anim, [0, 1], [0.4, 1]);
        const opacity = anim;

        return (
          <div
            key={`gap-${i}`}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              transform: `translate(-50%, -50%) scale(${scale})`,
              opacity,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              zIndex: 10,
            }}
          >
            {/* Node box */}
            <div
              style={{
                padding: "16px 32px",
                borderRadius: 10,
                border: `2.5px solid ${gap.color}`,
                backgroundColor: `${gap.color}15`,
                boxShadow: `0 0 18px ${gap.color}30`,
                fontSize: 28,
                fontWeight: 600,
                color: "#e0e0e0",
                fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
                whiteSpace: "nowrap",
                textAlign: "center",
              }}
            >
              {gap.label}
            </div>
            {/* Chapter label */}
            <div
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: gap.color,
                fontFamily: "'SF Mono', monospace",
                opacity: 0.7,
              }}
            >
              {gap.chapter}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
