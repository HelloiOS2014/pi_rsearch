import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

const ACCENT = "#D97757";

const PROVIDERS = [
  { name: "Anthropic", color: "#D97757", label: "Claude" },
  { name: "OpenAI", color: "#10a37f", label: "GPT" },
  { name: "Google", color: "#4285F4", label: "Gemini" },
] as const;

const CENTER_X = 960;
const TOP_Y = 180;
const ADAPTER_Y = 460;
const PROVIDER_Y = 720;
const BOX_WIDTH = 280;
const BOX_HEIGHT = 80;
const ADAPTER_GAP = 360;

export const ProviderAbstract: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Exit fade (330-360) ---
  const exitOpacity = interpolate(frame, [330, 360], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Phase 1 (0-60): Top box appears ---
  const topBoxProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 140 },
  });

  // --- Code label (20-50) ---
  const codeLabelOpacity = interpolate(frame, [20, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Phase 2 (60-120): Arrows split into 3 ---
  const splitProgress = interpolate(frame, [60, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Adapter boxes (80-120) ---
  const adapterProgress = PROVIDERS.map((_, i) => {
    const delay = 80 + i * 12;
    return spring({
      frame: frame - delay,
      fps,
      config: { damping: 14, stiffness: 160 },
    });
  });

  // --- Provider labels (100-140) ---
  const providerProgress = PROVIDERS.map((_, i) => {
    const delay = 100 + i * 12;
    return spring({
      frame: frame - delay,
      fps,
      config: { damping: 14, stiffness: 160 },
    });
  });

  // --- Phase 3 (120-240): Anthropic path lights up ---
  const anthropicFlowDown = interpolate(frame, [120, 160], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const anthropicFlowUp = interpolate(frame, [170, 220], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const anthropicActive = frame >= 120 && frame < 240;
  const anthropicGlow =
    anthropicActive
      ? interpolate(Math.sin((frame - 120) * 0.08), [-1, 1], [0.3, 0.9])
      : 0;

  // --- Phase 4 (240-300): OpenAI path lights up ---
  const openaiFlowDown = interpolate(frame, [240, 270], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const openaiFlowUp = interpolate(frame, [275, 310], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const openaiActive = frame >= 240 && frame < 330;
  const openaiGlow =
    openaiActive
      ? interpolate(Math.sin((frame - 240) * 0.08), [-1, 1], [0.3, 0.9])
      : 0;

  // --- Status text ---
  const statusText =
    anthropicActive
      ? "Anthropic 适配器处理中..."
      : openaiActive
        ? "OpenAI 适配器处理中..."
        : "";
  const statusOpacity =
    anthropicActive || openaiActive
      ? interpolate(Math.sin(frame * 0.1), [-1, 1], [0.5, 1])
      : 0;

  // --- Helpers ---
  const adapterX = (i: number) => CENTER_X + (i - 1) * ADAPTER_GAP;

  const renderBox = (
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: string,
    progress: number,
    sublabel?: string,
    glow?: number
  ) => (
    <div
      style={{
        position: "absolute",
        left: x - width / 2,
        top: y - height / 2,
        width,
        height,
        borderRadius: 14,
        border: `2px solid ${color}${glow && glow > 0.5 ? "cc" : "60"}`,
        backgroundColor: `${color}${glow && glow > 0.5 ? "25" : "10"}`,
        opacity: progress,
        transform: `scale(${interpolate(progress, [0, 1], [0.85, 1])})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow:
          glow && glow > 0.3
            ? `0 0 ${20 + glow * 20}px ${color}${Math.round(glow * 60)
                .toString(16)
                .padStart(2, "0")}`
            : "none",
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: "#e0e0e0",
          fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
        }}
      >
        {label}
      </div>
      {sublabel && (
        <div
          style={{
            fontSize: 15,
            fontWeight: 400,
            color: `${color}cc`,
            fontFamily: "'SF Mono', monospace",
            marginTop: 4,
          }}
        >
          {sublabel}
        </div>
      )}
    </div>
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a1a",
        opacity: exitOpacity,
        fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
      }}
    >
      {/* Top unified API box */}
      {renderBox(
        CENTER_X,
        TOP_Y,
        400,
        100,
        "统一 API",
        "#6e8efb",
        topBoxProgress
      )}

      {/* Code label under API box */}
      <div
        style={{
          position: "absolute",
          left: CENTER_X - 200,
          top: TOP_Y + 58,
          width: 400,
          textAlign: "center",
          fontSize: 18,
          color: "#6e8efb",
          opacity: codeLabelOpacity,
          fontFamily: "'SF Mono', monospace",
        }}
      >
        stream(model, context)
      </div>

      {/* SVG arrows and flow */}
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      >
        <defs>
          <filter id="providerGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Splitting arrows from top box to each adapter */}
        {PROVIDERS.map((provider, i) => {
          const targetX = adapterX(i);
          const startY = TOP_Y + 50;
          const endY = ADAPTER_Y - 40;
          const midY = (startY + endY) / 2;

          // Path from center top to each adapter
          const pathD = `M ${CENTER_X} ${startY} C ${CENTER_X} ${midY}, ${targetX} ${midY}, ${targetX} ${endY}`;
          const pathLen = 400;

          return (
            <path
              key={`split-${i}`}
              d={pathD}
              fill="none"
              stroke={`${provider.color}${Math.round(splitProgress * 80)
                .toString(16)
                .padStart(2, "0")}`}
              strokeWidth={2}
              strokeDasharray={pathLen}
              strokeDashoffset={pathLen * (1 - splitProgress)}
            />
          );
        })}

        {/* Arrows from adapters to providers */}
        {PROVIDERS.map((provider, i) => {
          const x = adapterX(i);
          const startY = ADAPTER_Y + 40;
          const endY = PROVIDER_Y - 40;

          return (
            <line
              key={`down-${i}`}
              x1={x}
              y1={startY}
              x2={x}
              y2={startY + (endY - startY) * splitProgress}
              stroke={`${provider.color}50`}
              strokeWidth={2}
              strokeDasharray="6 4"
            />
          );
        })}

        {/* Active flow: Anthropic request going down */}
        {anthropicActive && (
          <>
            <circle
              cx={adapterX(0)}
              cy={interpolate(anthropicFlowDown, [0, 1], [ADAPTER_Y + 40, PROVIDER_Y - 40])}
              r={6}
              fill={PROVIDERS[0].color}
              filter="url(#providerGlow)"
              opacity={anthropicFlowDown < 1 ? 1 : 0}
            />
            {/* Response flowing back up */}
            {anthropicFlowUp > 0 && (
              <circle
                cx={adapterX(0)}
                cy={interpolate(anthropicFlowUp, [0, 1], [PROVIDER_Y - 40, ADAPTER_Y + 40])}
                r={6}
                fill={PROVIDERS[0].color}
                filter="url(#providerGlow)"
                opacity={anthropicFlowUp < 1 ? 1 : 0}
              />
            )}
          </>
        )}

        {/* Active flow: OpenAI request going down */}
        {openaiActive && (
          <>
            <circle
              cx={adapterX(1)}
              cy={interpolate(openaiFlowDown, [0, 1], [ADAPTER_Y + 40, PROVIDER_Y - 40])}
              r={6}
              fill={PROVIDERS[1].color}
              filter="url(#providerGlow)"
              opacity={openaiFlowDown < 1 ? 1 : 0}
            />
            {/* Response flowing back up */}
            {openaiFlowUp > 0 && (
              <circle
                cx={adapterX(1)}
                cy={interpolate(openaiFlowUp, [0, 1], [PROVIDER_Y - 40, ADAPTER_Y + 40])}
                r={6}
                fill={PROVIDERS[1].color}
                filter="url(#providerGlow)"
                opacity={openaiFlowUp < 1 ? 1 : 0}
              />
            )}
          </>
        )}
      </svg>

      {/* Adapter boxes */}
      {PROVIDERS.map((provider, i) => {
        const glow = i === 0 ? anthropicGlow : i === 1 ? openaiGlow : 0;
        return (
          <React.Fragment key={`adapter-${i}`}>
            {renderBox(
              adapterX(i),
              ADAPTER_Y,
              BOX_WIDTH,
              BOX_HEIGHT,
              `${provider.name} 适配器`,
              provider.color,
              adapterProgress[i],
              undefined,
              glow
            )}
          </React.Fragment>
        );
      })}

      {/* Provider labels (bottom) */}
      {PROVIDERS.map((provider, i) => {
        const glow = i === 0 ? anthropicGlow : i === 1 ? openaiGlow : 0;
        return (
          <React.Fragment key={`provider-${i}`}>
            {renderBox(
              adapterX(i),
              PROVIDER_Y,
              BOX_WIDTH,
              BOX_HEIGHT,
              provider.label,
              provider.color,
              providerProgress[i],
              provider.name,
              glow
            )}
          </React.Fragment>
        );
      })}

      {/* Status text */}
      {statusText && (
        <div
          style={{
            position: "absolute",
            bottom: 120,
            width: "100%",
            textAlign: "center",
            fontSize: 28,
            fontWeight: 600,
            color: anthropicActive ? PROVIDERS[0].color : PROVIDERS[1].color,
            opacity: statusOpacity,
            fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
            letterSpacing: 2,
          }}
        >
          {statusText}
        </div>
      )}

      {/* Layer labels */}
      <div
        style={{
          position: "absolute",
          left: 60,
          top: TOP_Y - 10,
          fontSize: 14,
          color: "rgba(255,255,255,0.3)",
          fontFamily: "'SF Mono', monospace",
          opacity: splitProgress,
        }}
      >
        Application Layer
      </div>
      <div
        style={{
          position: "absolute",
          left: 60,
          top: ADAPTER_Y - 10,
          fontSize: 14,
          color: "rgba(255,255,255,0.3)",
          fontFamily: "'SF Mono', monospace",
          opacity: splitProgress,
        }}
      >
        Adapter Layer
      </div>
      <div
        style={{
          position: "absolute",
          left: 60,
          top: PROVIDER_Y - 10,
          fontSize: 14,
          color: "rgba(255,255,255,0.3)",
          fontFamily: "'SF Mono', monospace",
          opacity: splitProgress,
        }}
      >
        Provider Layer
      </div>
    </AbsoluteFill>
  );
};
