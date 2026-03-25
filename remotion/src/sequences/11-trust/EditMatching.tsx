import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

// Colors
const GREEN = "#4ade80";
const YELLOW = "#fbbf24";
const RED = "#f87171";
const BG = "#0a0a1a";
const TEXT = "#e0e0e0";
const DIM = "rgba(255,255,255,0.35)";

const FONT = "'SF Pro Display', Helvetica, Arial, sans-serif";
const MONO = "'SF Mono', 'Fira Code', monospace";

// Sample content — smart quotes (LLM) vs regular quotes (file)
const LLM_LINE = `console.log(\u201chello\u201d);`;
const FILE_LINE = `console.log("hello");`;

// After normalization both become the same
const NORMALIZED = `console.log("hello");`;

export const EditMatching: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Global opacity ──────────────────────────────────────
  const fadeIn = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [200, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const globalOpacity = fadeIn * fadeOut;

  // ── Divider ─────────────────────────────────────────────
  const dividerHeight = interpolate(frame, [5, 25], [0, 500], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Column headers ──────────────────────────────────────
  const headerProgress = spring({
    frame: frame - 8,
    fps,
    config: { damping: 14, stiffness: 180 },
  });

  // ── Code text appearance ────────────────────────────────
  const codeOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Stage 1: Exact match (frame 30-80) ──────────────────
  const stage1Active = frame >= 30 && frame < 90;
  const stage1LabelOpacity = interpolate(frame, [30, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Character-by-character comparison progress
  const charCompareProgress = interpolate(frame, [35, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const totalChars = LLM_LINE.length;
  const charsRevealed = Math.floor(charCompareProgress * totalChars);

  // Mismatch indicator (appears after scan hits the quote)
  const quotePos = LLM_LINE.indexOf("\u201c"); // position of smart quote
  const mismatchDetected = stage1Active && charsRevealed >= quotePos + 1;
  const mismatchOpacity = interpolate(frame, [55, 62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Stage 2: Fuzzy match (frame 90-150) ─────────────────
  const stage2Active = frame >= 90 && frame < 160;
  const stage2LabelOpacity = interpolate(frame, [90, 98], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Normalization animation — morph smart quotes to regular
  const normalizeProgress = interpolate(frame, [100, 125], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Re-compare green match
  const matchSuccess = spring({
    frame: frame - 130,
    fps,
    config: { damping: 12, stiffness: 160 },
  });

  // ── Stage 3: Fallback / error (frame 160-200) ──────────
  const stage3Active = frame >= 160 && frame < 200;
  const stage3Opacity = interpolate(frame, [160, 170], [0, 0.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Error message lines
  const errorLineOpacities = [0, 1, 2].map((i) => {
    const delay = 172 + i * 8;
    return interpolate(frame, [delay, delay + 6], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });

  // ── Current stage label ─────────────────────────────────
  const currentStage = stage3Active
    ? 3
    : stage2Active
      ? 2
      : stage1Active
        ? 1
        : 0;

  // ── Helpers ─────────────────────────────────────────────
  const renderCharComparison = (
    text: string,
    otherText: string,
    side: "left" | "right",
  ) => {
    return text.split("").map((ch, i) => {
      const isScanned = stage1Active && i < charsRevealed;
      const isMismatch = isScanned && ch !== otherText[i];
      const isMatch = isScanned && ch === otherText[i];

      let color = TEXT;
      let bgColor = "transparent";

      if (isScanned) {
        if (isMismatch) {
          color = RED;
          bgColor = "rgba(248,113,113,0.15)";
        } else if (isMatch) {
          color = GREEN;
          bgColor = "rgba(74,222,128,0.08)";
        }
      }

      return (
        <span
          key={`${side}-${i}`}
          style={{
            color,
            backgroundColor: bgColor,
            transition: "color 0.1s, background-color 0.1s",
          }}
        >
          {ch}
        </span>
      );
    });
  };

  const renderNormalized = (original: string, target: string) => {
    return original.split("").map((ch, i) => {
      const targetCh = target[i] || ch;
      const isChanged = ch !== targetCh;
      const displayCh =
        isChanged && normalizeProgress > 0.5 ? targetCh : ch;

      let color = TEXT;
      let bgColor = "transparent";

      if (isChanged && normalizeProgress > 0) {
        color = YELLOW;
        bgColor = `rgba(251,191,36,${0.15 * normalizeProgress})`;
      }

      // After normalization complete, show green
      if (normalizeProgress >= 1) {
        color = GREEN;
        bgColor = "rgba(74,222,128,0.08)";
      }

      return (
        <span
          key={`norm-${i}`}
          style={{
            color,
            backgroundColor: bgColor,
            transform: isChanged
              ? `scaleY(${interpolate(normalizeProgress, [0.3, 0.5, 0.7], [1, 1.3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`
              : undefined,
            display: "inline-block",
          }}
        >
          {displayCh}
        </span>
      );
    });
  };

  const boxStyle: React.CSSProperties = {
    padding: "20px 32px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    fontFamily: MONO,
    fontSize: 30,
    letterSpacing: 1.5,
    lineHeight: 1.6,
    minHeight: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const stageLabels = [
    "",
    "Stage 1 · 精确匹配",
    "Stage 2 · Fuzzy 匹配",
    "Stage 3 · Fallback",
  ];

  const stageColors = ["", GREEN, YELLOW, RED];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        opacity: globalOpacity,
        fontFamily: FONT,
      }}
    >
      {/* Main two-column layout */}
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        {/* ── Left Column: LLM Token space ────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 80,
            gap: 50,
          }}
        >
          {/* Header */}
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: "#6e8efb",
              opacity: headerProgress,
              marginBottom: 50,
            }}
          >
            Token 空间 (LLM)
          </div>

          {/* Code box */}
          <div
            style={{
              ...boxStyle,
              opacity: codeOpacity,
              borderColor: stage1Active
                ? `rgba(248,113,113,${mismatchOpacity * 0.4})`
                : stage2Active
                  ? `rgba(251,191,36,${normalizeProgress * 0.4})`
                  : "rgba(255,255,255,0.1)",
            }}
          >
            {stage2Active
              ? renderNormalized(LLM_LINE, NORMALIZED)
              : stage1Active
                ? renderCharComparison(LLM_LINE, FILE_LINE, "left")
                : LLM_LINE}
          </div>

          {/* Smart quote callout */}
          <div
            style={{
              fontSize: 22,
              color: DIM,
              opacity: codeOpacity * 0.7,
              fontFamily: MONO,
            }}
          >
            contains: {"\u201c"} {"\u201d"} (smart quotes)
          </div>

          {/* Stage 1: mismatch indicator */}
          {stage1Active && mismatchDetected && (
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: RED,
                opacity: mismatchOpacity,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 44 }}>{"\u2717"}</span> 字符不匹配
            </div>
          )}

          {/* Stage 2: match indicator */}
          {stage2Active && normalizeProgress >= 1 && (
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: GREEN,
                opacity: matchSuccess,
                display: "flex",
                alignItems: "center",
                gap: 10,
                transform: `scale(${interpolate(matchSuccess, [0, 1], [0.8, 1])})`,
              }}
            >
              <span style={{ fontSize: 44 }}>{"\u2713"}</span> 匹配成功
            </div>
          )}
        </div>

        {/* ── Center Divider ──────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 2,
            height: dividerHeight,
            background:
              "linear-gradient(180deg, transparent, rgba(255,255,255,0.15), transparent)",
          }}
        />

        {/* ── Right Column: Byte space (file) ─────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 80,
            gap: 50,
          }}
        >
          {/* Header */}
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: "#D97757",
              opacity: headerProgress,
              marginBottom: 50,
            }}
          >
            Byte 空间 (文件)
          </div>

          {/* Code box */}
          <div
            style={{
              ...boxStyle,
              opacity: codeOpacity,
              borderColor: stage1Active
                ? `rgba(248,113,113,${mismatchOpacity * 0.4})`
                : stage2Active
                  ? `rgba(74,222,128,${normalizeProgress * 0.4})`
                  : "rgba(255,255,255,0.1)",
            }}
          >
            {stage1Active
              ? renderCharComparison(FILE_LINE, LLM_LINE, "right")
              : FILE_LINE}
          </div>

          {/* Regular quote callout */}
          <div
            style={{
              fontSize: 22,
              color: DIM,
              opacity: codeOpacity * 0.7,
              fontFamily: MONO,
            }}
          >
            contains: &quot; &quot; (regular quotes)
          </div>

          {/* Stage 1: mismatch indicator */}
          {stage1Active && mismatchDetected && (
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: RED,
                opacity: mismatchOpacity,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 44 }}>{"\u2717"}</span> 字符不匹配
            </div>
          )}

          {/* Stage 2: match indicator */}
          {stage2Active && normalizeProgress >= 1 && (
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: GREEN,
                opacity: matchSuccess,
                display: "flex",
                alignItems: "center",
                gap: 10,
                transform: `scale(${interpolate(matchSuccess, [0, 1], [0.8, 1])})`,
              }}
            >
              <span style={{ fontSize: 44 }}>{"\u2713"}</span> 匹配成功
            </div>
          )}
        </div>
      </div>

      {/* ── Normalization arrow (Stage 2) ───────────────── */}
      {stage2Active && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            opacity: interpolate(frame, [95, 105], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              fontSize: 16,
              color: YELLOW,
              fontFamily: MONO,
              padding: "4px 12px",
              borderRadius: 6,
              backgroundColor: "rgba(251,191,36,0.1)",
              border: "1px solid rgba(251,191,36,0.3)",
            }}
          >
            normalize()
          </div>
          <div style={{ fontSize: 22, color: YELLOW }}>
            {"\u201c"} {"\u2192"} &quot;
          </div>
        </div>
      )}

      {/* ── Stage 3: Fallback error panel ──────────────── */}
      {stage3Active && (
        <div
          style={{
            position: "absolute",
            bottom: 140,
            left: "50%",
            transform: "translateX(-50%)",
            opacity: stage3Opacity,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "32px 48px",
            borderRadius: 12,
            border: `1px solid rgba(248,113,113,0.3)`,
            backgroundColor: "rgba(248,113,113,0.05)",
            minWidth: 680,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: RED,
              marginBottom: 8,
              fontFamily: FONT,
            }}
          >
            Stage 3 · Fallback: 匹配失败
          </div>
          {[
            { label: "cause", value: "编辑上下文在文件中找不到" },
            { label: "rule", value: "检查行号偏移 / 文件版本" },
            { label: "fix", value: "重新读取文件，重试编辑" },
          ].map((item, i) => (
            <div
              key={item.label}
              style={{
                fontSize: 22,
                color: TEXT,
                opacity: errorLineOpacities[i],
                fontFamily: MONO,
                display: "flex",
                gap: 12,
              }}
            >
              <span style={{ color: RED, fontWeight: 600, minWidth: 60 }}>
                {item.label}:
              </span>
              <span>{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Bottom stage label ─────────────────────────── */}
      {currentStage > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 30,
            fontWeight: 600,
            color: stageColors[currentStage],
            opacity:
              currentStage === 1
                ? stage1LabelOpacity
                : currentStage === 2
                  ? stage2LabelOpacity
                  : stage3Opacity,
            fontFamily: FONT,
            padding: "8px 28px",
            borderRadius: 8,
            backgroundColor: `${stageColors[currentStage]}10`,
            border: `1px solid ${stageColors[currentStage]}30`,
          }}
        >
          {stageLabels[currentStage]}
        </div>
      )}
    </AbsoluteFill>
  );
};
