import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

interface LayerConfig {
  name: string;
  subtitle: string;
  lineCount: string;
  color: string;
}

const LAYERS: LayerConfig[] = [
  { name: "pi-ai", subtitle: "统一 LLM API", lineCount: "~5,000 行", color: "#4a90d9" },
  { name: "pi-agent-core", subtitle: "Agent 运行时", lineCount: "~1,900 行", color: "#4ad97a" },
  { name: "pi-coding-agent", subtitle: "编码助手", lineCount: "~20,000 行", color: "#D97757" },
];

export const PiArchOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background fade in
  const bgOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Exit fade (260-300)
  const exitOpacity = interpolate(frame, [260, 300], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Title appears first
  const titleProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 14, stiffness: 180 },
  });

  // Each layer appears sequentially, bottom-up
  const layerDelays = [40, 100, 160]; // bottom, middle, top
  const layerAnimations = LAYERS.map((_, i) => {
    const delay = layerDelays[i];
    const slideProgress = spring({
      frame: frame - delay,
      fps,
      config: { damping: 14, stiffness: 120 },
    });
    const slideY = interpolate(slideProgress, [0, 1], [60, 0]);
    const opacity = interpolate(slideProgress, [0, 1], [0, 1]);

    // Line count fades in after the layer
    const lineCountOpacity = interpolate(frame, [delay + 25, delay + 40], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    return { slideY, opacity, lineCountOpacity };
  });

  // Arrows between layers
  const arrowOpacities = [
    interpolate(frame, [85, 95], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(frame, [145, 155], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  ];

  // Render layers bottom-up but in visual order (top layer rendered last)
  const renderOrder = [0, 1, 2]; // bottom, middle, top

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a1a",
        opacity: bgOpacity * exitOpacity,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 60,
          fontSize: 42,
          fontWeight: 700,
          color: "#ffffff",
          opacity: titleProgress,
          fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
          letterSpacing: 2,
        }}
      >
        Pi 项目架构
      </div>

      {/* Architecture stack */}
      <div
        style={{
          display: "flex",
          flexDirection: "column-reverse",
          alignItems: "center",
          gap: 0,
          marginTop: 40,
        }}
      >
        {renderOrder.map((layerIndex, renderIndex) => {
          const layer = LAYERS[layerIndex];
          const anim = layerAnimations[layerIndex];

          return (
            <React.Fragment key={layer.name}>
              {/* Arrow between layers (not for the bottom-most) */}
              {renderIndex > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    opacity: arrowOpacities[renderIndex - 1],
                    margin: "8px 0",
                  }}
                >
                  <div
                    style={{
                      width: 2,
                      height: 24,
                      backgroundColor: "rgba(255,255,255,0.25)",
                    }}
                  />
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "8px solid transparent",
                      borderRight: "8px solid transparent",
                      borderBottom: `10px solid rgba(255,255,255,0.25)`,
                      transform: "rotate(180deg)",
                    }}
                  />
                </div>
              )}

              {/* Layer box */}
              <div
                style={{
                  opacity: anim.opacity,
                  transform: `translateY(${anim.slideY}px)`,
                  width: 700,
                  padding: "28px 40px",
                  borderRadius: 12,
                  border: `1px solid ${layer.color}40`,
                  backgroundColor: `${layer.color}12`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  position: "relative",
                }}
              >
                {/* Left: name and subtitle */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: 700,
                      color: layer.color,
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                    }}
                  >
                    {layer.name}
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      color: "rgba(255,255,255,0.55)",
                      fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
                    }}
                  >
                    {layer.subtitle}
                  </div>
                </div>

                {/* Right: line count */}
                <div
                  style={{
                    fontSize: 22,
                    color: "rgba(255,255,255,0.4)",
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    opacity: anim.lineCountOpacity,
                  }}
                >
                  {layer.lineCount}
                </div>

                {/* Accent bar on left */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "15%",
                    bottom: "15%",
                    width: 4,
                    backgroundColor: layer.color,
                    borderRadius: 2,
                    opacity: 0.7,
                  }}
                />
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
