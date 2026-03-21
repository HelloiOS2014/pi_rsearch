import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

const NODES = [
  { label: "用户输入", color: "#6e8efb", angle: -90 },   // top
  { label: "LLM 思考", color: "#4ade80", angle: 0 },     // right
  { label: "工具执行", color: "#D97757", angle: 90 },     // bottom
  { label: "观察结果", color: "#a78bfa", angle: 180 },    // left
] as const;

const CENTER_X = 960;
const CENTER_Y = 460;
const RADIUS = 220;

/** Convert degrees to radians */
const deg2rad = (deg: number) => (deg * Math.PI) / 180;

/** Get node position on the circle */
const nodePos = (angleDeg: number) => ({
  x: CENTER_X + RADIUS * Math.cos(deg2rad(angleDeg)),
  y: CENTER_Y + RADIUS * Math.sin(deg2rad(angleDeg)),
});

export const LoopAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Exit fade ---
  const exitOpacity = interpolate(frame, [400, 450], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Phase 1 (0-60): Nodes appear one by one with spring ---
  const nodeProgress = NODES.map((_, i) => {
    const delay = i * 15;
    return spring({
      frame: frame - delay,
      fps,
      config: { damping: 14, stiffness: 160 },
    });
  });

  // --- Phase 2 (60-120): Arrows draw in clockwise ---
  const arrowProgress = NODES.map((_, i) => {
    const delay = 60 + i * 15;
    return interpolate(frame, [delay, delay + 15], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });

  // --- Phase 3 (120-300): Glowing packet travels around the loop 2 times ---
  const packetVisible = frame >= 120 && frame <= 300;
  const packetAngle = packetVisible
    ? interpolate(frame, [120, 300], [-90, -90 + 720], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : -90;
  const packetPos = nodePos(packetAngle);

  // --- Phase 4 (300-360): Loop pulse glow ---
  const pulseActive = frame >= 300 && frame <= 360;
  const pulseIntensity = pulseActive
    ? interpolate(
        Math.sin((frame - 300) * 0.15),
        [-1, 1],
        [0.15, 0.7]
      )
    : 0;

  // --- Phase 5 (360-400): Bottom text fades in ---
  const textOpacity = interpolate(frame, [360, 400], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- SVG arrow path between two adjacent nodes ---
  const renderArrow = (fromIdx: number, toIdx: number, progress: number) => {
    const from = nodePos(NODES[fromIdx].angle);
    const to = nodePos(NODES[toIdx].angle);

    // Offset start/end to sit outside node boxes
    const midAngle = (NODES[fromIdx].angle + NODES[toIdx].angle) / 2;
    // Use a control point pushed outward for a gentle curve
    const controlDist = RADIUS * 0.55;
    const cx = CENTER_X + controlDist * Math.cos(deg2rad(midAngle));
    const cy = CENTER_Y + controlDist * Math.sin(deg2rad(midAngle));

    const pathD = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
    const totalLen = 350; // approximate

    return (
      <g key={`arrow-${fromIdx}-${toIdx}`} opacity={progress}>
        <path
          d={pathD}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={2}
          strokeDasharray={totalLen}
          strokeDashoffset={totalLen * (1 - progress)}
        />
        {/* Arrowhead */}
        <circle
          cx={to.x}
          cy={to.y}
          r={4}
          fill="rgba(255,255,255,0.4)"
          opacity={progress > 0.8 ? 1 : 0}
        />
      </g>
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
      {/* SVG layer for arrows and packet */}
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {/* Arrows between nodes */}
        {NODES.map((_, i) => {
          const next = (i + 1) % NODES.length;
          return renderArrow(i, next, arrowProgress[i]);
        })}

        {/* Orbit ring (subtle) */}
        <circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />

        {/* Pulse glow ring */}
        {pulseActive && (
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={RADIUS + 30}
            fill="none"
            stroke={`rgba(217,119,87,${pulseIntensity})`}
            strokeWidth={3}
            filter="url(#glow)"
          />
        )}

        {/* Traveling packet */}
        {packetVisible && (
          <circle
            cx={packetPos.x}
            cy={packetPos.y}
            r={10}
            fill="#D97757"
            filter="url(#glow)"
          />
        )}

        {/* Glow filter */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Node labels */}
      {NODES.map((node, i) => {
        const pos = nodePos(node.angle);
        const prog = nodeProgress[i];
        return (
          <div
            key={node.label}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              transform: `translate(-50%, -50%) scale(${interpolate(prog, [0, 1], [0.5, 1])})`,
              opacity: prog,
              padding: "14px 28px",
              borderRadius: 12,
              border: `2px solid ${node.color}`,
              backgroundColor: `${node.color}18`,
              color: "#e0e0e0",
              fontSize: 26,
              fontWeight: 600,
              whiteSpace: "nowrap",
              boxShadow: pulseActive
                ? `0 0 ${12 + pulseIntensity * 25}px ${node.color}${Math.round(pulseIntensity * 99).toString().padStart(2, "0")}`
                : `0 0 12px ${node.color}20`,
            }}
          >
            {node.label}
          </div>
        );
      })}

      {/* Bottom text */}
      <div
        style={{
          position: "absolute",
          bottom: 140,
          width: "100%",
          textAlign: "center",
          fontSize: 38,
          fontWeight: 600,
          color: "#e0e0e0",
          opacity: textOpacity * exitOpacity,
          letterSpacing: 2,
        }}
      >
        Agent 的本质就是这个循环
      </div>
    </AbsoluteFill>
  );
};
