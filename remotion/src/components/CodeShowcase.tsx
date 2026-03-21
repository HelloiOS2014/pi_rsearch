import React from "react";
import { z } from "zod";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export const CodeShowcaseSchema = z.object({
  code: z.string(),
  language: z.string().default("typescript"),
  highlightLines: z.array(z.number()).default([]),
  title: z.string().optional(),
  accentColor: z.string().default("#D97757"),
});

type CodeShowcaseProps = z.infer<typeof CodeShowcaseSchema>;

export const CodeShowcase: React.FC<CodeShowcaseProps> = ({
  code,
  language,
  highlightLines,
  title,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lines = code.split("\n");
  const LINE_INTERVAL = Math.max(4, Math.min(6, Math.floor(100 / lines.length)));

  // Editor background fade in (0-20)
  const editorOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Title spring (0-20)
  const titleProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 14, stiffness: 180 },
  });
  const titleY = interpolate(titleProgress, [0, 1], [-30, 0]);
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);

  // Highlight glow (80-140)
  const highlightOpacity = interpolate(frame, [80, 110, 140], [0, 1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Exit fade (155-180)
  const exitOpacity = interpolate(frame, [155, 180], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Line props callback for per-line animation
  const lineProps = (lineNumber: number): React.HTMLProps<HTMLElement> => {
    const lineIndex = lineNumber - 1;
    const lineDelay = 20 + lineIndex * LINE_INTERVAL;

    const lineOpacity = interpolate(frame, [lineDelay, lineDelay + 8], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const lineTranslateX = interpolate(
      frame,
      [lineDelay, lineDelay + 8],
      [20, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    const isHighlighted = highlightLines.includes(lineNumber);

    const style: React.CSSProperties = {
      opacity: lineOpacity,
      transform: `translateX(${lineTranslateX}px)`,
      display: "block",
      ...(isHighlighted
        ? {
            backgroundColor: `${accentColor}25`,
            borderLeft: `3px solid ${accentColor}`,
            paddingLeft: 12,
            boxShadow:
              highlightOpacity > 0
                ? `inset 0 0 20px ${accentColor}${Math.round(highlightOpacity * 15).toString(16).padStart(2, "0")}`
                : "none",
          }
        : {
            paddingLeft: 15,
          }),
    };

    return { style };
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1e1e2e",
        opacity: editorOpacity * exitOpacity,
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
      }}
    >
      {/* Editor window */}
      <div
        style={{
          width: "100%",
          maxWidth: 1600,
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: "#1e1e2e",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Title bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 20px",
            backgroundColor: "rgba(255,255,255,0.04)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            gap: 12,
          }}
        >
          {/* Window dots */}
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#ff5f57",
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#febc2e",
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#28c840",
              }}
            />
          </div>

          {/* File title */}
          {title && (
            <div
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.5)",
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                opacity: titleOpacity,
                transform: `translateY(${titleY}px)`,
                marginLeft: 8,
              }}
            >
              {title}
            </div>
          )}
        </div>

        {/* Code area */}
        <div style={{ padding: "24px 0" }}>
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            showLineNumbers
            wrapLines
            lineProps={lineProps}
            customStyle={{
              margin: 0,
              padding: "0 24px",
              backgroundColor: "transparent",
              fontSize: 22,
              lineHeight: 1.6,
            }}
            lineNumberStyle={{
              minWidth: 40,
              paddingRight: 16,
              color: "rgba(255,255,255,0.2)",
              fontSize: 18,
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    </AbsoluteFill>
  );
};
