import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

const ACCENT = "#D97757";

const PHASES = [
  {
    label: "准备",
    color: "#6e8efb",
    steps: ["查找工具", "验证参数", "beforeToolCall"],
  },
  {
    label: "执行",
    color: "#4ade80",
    tools: ["Tool A", "Tool B", "Tool C"],
  },
  {
    label: "完成",
    color: ACCENT,
    steps: ["afterToolCall", "emit 结果", "保序输出"],
  },
] as const;

const PHASE_WIDTH = 480;
const PHASE_HEIGHT = 340;
const PHASE_GAP = 60;
const PHASE_START_X = (1920 - PHASE_WIDTH * 3 - PHASE_GAP * 2) / 2;
const PHASE_Y = 280;

export const ToolCallFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Title (0-30) ---
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Exit fade (420-450) ---
  const exitOpacity = interpolate(frame, [420, 450], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Phase 1: Prepare (30-150) ---
  const phase1BoxProgress = spring({
    frame: frame - 30,
    fps,
    config: { damping: 14, stiffness: 160 },
  });

  const phase1Steps = PHASES[0].steps.map((_, i) => {
    const delay = 50 + i * 30;
    return {
      opacity: interpolate(frame, [delay, delay + 20], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
      slideX: interpolate(frame, [delay, delay + 20], [-40, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    };
  });

  // --- Phase 2: Execute (150-270) ---
  const phase2BoxProgress = spring({
    frame: frame - 150,
    fps,
    config: { damping: 14, stiffness: 160 },
  });

  const phase2Bars = [0, 1, 2].map((i) => {
    const delay = 170 + i * 10;
    return interpolate(frame, [delay, delay + 60], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });

  // --- Phase 3: Finalize (270-390) ---
  const phase3BoxProgress = spring({
    frame: frame - 270,
    fps,
    config: { damping: 14, stiffness: 160 },
  });

  const phase3Steps = PHASES[2].steps.map((_, i) => {
    const delay = 290 + i * 30;
    return {
      opacity: interpolate(frame, [delay, delay + 20], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
      slideX: interpolate(frame, [delay, delay + 20], [-40, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    };
  });

  // "保序输出" special highlight pulse
  const highlightPulse =
    frame >= 350 && frame <= 390
      ? interpolate(Math.sin((frame - 350) * 0.2), [-1, 1], [0.3, 1])
      : 0;

  // --- Connecting arrow (390-420) ---
  const arrowProgress = interpolate(frame, [390, 420], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Helpers ---
  const phaseBoxStyle = (
    color: string,
    progress: number
  ): React.CSSProperties => ({
    width: PHASE_WIDTH,
    height: PHASE_HEIGHT,
    borderRadius: 16,
    border: `2px solid ${color}50`,
    backgroundColor: `${color}10`,
    opacity: progress,
    transform: `scale(${interpolate(progress, [0, 1], [0.85, 1])})`,
    display: "flex",
    flexDirection: "column",
    padding: "20px 24px",
    position: "relative",
  });

  const phaseLabelStyle = (color: string): React.CSSProperties => ({
    fontSize: 28,
    fontWeight: 700,
    color,
    marginBottom: 20,
    textAlign: "center",
    fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
  });

  const stepStyle = (
    color: string,
    opacity: number,
    slideX: number,
    highlight?: boolean
  ): React.CSSProperties => ({
    padding: "10px 20px",
    borderRadius: 8,
    border: `1px solid ${color}${highlight ? "cc" : "60"}`,
    backgroundColor: highlight ? `${color}30` : `${color}12`,
    color: "#e0e0e0",
    fontSize: 20,
    fontWeight: 500,
    fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
    opacity,
    transform: `translateX(${slideX}px)`,
    marginBottom: 10,
    boxShadow: highlight ? `0 0 18px ${color}60` : "none",
  });

  const barColors = ["#4ade80", "#34d399", "#22c55e"];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a1a",
        opacity: exitOpacity,
        fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
      }}
    >
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 80,
          width: "100%",
          textAlign: "center",
          fontSize: 44,
          fontWeight: 700,
          color: "#e0e0e0",
          opacity: titleOpacity,
          letterSpacing: 3,
        }}
      >
        工具调用完整链路
      </div>

      {/* Phase labels: 1, 2, 3 small badges */}
      {PHASES.map((phase, i) => {
        const x = PHASE_START_X + i * (PHASE_WIDTH + PHASE_GAP);
        const prog = [phase1BoxProgress, phase2BoxProgress, phase3BoxProgress][i];
        return (
          <div
            key={phase.label}
            style={{
              position: "absolute",
              left: x,
              top: PHASE_Y - 40,
              width: PHASE_WIDTH,
              textAlign: "center",
              fontSize: 16,
              fontWeight: 600,
              color: phase.color,
              opacity: prog * 0.7,
              fontFamily: "'SF Mono', monospace",
            }}
          >
            Phase {i + 1}
          </div>
        );
      })}

      {/* Phase 1: Prepare */}
      <div
        style={{
          position: "absolute",
          left: PHASE_START_X,
          top: PHASE_Y,
          ...phaseBoxStyle(PHASES[0].color, phase1BoxProgress),
        }}
      >
        <div style={phaseLabelStyle(PHASES[0].color)}>{PHASES[0].label}</div>
        {PHASES[0].steps.map((step, i) => (
          <div
            key={step}
            style={stepStyle(
              PHASES[0].color,
              phase1Steps[i].opacity,
              phase1Steps[i].slideX
            )}
          >
            {step}
          </div>
        ))}
      </div>

      {/* Phase 2: Execute */}
      <div
        style={{
          position: "absolute",
          left: PHASE_START_X + PHASE_WIDTH + PHASE_GAP,
          top: PHASE_Y,
          ...phaseBoxStyle(PHASES[1].color, phase2BoxProgress),
        }}
      >
        <div style={phaseLabelStyle(PHASES[1].color)}>{PHASES[1].label}</div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 14,
            padding: "0 16px",
          }}
        >
          {PHASES[1].tools.map((tool, i) => (
            <div key={tool} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  fontSize: 16,
                  color: barColors[i],
                  fontFamily: "'SF Mono', monospace",
                  minWidth: 60,
                  fontWeight: 500,
                }}
              >
                {tool}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: `${barColors[i]}15`,
                  border: `1px solid ${barColors[i]}40`,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${phase2Bars[i] * 100}%`,
                    height: "100%",
                    borderRadius: 5,
                    background: `linear-gradient(90deg, ${barColors[i]}40, ${barColors[i]}90)`,
                    boxShadow: `0 0 10px ${barColors[i]}40`,
                  }}
                />
              </div>
            </div>
          ))}
          <div
            style={{
              textAlign: "center",
              fontSize: 14,
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'SF Mono', monospace",
              marginTop: 4,
              opacity: phase2Bars[2] > 0.3 ? 1 : 0,
            }}
          >
            并行执行
          </div>
        </div>
      </div>

      {/* Phase 3: Finalize */}
      <div
        style={{
          position: "absolute",
          left: PHASE_START_X + (PHASE_WIDTH + PHASE_GAP) * 2,
          top: PHASE_Y,
          ...phaseBoxStyle(PHASES[2].color, phase3BoxProgress),
        }}
      >
        <div style={phaseLabelStyle(PHASES[2].color)}>{PHASES[2].label}</div>
        {PHASES[2].steps.map((step, i) => {
          const isHighlight = step === "保序输出";
          return (
            <div
              key={step}
              style={stepStyle(
                PHASES[2].color,
                phase3Steps[i].opacity,
                phase3Steps[i].slideX,
                isHighlight && highlightPulse > 0
              )}
            >
              {step}
              {isHighlight && highlightPulse > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 14,
                    color: `rgba(217,119,87,${highlightPulse})`,
                    fontFamily: "'SF Mono', monospace",
                  }}
                >
                  // ordering guaranteed
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Connecting arrows between phases */}
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      >
        {/* Arrow from phase 1 to phase 2 */}
        <line
          x1={PHASE_START_X + PHASE_WIDTH + 4}
          y1={PHASE_Y + PHASE_HEIGHT / 2}
          x2={PHASE_START_X + PHASE_WIDTH + PHASE_GAP - 4}
          y2={PHASE_Y + PHASE_HEIGHT / 2}
          stroke={`rgba(255,255,255,${arrowProgress * 0.5})`}
          strokeWidth={3}
          strokeDasharray={PHASE_GAP}
          strokeDashoffset={PHASE_GAP * (1 - arrowProgress)}
        />
        <polygon
          points={`${PHASE_START_X + PHASE_WIDTH + PHASE_GAP - 4},${PHASE_Y + PHASE_HEIGHT / 2 - 6} ${PHASE_START_X + PHASE_WIDTH + PHASE_GAP - 4},${PHASE_Y + PHASE_HEIGHT / 2 + 6} ${PHASE_START_X + PHASE_WIDTH + PHASE_GAP + 4},${PHASE_Y + PHASE_HEIGHT / 2}`}
          fill={`rgba(255,255,255,${arrowProgress * 0.5})`}
        />

        {/* Arrow from phase 2 to phase 3 */}
        <line
          x1={PHASE_START_X + PHASE_WIDTH * 2 + PHASE_GAP + 4}
          y1={PHASE_Y + PHASE_HEIGHT / 2}
          x2={PHASE_START_X + PHASE_WIDTH * 2 + PHASE_GAP * 2 - 4}
          y2={PHASE_Y + PHASE_HEIGHT / 2}
          stroke={`rgba(255,255,255,${arrowProgress * 0.5})`}
          strokeWidth={3}
          strokeDasharray={PHASE_GAP}
          strokeDashoffset={PHASE_GAP * (1 - arrowProgress)}
        />
        <polygon
          points={`${PHASE_START_X + PHASE_WIDTH * 2 + PHASE_GAP * 2 - 4},${PHASE_Y + PHASE_HEIGHT / 2 - 6} ${PHASE_START_X + PHASE_WIDTH * 2 + PHASE_GAP * 2 - 4},${PHASE_Y + PHASE_HEIGHT / 2 + 6} ${PHASE_START_X + PHASE_WIDTH * 2 + PHASE_GAP * 2 + 4},${PHASE_Y + PHASE_HEIGHT / 2}`}
          fill={`rgba(255,255,255,${arrowProgress * 0.5})`}
        />

        {/* Full connecting line across all phases */}
        <line
          x1={PHASE_START_X}
          y1={PHASE_Y + PHASE_HEIGHT + 30}
          x2={PHASE_START_X + PHASE_WIDTH * 3 + PHASE_GAP * 2}
          y2={PHASE_Y + PHASE_HEIGHT + 30}
          stroke={`rgba(217,119,87,${arrowProgress * 0.4})`}
          strokeWidth={2}
          strokeDasharray={4}
        />
      </svg>
    </AbsoluteFill>
  );
};
