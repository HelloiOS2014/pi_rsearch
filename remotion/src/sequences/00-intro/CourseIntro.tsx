import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

export const CourseIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title spring in from center (frames 10-40)
  const titleProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const titleScale = interpolate(titleProgress, [0, 1], [0.6, 1]);
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);

  // Subtitle fade in (frames 40-70)
  const subtitleOpacity = interpolate(frame, [40, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleY = interpolate(frame, [40, 70], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Accent glow pulse (continuous after frame 20)
  const glowIntensity = frame > 20
    ? interpolate(
        Math.sin((frame - 20) * 0.08),
        [-1, 1],
        [0.3, 0.7]
      )
    : 0;

  // Exit fade (frames 200-240)
  const exitOpacity = interpolate(frame, [200, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a1a",
        justifyContent: "center",
        alignItems: "center",
        opacity: exitOpacity,
      }}
    >
      {/* Accent glow behind title */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 200,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, rgba(217,119,87,${glowIntensity * 0.4}) 0%, transparent 70%)`,
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      {/* Content container */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
          zIndex: 1,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            color: "#ffffff",
            opacity: titleOpacity,
            transform: `scale(${titleScale})`,
            fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
            textShadow: `0 0 60px rgba(217,119,87,${glowIntensity * 0.5}), 0 4px 20px rgba(0,0,0,0.4)`,
            letterSpacing: 4,
            textAlign: "center",
          }}
        >
          Pi Agent 深度教程
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 400,
            color: "rgba(255,255,255,0.7)",
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
            fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
            letterSpacing: 2,
            textAlign: "center",
          }}
        >
          从 1,900 行代码理解 Agent 的本质
        </div>
      </div>
    </AbsoluteFill>
  );
};
