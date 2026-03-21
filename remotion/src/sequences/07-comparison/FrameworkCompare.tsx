import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

// ── Colors ─────────────────────────────────────────────────────────────
const PI_GREEN = "#4ade80";
const LANGCHAIN_BLUE = "#60a5fa";
const VERCEL_PURPLE = "#a78bfa";

// ── Column definitions ─────────────────────────────────────────────────
interface FrameworkColumn {
  label: string;
  color: string;
  tradeoff: string;
  x: number;
}

const COLUMNS: FrameworkColumn[] = [
  { label: "Pi (Manual Loop)", color: PI_GREEN, tradeoff: "Full Control", x: 320 },
  { label: "LangChain (StateGraph)", color: LANGCHAIN_BLUE, tradeoff: "Declarative", x: 960 },
  { label: "Vercel AI SDK", color: VERCEL_PURPLE, tradeoff: "One-liner", x: 1600 },
];

// ── Task steps ─────────────────────────────────────────────────────────
const STEPS = ["Read file", "Count lines", "Report"];

export const FrameworkCompare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Title ────────────────────────────────────────────────────────────
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Exit fade ────────────────────────────────────────────────────────
  const exitOpacity = interpolate(frame, [410, 450], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Column build left to right ───────────────────────────────────────
  const columnProgress = COLUMNS.map((_, i) => {
    const delay = 40 + i * 80;
    return spring({
      frame: frame - delay,
      fps,
      config: { damping: 14, stiffness: 120 },
    });
  });

  // ── Step nodes appear within each column ─────────────────────────────
  const stepProgress = COLUMNS.map((_, ci) =>
    STEPS.map((_, si) => {
      const delay = 80 + ci * 80 + si * 25;
      return spring({
        frame: frame - delay,
        fps,
        config: { damping: 12, stiffness: 150 },
      });
    })
  );

  // ── Arrows / edges appear after steps ────────────────────────────────
  const arrowDelay = [180, 260, 340];
  const arrowProgress = COLUMNS.map((_, ci) =>
    interpolate(frame, [arrowDelay[ci], arrowDelay[ci] + 40], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  // ── Tradeoff labels ──────────────────────────────────────────────────
  const tradeoffOpacity = interpolate(frame, [360, 400], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Render Pi column: explicit loop arrows ───────────────────────────
  const renderPiSteps = (colIdx: number) => {
    const col = COLUMNS[colIdx];
    const yStart = 280;
    const yGap = 120;

    return (
      <>
        {STEPS.map((step, si) => (
          <div
            key={`pi-${si}`}
            style={{
              position: "absolute",
              left: col.x - 100,
              top: yStart + si * yGap - 25,
              width: 200,
              height: 50,
              borderRadius: 10,
              border: `2px solid ${col.color}80`,
              backgroundColor: `${col.color}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 600,
              color: "#e0e0e0",
              fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
              opacity: stepProgress[colIdx][si],
              transform: `scale(${interpolate(stepProgress[colIdx][si], [0, 1], [0.7, 1])})`,
            }}
          >
            {step}
          </div>
        ))}
        {/* Loop arrows between steps */}
        <svg
          width={1920}
          height={1080}
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
        >
          <defs>
            <marker id="piArrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={`${col.color}aa`} />
            </marker>
          </defs>
          {STEPS.slice(0, -1).map((_, si) => {
            const y1 = yStart + si * yGap + 25;
            const y2 = yStart + (si + 1) * yGap - 25;
            return (
              <line
                key={`pi-arr-${si}`}
                x1={col.x}
                y1={y1}
                x2={col.x}
                y2={y1 + (y2 - y1) * arrowProgress[colIdx]}
                stroke={`${col.color}88`}
                strokeWidth={2}
                markerEnd={arrowProgress[colIdx] > 0.9 ? "url(#piArrow)" : undefined}
              />
            );
          })}
          {/* While loop arrow on left side */}
          {arrowProgress[colIdx] > 0.5 && (
            <path
              d={`M ${col.x - 110} ${yStart + 2 * yGap + 25}
                  L ${col.x - 130} ${yStart + 2 * yGap + 25}
                  L ${col.x - 130} ${yStart - 25}
                  L ${col.x - 110} ${yStart - 25}`}
              stroke={`${col.color}55`}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              fill="none"
              opacity={arrowProgress[colIdx]}
              markerEnd="url(#piArrow)"
            />
          )}
        </svg>
        {/* "while" label */}
        {arrowProgress[colIdx] > 0.5 && (
          <div
            style={{
              position: "absolute",
              left: col.x - 190,
              top: yStart + yGap - 10,
              fontSize: 14,
              color: `${col.color}88`,
              fontFamily: "'SF Mono', monospace",
              opacity: arrowProgress[colIdx],
              transform: "rotate(-90deg)",
            }}
          >
            while loop
          </div>
        )}
      </>
    );
  };

  // ── Render LangChain column: graph nodes with edges ──────────────────
  const renderLangChainSteps = (colIdx: number) => {
    const col = COLUMNS[colIdx];
    const yStart = 280;
    const yGap = 120;
    const nodeLabels = ["llm_call", "tool_exec", "result"];

    return (
      <>
        {nodeLabels.map((label, si) => (
          <div
            key={`lc-${si}`}
            style={{
              position: "absolute",
              left: col.x - 90,
              top: yStart + si * yGap - 25,
              width: 180,
              height: 50,
              borderRadius: 25,
              border: `2px solid ${col.color}80`,
              backgroundColor: `${col.color}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 600,
              color: "#e0e0e0",
              fontFamily: "'SF Mono', monospace",
              opacity: stepProgress[colIdx][si],
              transform: `scale(${interpolate(stepProgress[colIdx][si], [0, 1], [0.7, 1])})`,
            }}
          >
            {label}
          </div>
        ))}
        {/* Graph edges */}
        <svg
          width={1920}
          height={1080}
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
        >
          <defs>
            <marker id="lcArrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={`${col.color}aa`} />
            </marker>
          </defs>
          {nodeLabels.slice(0, -1).map((_, si) => {
            const y1 = yStart + si * yGap + 25;
            const y2 = yStart + (si + 1) * yGap - 25;
            return (
              <line
                key={`lc-edge-${si}`}
                x1={col.x}
                y1={y1}
                x2={col.x}
                y2={y1 + (y2 - y1) * arrowProgress[colIdx]}
                stroke={`${col.color}88`}
                strokeWidth={2}
                markerEnd={arrowProgress[colIdx] > 0.9 ? "url(#lcArrow)" : undefined}
              />
            );
          })}
          {/* Conditional edge back from tool_exec to llm_call */}
          {arrowProgress[colIdx] > 0.5 && (
            <path
              d={`M ${col.x + 100} ${yStart + yGap + 25}
                  L ${col.x + 120} ${yStart + yGap + 25}
                  L ${col.x + 120} ${yStart - 25}
                  L ${col.x + 100} ${yStart - 25}`}
              stroke={`${col.color}55`}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              fill="none"
              opacity={arrowProgress[colIdx]}
              markerEnd="url(#lcArrow)"
            />
          )}
        </svg>
        {/* Conditional edge label */}
        {arrowProgress[colIdx] > 0.5 && (
          <div
            style={{
              position: "absolute",
              left: col.x + 128,
              top: yStart + 50,
              fontSize: 13,
              color: `${col.color}88`,
              fontFamily: "'SF Mono', monospace",
              opacity: arrowProgress[colIdx],
              transform: "rotate(90deg)",
              transformOrigin: "left top",
              whiteSpace: "nowrap",
            }}
          >
            conditional
          </div>
        )}
      </>
    );
  };

  // ── Render Vercel column: single box ─────────────────────────────────
  const renderVercelSteps = (colIdx: number) => {
    const col = COLUMNS[colIdx];
    const yCenter = 400;
    const boxProgress = stepProgress[colIdx][0];

    // Pulsing glow
    const pulseActive = frame >= 340 && frame <= 410;
    const pulseGlow = pulseActive
      ? interpolate(Math.sin((frame - 340) * 0.08), [-1, 1], [0.2, 0.7])
      : 0;

    return (
      <>
        <div
          style={{
            position: "absolute",
            left: col.x - 130,
            top: yCenter - 60,
            width: 260,
            height: 120,
            borderRadius: 16,
            border: `2px solid ${col.color}90`,
            backgroundColor: `${col.color}18`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: boxProgress,
            transform: `scale(${interpolate(boxProgress, [0, 1], [0.6, 1])})`,
            boxShadow: pulseGlow > 0.2
              ? `0 0 ${15 + pulseGlow * 30}px ${col.color}${Math.round(pulseGlow * 60).toString(16).padStart(2, "0")}`
              : "none",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#e0e0e0",
              fontFamily: "'SF Mono', monospace",
            }}
          >
            streamText()
          </div>
          <div
            style={{
              fontSize: 14,
              color: `${col.color}aa`,
              fontFamily: "'SF Mono', monospace",
              marginTop: 8,
            }}
          >
            maxSteps: 5
          </div>
        </div>
        {/* Internal steps shown dimly inside */}
        {STEPS.map((step, si) => {
          const stepDelay = 300 + si * 20;
          const show = interpolate(frame, [stepDelay, stepDelay + 20], [0, 0.5], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={`v-${si}`}
              style={{
                position: "absolute",
                left: col.x - 70,
                top: yCenter + 80 + si * 30,
                fontSize: 14,
                color: `${col.color}`,
                fontFamily: "'SF Mono', monospace",
                opacity: show,
              }}
            >
              {si + 1}. {step}
            </div>
          );
        })}
      </>
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
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 50,
          width: "100%",
          textAlign: "center",
          fontSize: 44,
          fontWeight: 700,
          color: "#e0e0e0",
          opacity: titleOpacity,
          letterSpacing: 2,
        }}
      >
        Framework Comparison
      </div>

      {/* Subtitle */}
      <div
        style={{
          position: "absolute",
          top: 110,
          width: "100%",
          textAlign: "center",
          fontSize: 22,
          color: "rgba(255,255,255,0.4)",
          opacity: titleOpacity,
          fontFamily: "'SF Mono', monospace",
        }}
      >
        Same task, three approaches
      </div>

      {/* Column headers */}
      {COLUMNS.map((col, ci) => (
        <div
          key={`hdr-${ci}`}
          style={{
            position: "absolute",
            left: col.x - 120,
            top: 180,
            width: 240,
            textAlign: "center",
            fontSize: 22,
            fontWeight: 700,
            color: col.color,
            opacity: columnProgress[ci],
            transform: `translateY(${interpolate(columnProgress[ci], [0, 1], [20, 0])}px)`,
          }}
        >
          {col.label}
        </div>
      ))}

      {/* Dividers between columns */}
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      >
        {[640, 1280].map((x, i) => (
          <line
            key={`div-${i}`}
            x1={x}
            y1={200}
            x2={x}
            y2={850}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        ))}
      </svg>

      {/* Column contents */}
      {renderPiSteps(0)}
      {renderLangChainSteps(1)}
      {renderVercelSteps(2)}

      {/* Tradeoff labels at bottom */}
      {COLUMNS.map((col, ci) => (
        <div
          key={`trade-${ci}`}
          style={{
            position: "absolute",
            left: col.x - 120,
            bottom: 100,
            width: 240,
            textAlign: "center",
            fontSize: 26,
            fontWeight: 700,
            color: col.color,
            opacity: tradeoffOpacity,
            letterSpacing: 1,
          }}
        >
          {col.tradeoff}
        </div>
      ))}

      {/* Task label */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          width: "100%",
          textAlign: "center",
          fontSize: 16,
          color: "rgba(255,255,255,0.25)",
          fontFamily: "'SF Mono', monospace",
          opacity: tradeoffOpacity,
        }}
      >
        Task: Read file → Count lines → Report
      </div>
    </AbsoluteFill>
  );
};
