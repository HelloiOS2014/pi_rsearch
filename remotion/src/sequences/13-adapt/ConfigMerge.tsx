import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

// Colors
const RED = "#f87171";
const BLUE = "#60a5fa";
const YELLOW = "#fbbf24";
const GREEN = "#4ade80";
const BG = "#0a0a1a";
const TEXT = "#e0e0e0";
const DIM = "rgba(255,255,255,0.45)";

const FONT = "'SF Mono', 'Fira Code', monospace";
const FONT_DISPLAY = "'SF Pro Display', Helvetica, Arial, sans-serif";

// Config data
interface ConfigLayer {
  label: string;
  color: string;
  entries: { key: string; value: string }[];
}

const layers: ConfigLayer[] = [
  {
    label: "Enterprise",
    color: "#a78bfa",
    entries: [
      { key: "maxRetries", value: "3" },
      { key: "compaction", value: "{ enabled: true, threshold: 0.75 }" },
      { key: "tools", value: '["read", "edit", "bash"]' },
    ],
  },
  {
    label: "Organization",
    color: "#818cf8",
    entries: [{ key: "compaction", value: "{ threshold: 0.6 }" }],
  },
  {
    label: "Project",
    color: "#6366f1",
    entries: [{ key: "maxRetries", value: "5" }],
  },
  {
    label: "User",
    color: "#8b5cf6",
    entries: [{ key: "tools", value: '["read", "edit"]' }],
  },
];

const mergedEntries = [
  { key: "maxRetries", value: "5", color: RED },
  {
    key: "compaction",
    value: "{ enabled: true, threshold: 0.6 }",
    color: BLUE,
  },
  { key: "tools", value: '["read", "edit"]', color: YELLOW },
];

export const ConfigMerge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Global fade ---
  const fadeIn = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [220, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Phase 1: Cards appear (0-50) ---
  const cardAppear = (index: number) => {
    const delay = index * 12;
    return spring({
      frame: frame - delay,
      fps,
      config: { damping: 14, stiffness: 140 },
    });
  };

  // --- Phase 2: Primitive override (60-100) ---
  // Enterprise maxRetries strikethrough
  const strikethroughProgress = interpolate(frame, [65, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Red flash on Project's maxRetries
  const redFlashIntensity = interpolate(
    frame,
    [70, 80, 90, 100],
    [0, 1, 0.6, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  // Scale pop on Project's maxRetries
  const overrideScale = spring({
    frame: frame - 75,
    fps,
    config: { damping: 8, stiffness: 200 },
  });

  // --- Phase 3: Object merge (110-150) ---
  const blueMergeArrow = interpolate(frame, [115, 130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blueGlow = interpolate(frame, [120, 135, 145, 150], [0, 1, 0.5, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Phase 4: Array replace (160-200) ---
  const arrayFadeOut = interpolate(frame, [165, 180], [1, 0.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const yellowFlash = interpolate(
    frame,
    [170, 180, 190, 200],
    [0, 1, 0.5, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const arraySlideIn = spring({
    frame: frame - 175,
    fps,
    config: { damping: 12, stiffness: 160 },
  });

  // --- Phase 5: Merged result (200-220) ---
  const resultAppear = spring({
    frame: frame - 200,
    fps,
    config: { damping: 12, stiffness: 120 },
  });
  const resultGlow = interpolate(frame, [205, 215], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase label helper
  const phaseLabel = (
    text: string,
    color: string,
    startFrame: number,
    endFrame: number
  ) => {
    const opacity = interpolate(
      frame,
      [startFrame, startFrame + 10, endFrame - 10, endFrame],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    return (
      <div
        style={{
          position: "absolute",
          top: 40,
          right: 60,
          fontSize: 36,
          fontWeight: 600,
          color,
          opacity,
          fontFamily: FONT_DISPLAY,
          letterSpacing: 1,
        }}
      >
        {text}
      </div>
    );
  };

  // Card renderer
  const renderCard = (
    layer: ConfigLayer,
    index: number,
    customStyle?: React.CSSProperties
  ) => {
    const appear = cardAppear(index);
    const yOffset = interpolate(appear, [0, 1], [30, 0]);
    return (
      <div
        key={layer.label}
        style={{
          opacity: appear,
          transform: `translateY(${yOffset}px)`,
          width: 780,
          padding: "28px 44px",
          borderRadius: 10,
          border: `1px solid ${layer.color}55`,
          backgroundColor: `${layer.color}10`,
          fontFamily: FONT,
          fontSize: 28,
          color: TEXT,
          position: "relative",
          ...customStyle,
        }}
      >
        {/* Layer label */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: layer.color,
            marginBottom: 14,
            fontFamily: FONT_DISPLAY,
            letterSpacing: 0.5,
          }}
        >
          {layer.label}
        </div>
        {/* Entries */}
        {layer.entries.map((entry) => {
          let entryStyle: React.CSSProperties = {
            marginBottom: 8,
            lineHeight: 1.6,
            position: "relative",
          };
          let valueStyle: React.CSSProperties = { color: DIM };
          let extraDecoration: React.ReactNode = null;

          // Phase 2: strikethrough Enterprise maxRetries
          if (
            layer.label === "Enterprise" &&
            entry.key === "maxRetries" &&
            frame >= 60
          ) {
            entryStyle = {
              ...entryStyle,
              opacity: interpolate(strikethroughProgress, [0, 1], [1, 0.4]),
            };
            extraDecoration = (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  width: `${strikethroughProgress * 100}%`,
                  height: 2,
                  backgroundColor: RED,
                  transform: "translateY(-50%)",
                }}
              />
            );
          }

          // Phase 2: highlight Project maxRetries
          if (
            layer.label === "Project" &&
            entry.key === "maxRetries" &&
            frame >= 70
          ) {
            const s = interpolate(overrideScale, [0, 1], [1, 1.08]);
            entryStyle = {
              ...entryStyle,
              transform: `scale(${s})`,
              transformOrigin: "left center",
            };
            valueStyle = {
              ...valueStyle,
              color: RED,
              fontWeight: 700,
              textShadow: `0 0 ${redFlashIntensity * 12}px ${RED}`,
            };
          }

          // Phase 3: glow on compaction entries
          if (entry.key === "compaction" && frame >= 110) {
            valueStyle = {
              ...valueStyle,
              color: BLUE,
              textShadow: `0 0 ${blueGlow * 10}px ${BLUE}`,
            };
          }

          // Phase 4: Enterprise tools fade out
          if (
            layer.label === "Enterprise" &&
            entry.key === "tools" &&
            frame >= 160
          ) {
            entryStyle = {
              ...entryStyle,
              opacity: arrayFadeOut,
            };
            if (yellowFlash > 0) {
              valueStyle = {
                ...valueStyle,
                textShadow: `0 0 ${yellowFlash * 10}px ${YELLOW}`,
              };
            }
          }

          // Phase 4: User tools highlight + slide in
          if (
            layer.label === "User" &&
            entry.key === "tools" &&
            frame >= 170
          ) {
            const slideX = interpolate(arraySlideIn, [0, 1], [20, 0]);
            entryStyle = {
              ...entryStyle,
              transform: `translateX(${slideX}px)`,
            };
            valueStyle = {
              ...valueStyle,
              color: YELLOW,
              fontWeight: 700,
              textShadow: `0 0 ${yellowFlash * 10}px ${YELLOW}`,
            };
          }

          return (
            <div key={entry.key} style={entryStyle}>
              {extraDecoration}
              <span style={{ color: TEXT }}>{entry.key}</span>
              <span style={{ color: "rgba(255,255,255,0.25)" }}>: </span>
              <span style={valueStyle}>{entry.value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Merge arrows between layers for phase 3 (object merge)
  const renderMergeArrow = (
    fromIdx: number,
    toIdx: number,
    color: string,
    progress: number
  ) => {
    if (progress <= 0) return null;
    const top = 0;
    return (
      <div
        key={`arrow-${fromIdx}-${toIdx}`}
        style={{
          position: "absolute",
          left: "50%",
          top,
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: progress,
          zIndex: 10,
        }}
      >
        <svg width="40" height="60" viewBox="0 0 24 36">
          <path
            d="M12 0 L12 28 M6 22 L12 28 L18 22"
            stroke={color}
            strokeWidth="2"
            fill="none"
            strokeDasharray={`${progress * 40}`}
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        opacity: fadeIn * fadeOut,
      }}
    >
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 60,
          fontSize: 48,
          fontWeight: 700,
          color: TEXT,
          fontFamily: FONT_DISPLAY,
          opacity: interpolate(frame, [0, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Config Merge
      </div>

      {/* Phase labels */}
      {phaseLabel("Primitive Override", RED, 60, 105)}
      {phaseLabel("Object Merge", BLUE, 110, 155)}
      {phaseLabel("Array Replace", YELLOW, 160, 200)}

      {/* Left: Config layers — absolute positioned */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 120,
          display: "flex",
          flexDirection: "column",
          gap: 48,
        }}
      >
          {layers.map((layer, i) => (
            <React.Fragment key={layer.label}>
              {renderCard(layer, i)}
              {i < layers.length - 1 && (
                <div
                  style={{
                    position: "relative",
                    height: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Phase 3: blue merge arrow between Enterprise and Organization */}
                  {i === 0 &&
                    frame >= 110 &&
                    renderMergeArrow(0, 1, BLUE, blueMergeArrow)}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

      {/* Right: Merged result — absolute positioned */}
      {frame >= 200 && (
        <div
          style={{
            position: "absolute",
            right: 150,
            top: 200,
            opacity: resultAppear,
            transform: `scale(${interpolate(resultAppear, [0, 1], [0.85, 1])})`,
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
              <svg
                width="100"
                height="40"
                viewBox="0 0 60 24"
                style={{
                  opacity: resultAppear,
                }}
              >
                <path
                  d="M0 12 L48 12 M42 6 L48 12 L42 18"
                  stroke={GREEN}
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>

              <div
                style={{
                  width: 750,
                  padding: "36px 48px",
                  borderRadius: 12,
                  border: `2px solid ${GREEN}`,
                  backgroundColor: `${GREEN}08`,
                  fontFamily: FONT,
                  fontSize: 28,
                  color: TEXT,
                  boxShadow: `0 0 ${resultGlow * 30}px ${GREEN}30`,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: GREEN,
                    marginBottom: 20,
                    fontFamily: FONT_DISPLAY,
                    letterSpacing: 0.5,
                  }}
                >
                  Merged Config
                </div>
                {mergedEntries.map((entry) => (
                  <div
                    key={entry.key}
                    style={{
                      marginBottom: 10,
                      lineHeight: 1.7,
                    }}
                  >
                    <span style={{ color: TEXT }}>{entry.key}</span>
                    <span style={{ color: "rgba(255,255,255,0.25)" }}>: </span>
                    <span style={{ color: entry.color, fontWeight: 600 }}>
                      {entry.value}
                    </span>
                    <span
                      style={{
                        marginLeft: 10,
                        fontSize: 28,
                        color: entry.color,
                        opacity: 0.6,
                      }}
                    >
                      {entry.color === RED
                        ? "override"
                        : entry.color === BLUE
                          ? "merged"
                          : "replaced"}
                    </span>
                  </div>
                ))}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
