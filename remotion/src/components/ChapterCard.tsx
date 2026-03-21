import React from "react";
import { z } from "zod";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

export const ChapterCardSchema = z.object({
  chapterNumber: z.number(),
  chapterTitle: z.string(),
  accentColor: z.string().default("#D97757"),
});

type ChapterCardProps = z.infer<typeof ChapterCardSchema>;

export const ChapterCard: React.FC<ChapterCardProps> = ({
  chapterNumber,
  chapterTitle,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background fade in (0-15)
  const bgOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Chapter number watermark spring scale (5-25)
  const watermarkProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const watermarkScale = interpolate(watermarkProgress, [0, 1], [0.3, 1]);

  // Decorative line width (10-30)
  const lineWidth = interpolate(frame, [10, 30], [0, 300], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // "第 X 章" label spring from left (15-40)
  const labelProgress = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14, stiffness: 180 },
  });
  const labelX = interpolate(labelProgress, [0, 1], [-200, 0]);
  const labelOpacity = interpolate(labelProgress, [0, 1], [0, 1]);

  // Chapter title spring from right (25-55)
  const titleProgress = spring({
    frame: frame - 25,
    fps,
    config: { damping: 14, stiffness: 180 },
  });
  const titleX = interpolate(titleProgress, [0, 1], [200, 0]);
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);

  // Exit fade (95-120)
  const exitOpacity = interpolate(frame, [95, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a1a",
        opacity: bgOpacity * exitOpacity,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Chapter number watermark */}
      <div
        style={{
          position: "absolute",
          fontSize: 280,
          fontWeight: 900,
          color: "white",
          opacity: 0.15 * watermarkProgress,
          transform: `scale(${watermarkScale})`,
          fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
          userSelect: "none",
        }}
      >
        {chapterNumber}
      </div>

      {/* Content container */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          zIndex: 1,
        }}
      >
        {/* "第 X 章" label */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: accentColor,
            letterSpacing: 6,
            opacity: labelOpacity,
            transform: `translateX(${labelX}px)`,
            fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
          }}
        >
          第 {chapterNumber} 章
        </div>

        {/* Decorative line */}
        <div
          style={{
            height: 3,
            width: lineWidth,
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            borderRadius: 2,
          }}
        />

        {/* Chapter title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#ffffff",
            opacity: titleOpacity,
            transform: `translateX(${titleX}px)`,
            fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
            textShadow: "0 4px 20px rgba(0,0,0,0.3)",
            textAlign: "center",
            maxWidth: 1400,
            lineHeight: 1.2,
          }}
        >
          {chapterTitle}
        </div>
      </div>
    </AbsoluteFill>
  );
};
