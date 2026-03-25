import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

/* ------------------------------------------------------------------ */
/*  Pyramid layer data                                                 */
/* ------------------------------------------------------------------ */
interface Layer {
  label: string;
  sublabel: string;
  color: string;
  tag?: string;
}

const LAYERS: Layer[] = [
  {
    label: "L1 工作记忆",
    sublabel: "Context Window",
    color: "#f87171",
    tag: "快但贵",
  },
  {
    label: "L2 压缩记忆",
    sublabel: "Compaction",
    color: "#fbbf24",
  },
  {
    label: "L3 持久会话",
    sublabel: "Session Tree",
    color: "#a78bfa",
  },
  {
    label: "L4 外部记忆",
    sublabel: "CLAUDE.md / MCP",
    color: "#4ade80",
    tag: "无限但需 tool call",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export const MemoryHierarchy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* ---- Global transitions ---- */
  const bgOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [250, 300], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* ---- Pyramid layer springs (frames 30-120) ---- */
  const layerProgress = LAYERS.map((_, i) => {
    const delay = 30 + i * 22;
    return spring({
      frame: frame - delay,
      fps,
      config: { damping: 13, stiffness: 160 },
    });
  });

  /* ---- Right side labels ---- */
  const rightTitleOpacity = interpolate(frame, [120, 140], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* ---- Keep bar (grows 120-250, turns red at ~95%) ---- */
  const keepRaw = interpolate(frame, [140, 240], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const keepWidth = keepRaw * 95; // percent of container width
  const keepHitLimit = keepWidth > 85;

  /* ---- Fetch bar (stays bounded ~60%, with fetch pulses) ---- */
  const fetchBase = interpolate(frame, [140, 200], [0, 60], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Small "fetch" pulses: a brief bump every ~30 frames after frame 180
  const pulsePhase = frame > 180 ? Math.sin((frame - 180) * 0.25) : 0;
  const fetchPulse = pulsePhase > 0.7 ? (pulsePhase - 0.7) * 20 : 0;
  const fetchWidth = Math.min(fetchBase + fetchPulse, 65);

  /* ---- Shared styles ---- */
  const font: React.CSSProperties = {
    fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
  };

  /* ---- Trapezoid builder ---- */
  const renderTrapezoid = (layer: Layer, index: number) => {
    const progress = layerProgress[index];
    const topWidthPct = 30 + index * 16; // 30%, 46%, 62%, 78%
    const bottomWidthPct = topWidthPct + 10;
    const height = 150;

    // Build SVG trapezoid
    const svgW = 860;
    const svgH = height;
    const topInset = ((100 - topWidthPct) / 200) * svgW;
    const botInset = ((100 - bottomWidthPct) / 200) * svgW;

    return (
      <div
        key={index}
        style={{
          opacity: progress,
          transform: `scale(${interpolate(progress, [0, 1], [0.7, 1])}) translateY(${interpolate(progress, [0, 1], [-20, 0])}px)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          marginBottom: 24,
        }}
      >
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ overflow: "visible" }}
        >
          <polygon
            points={`${topInset},0 ${svgW - topInset},0 ${svgW - botInset},${svgH} ${botInset},${svgH}`}
            fill={`${layer.color}25`}
            stroke={layer.color}
            strokeWidth={2}
          />
          {/* Main label */}
          <text
            x={svgW / 2}
            y={svgH / 2 - 12}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#e0e0e0"
            fontSize={28}
            fontWeight={700}
            fontFamily="'SF Pro Display', Helvetica, Arial, sans-serif"
          >
            {layer.label}
          </text>
          {/* Sublabel */}
          <text
            x={svgW / 2}
            y={svgH / 2 + 22}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={layer.color}
            fontSize={28}
            fontWeight={400}
            fontFamily="'SF Mono', Consolas, monospace"
            opacity={0.8}
          >
            {layer.sublabel}
          </text>
        </svg>

        {/* Tag on the right */}
        {layer.tag && (
          <div
            style={{
              position: "absolute",
              right: -10,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 28,
              color: layer.color,
              ...font,
              fontWeight: 500,
              whiteSpace: "nowrap",
              opacity: progress,
              background: `${layer.color}15`,
              border: `1px solid ${layer.color}40`,
              borderRadius: 8,
              padding: "8px 18px",
            }}
          >
            {layer.tag}
          </div>
        )}
      </div>
    );
  };

  /* ---- Bar chart builder ---- */
  const renderBar = (
    label: string,
    widthPct: number,
    color: string,
    limitLine: boolean,
    opacity: number,
  ) => {
    const barContainerWidth = 680;
    return (
      <div style={{ opacity, marginBottom: 20 }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: "#e0e0e0",
            marginBottom: 14,
            ...font,
          }}
        >
          {label}
        </div>
        <div
          style={{
            position: "relative",
            width: barContainerWidth,
            height: 58,
            borderRadius: 6,
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            overflow: "visible",
          }}
        >
          {/* Bar fill */}
          <div
            style={{
              width: `${widthPct}%`,
              height: "100%",
              borderRadius: 5,
              background: color,
              transition: "width 0.05s linear",
            }}
          />

          {/* Limit line at 95% */}
          {limitLine && (
            <div
              style={{
                position: "absolute",
                left: "95%",
                top: -4,
                bottom: -4,
                width: 2,
                backgroundColor: "#f87171",
                opacity: 0.7,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -34,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 28,
                  color: "#f87171",
                  whiteSpace: "nowrap",
                  ...font,
                }}
              >
                limit
              </div>
            </div>
          )}

          {/* Width percentage label */}
          <div
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 28,
              color: "rgba(255,255,255,0.5)",
              ...font,
            }}
          >
            {Math.round(widthPct)}%
          </div>
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a1a",
        opacity: bgOpacity * exitOpacity,
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        {/* ============= Left half: Pyramid ============= */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 70,
          }}
        >
          {/* Section title */}
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "rgba(255,255,255,0.85)",
              marginBottom: 36,
              ...font,
              opacity: layerProgress[0],
            }}
          >
            Memory Hierarchy
          </div>

          {LAYERS.map((layer, i) => renderTrapezoid(layer, i))}
        </div>

        {/* ============= Center divider ============= */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 2,
            height: interpolate(frame, [30, 60], [0, 500], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            background:
              "linear-gradient(180deg, transparent, rgba(255,255,255,0.15), transparent)",
          }}
        />

        {/* ============= Right half: Keep vs Fetch ============= */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 60px 60px 40px",
            gap: 48,
          }}
        >
          {/* --- Keep Strategy --- */}
          <div style={{ opacity: rightTitleOpacity }}>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#e0e0e0",
                marginBottom: 28,
                ...font,
              }}
            >
              Keep 策略
            </div>
            {renderBar(
              "Context 占用",
              keepWidth,
              keepHitLimit
                ? "linear-gradient(90deg, #fbbf24, #f87171)"
                : "linear-gradient(90deg, #4ade80, #fbbf24)",
              true,
              1,
            )}
            {keepHitLimit && (
              <div
                style={{
                  fontSize: 28,
                  color: "#f87171",
                  ...font,
                  fontWeight: 500,
                  opacity: interpolate(frame, [220, 235], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                Context 溢出风险
              </div>
            )}
          </div>

          {/* --- Fetch Strategy --- */}
          <div style={{ opacity: rightTitleOpacity }}>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#e0e0e0",
                marginBottom: 28,
                ...font,
              }}
            >
              Fetch 策略
            </div>
            {renderBar(
              "Context 占用",
              fetchWidth,
              "linear-gradient(90deg, #4ade80, #4ade80)",
              false,
              1,
            )}

            {/* Fetch pulse indicator */}
            {fetchPulse > 0 && frame > 180 && (
              <div
                style={{
                  fontSize: 28,
                  color: "#4ade80",
                  ...font,
                  fontWeight: 500,
                  opacity: fetchPulse / 6,
                }}
              >
                fetch...
              </div>
            )}

            <div
              style={{
                fontSize: 28,
                color: "#4ade80",
                ...font,
                fontWeight: 500,
                marginTop: 6,
                opacity: interpolate(frame, [200, 215], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              按需加载，Context 保持稳定
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
