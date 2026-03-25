import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

const ACCENT = "#D97757";
const BG = "#0a0a1a";

// Pipe definitions
interface PipeDef {
  label: string;
  sublabel: string;
  color: string;
  y: number; // center Y
}

const PIPES: PipeDef[] = [
  { label: "Steering", sublabel: "立即中断", color: "#f87171", y: 340 },
  { label: "FollowUp", sublabel: "等 turn 结束", color: "#fbbf24", y: 540 },
  { label: "NextTurn", sublabel: "随下次输入", color: "#60a5fa", y: 740 },
];

// Message definitions
interface MessageDef {
  text: string;
  enterFrame: number; // when the bubble appears on the left
  routeFrame: number; // when it starts moving toward the pipe
  pipeIndex: number; // which pipe it routes to
}

const MESSAGES: MessageDef[] = [
  { text: "紧急修复!", enterFrame: 60, routeFrame: 75, pipeIndex: 0 },
  { text: "补充需求", enterFrame: 100, routeFrame: 115, pipeIndex: 1 },
  { text: "顺便看看", enterFrame: 150, routeFrame: 165, pipeIndex: 2 },
];

// Layout constants
const LEFT_X = 200; // message bubble center X
const ROUTER_X = 660; // router node center X
const PIPE_START_X = 880; // pipe left edge
const PIPE_END_X = 1680; // pipe right edge
const AGENT_CORE_X = 1750; // agent core center X

export const MessageRouting: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Phase 1 (0-30): Background + Router fade in ──
  const bgOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  // ── Phase 7 (260-300): Fade out ──
  const exitOpacity = interpolate(frame, [260, 300], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Router node ──
  const routerScale = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, stiffness: 160 },
  });

  // Agent state cycles: idle(0-60) → streaming(60-150) → idle(150+)
  const getAgentState = (f: number): string => {
    if (f < 60) return "idle";
    if (f < 150) return "streaming";
    return "idle";
  };
  const agentState = getAgentState(frame);

  const stateColor =
    agentState === "streaming" ? "#4ade80" : "rgba(255,255,255,0.4)";
  const statePulse =
    agentState === "streaming"
      ? interpolate(
          Math.sin((frame - 60) * 0.15),
          [-1, 1],
          [0.6, 1]
        )
      : 1;

  // ── Phase 2 (30-60): Pipes appear ──
  const pipeProgresses = PIPES.map((_, i) => {
    const delay = 30 + i * 10;
    return spring({
      frame: frame - delay,
      fps,
      config: { damping: 14, stiffness: 140 },
    });
  });

  // ── Phase 3-5 (60-200): Messages enter, route, and flow ──
  // Each message goes through stages:
  // 1. Appear at LEFT_X
  // 2. Move from LEFT_X to ROUTER_X
  // 3. Move from ROUTER_X into the pipe
  // 4. Flow through the pipe to Agent Core (frame 200-260)

  const getMessagePosition = (msg: MessageDef) => {
    const { enterFrame, routeFrame, pipeIndex } = msg;
    const pipe = PIPES[pipeIndex];
    const pipeY = pipe.y;

    // Bubble appear
    const appearProgress = interpolate(
      frame,
      [enterFrame, enterFrame + 10],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // Move to router (routeFrame to routeFrame+20)
    const toRouterProgress = interpolate(
      frame,
      [routeFrame, routeFrame + 20],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // Move from router into pipe (routeFrame+20 to routeFrame+40)
    const toPipeProgress = interpolate(
      frame,
      [routeFrame + 20, routeFrame + 40],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // Flow through pipe to Agent Core (200-260)
    const flowProgress = interpolate(frame, [200, 250], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    // Calculate position
    const bubbleStartY = 540; // center of screen
    let x: number;
    let y: number;

    if (toPipeProgress > 0) {
      // Moving from router entry into the pipe, then flowing through
      const pipeEntryX = PIPE_START_X;
      const pipeFlowX = interpolate(flowProgress, [0, 1], [pipeEntryX + 40, PIPE_END_X - 20]);
      x = interpolate(toPipeProgress, [0, 1], [ROUTER_X + 60, pipeEntryX + 40]);
      if (toPipeProgress >= 1) {
        x = pipeFlowX;
      }
      y = interpolate(toPipeProgress, [0, 0.5, 1], [bubbleStartY, pipeY, pipeY]);
    } else if (toRouterProgress > 0) {
      // Moving to router
      x = interpolate(toRouterProgress, [0, 1], [LEFT_X, ROUTER_X - 60]);
      y = bubbleStartY;
    } else {
      x = LEFT_X;
      y = bubbleStartY;
    }

    return { x, y, appearProgress, toRouterProgress, toPipeProgress, flowProgress };
  };

  // Speed indicators for pipes — particles flowing through
  const renderPipeParticles = (pipe: PipeDef, pipeIndex: number, pipeProgress: number) => {
    if (frame < 200 || pipeProgress < 0.5) return null;

    const flowProgress = interpolate(frame, [200, 250], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    if (flowProgress <= 0) return null;

    // Speed varies by priority — steering is fastest
    const speeds = [1.4, 1.0, 0.7];
    const speed = speeds[pipeIndex];
    const particleCount = 3;

    return Array.from({ length: particleCount }).map((_, i) => {
      const offset = (i / particleCount) * (PIPE_END_X - PIPE_START_X);
      const rawPos =
        PIPE_START_X + ((offset + frame * speed * 4) % (PIPE_END_X - PIPE_START_X));
      const particleOpacity = flowProgress * 0.6;

      return (
        <div
          key={`particle-${pipeIndex}-${i}`}
          style={{
            position: "absolute",
            left: rawPos - 4,
            top: pipe.y - 4,
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: pipe.color,
            opacity: particleOpacity,
            boxShadow: `0 0 8px ${pipe.color}80`,
          }}
        />
      );
    });
  };

  // ── Agent Core (right side) ──
  const agentCoreOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const agentCorePulse =
    frame > 200
      ? interpolate(Math.sin((frame - 200) * 0.12), [-1, 1], [0.3, 0.8])
      : 0.2;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        opacity: bgOpacity * exitOpacity,
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
          opacity: interpolate(frame, [0, 25], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          letterSpacing: 3,
        }}
      >
        消息路由 — 按 Agent 状态分发
      </div>

      {/* Subtitle */}
      <div
        style={{
          position: "absolute",
          top: 110,
          width: "100%",
          textAlign: "center",
          fontSize: 20,
          fontWeight: 400,
          color: "rgba(255,255,255,0.4)",
          opacity: interpolate(frame, [10, 30], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          fontFamily: "'SF Mono', monospace",
        }}
      >
        MessageRouting
      </div>

      {/* ── Router Node (center) ── */}
      <div
        style={{
          position: "absolute",
          left: ROUTER_X - 90,
          top: 480,
          width: 180,
          height: 120,
          borderRadius: 16,
          border: `2px solid ${ACCENT}`,
          backgroundColor: `${ACCENT}15`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: routerScale,
          transform: `scale(${interpolate(routerScale, [0, 1], [0.7, 1])})`,
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: ACCENT,
          }}
        >
          Router
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: stateColor,
            opacity: statePulse,
            fontFamily: "'SF Mono', monospace",
            padding: "3px 10px",
            borderRadius: 6,
            backgroundColor: `${stateColor}15`,
            border: `1px solid ${stateColor}40`,
            transition: "color 0.3s",
          }}
        >
          {agentState}
        </div>
      </div>

      {/* ── SVG connection lines ── */}
      <svg
        width={1920}
        height={1080}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      >
        {/* Lines from router to pipe starts */}
        {PIPES.map((pipe, i) => {
          const progress = pipeProgresses[i];
          if (progress <= 0) return null;

          const routerOutX = ROUTER_X + 90;
          const routerOutY = 540;
          const pipeInX = PIPE_START_X;
          const pipeInY = pipe.y;
          const midX = (routerOutX + pipeInX) / 2;

          return (
            <path
              key={`conn-${i}`}
              d={`M ${routerOutX} ${routerOutY} C ${midX} ${routerOutY}, ${midX} ${pipeInY}, ${pipeInX} ${pipeInY}`}
              fill="none"
              stroke={`${pipe.color}${Math.round(progress * 60)
                .toString(16)
                .padStart(2, "0")}`}
              strokeWidth={2}
              strokeDasharray="6 4"
            />
          );
        })}
      </svg>

      {/* ── Three Pipes (right side) ── */}
      {PIPES.map((pipe, i) => {
        const progress = pipeProgresses[i];
        const pipeWidth = (PIPE_END_X - PIPE_START_X) * progress;

        return (
          <React.Fragment key={`pipe-${i}`}>
            {/* Pipe body */}
            <div
              style={{
                position: "absolute",
                left: PIPE_START_X,
                top: pipe.y - 24,
                width: pipeWidth,
                height: 48,
                borderRadius: 24,
                border: `2px solid ${pipe.color}50`,
                backgroundColor: `${pipe.color}08`,
                overflow: "hidden",
                opacity: progress,
              }}
            >
              {/* Inner glow track */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  height: 2,
                  backgroundColor: `${pipe.color}30`,
                  transform: "translateY(-50%)",
                }}
              />
            </div>

            {/* Pipe label (above pipe) */}
            <div
              style={{
                position: "absolute",
                left: PIPE_START_X + 16,
                top: pipe.y - 56,
                fontSize: 18,
                fontWeight: 700,
                color: pipe.color,
                opacity: progress,
                fontFamily: "'SF Mono', monospace",
              }}
            >
              {pipe.label}
            </div>

            {/* Pipe sublabel (inside pipe, right side) */}
            <div
              style={{
                position: "absolute",
                left: PIPE_START_X + pipeWidth - 160,
                top: pipe.y - 10,
                fontSize: 16,
                fontWeight: 500,
                color: `${pipe.color}cc`,
                opacity: progress,
                fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              {pipe.sublabel}
            </div>

            {/* Priority indicator */}
            <div
              style={{
                position: "absolute",
                left: PIPE_START_X + 16,
                top: pipe.y + 30,
                fontSize: 12,
                fontWeight: 400,
                color: "rgba(255,255,255,0.3)",
                opacity: progress,
                fontFamily: "'SF Mono', monospace",
              }}
            >
              {i === 0 ? "priority: high" : i === 1 ? "priority: medium" : "priority: low"}
            </div>

            {/* Pipe flow particles */}
            {renderPipeParticles(pipe, i, progress)}
          </React.Fragment>
        );
      })}

      {/* ── Agent Core (far right) ── */}
      <div
        style={{
          position: "absolute",
          left: AGENT_CORE_X - 55,
          top: 490,
          width: 110,
          height: 110,
          borderRadius: "50%",
          border: `2px solid ${ACCENT}80`,
          backgroundColor: `${ACCENT}10`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: agentCoreOpacity,
          boxShadow: `0 0 ${20 + agentCorePulse * 30}px rgba(217,119,87,${agentCorePulse * 0.4})`,
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: ACCENT,
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          Agent
          <br />
          Core
        </div>
      </div>

      {/* Lines from pipes to Agent Core */}
      <svg
        width={1920}
        height={1080}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      >
        {PIPES.map((pipe, i) => {
          const progress = pipeProgresses[i];
          if (progress <= 0) return null;

          const coreInY = 545; // center of Agent Core
          return (
            <path
              key={`to-core-${i}`}
              d={`M ${PIPE_END_X} ${pipe.y} Q ${PIPE_END_X + 30} ${pipe.y}, ${AGENT_CORE_X - 55} ${coreInY}`}
              fill="none"
              stroke={`${pipe.color}${Math.round(progress * 40)
                .toString(16)
                .padStart(2, "0")}`}
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
          );
        })}
      </svg>

      {/* ── Message Bubbles ── */}
      {MESSAGES.map((msg, i) => {
        const pos = getMessagePosition(msg);
        if (pos.appearProgress <= 0) return null;

        const pipe = PIPES[msg.pipeIndex];

        // Hide bubble once it has fully flowed through the pipe
        const hideProgress = interpolate(frame, [250, 260], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        if (hideProgress <= 0) return null;

        // Shrink as it enters pipe
        const scale =
          pos.toPipeProgress > 0
            ? interpolate(pos.toPipeProgress, [0, 1], [1, 0.7])
            : interpolate(pos.appearProgress, [0, 1], [0.5, 1]);

        return (
          <div
            key={`msg-${i}`}
            style={{
              position: "absolute",
              left: pos.x - 60,
              top: pos.y - 20,
              padding: "8px 18px",
              borderRadius: 12,
              backgroundColor:
                pos.toPipeProgress > 0.5 ? `${pipe.color}30` : "rgba(255,255,255,0.08)",
              border: `1px solid ${
                pos.toPipeProgress > 0.5 ? `${pipe.color}60` : "rgba(255,255,255,0.15)"
              }`,
              color: pos.toPipeProgress > 0.5 ? pipe.color : "#e0e0e0",
              fontSize: 18,
              fontWeight: 500,
              whiteSpace: "nowrap",
              opacity: pos.appearProgress * hideProgress,
              transform: `scale(${scale})`,
              transformOrigin: "center center",
              boxShadow:
                pos.toPipeProgress > 0.5
                  ? `0 0 12px ${pipe.color}40`
                  : "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            {msg.text}
          </div>
        );
      })}

      {/* ── Left side label ── */}
      <div
        style={{
          position: "absolute",
          left: LEFT_X - 80,
          top: 230,
          fontSize: 22,
          fontWeight: 600,
          color: "rgba(255,255,255,0.5)",
          opacity: interpolate(frame, [40, 60], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        用户消息
      </div>

      {/* ── State transition indicator ── */}
      {frame >= 55 && frame < 160 && (
        <div
          style={{
            position: "absolute",
            left: ROUTER_X - 70,
            top: 625,
            fontSize: 13,
            color: "rgba(255,255,255,0.35)",
            fontFamily: "'SF Mono', monospace",
            textAlign: "center",
            width: 140,
            opacity: interpolate(frame, [55, 65], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {frame < 150 ? "Agent 正在 streaming…" : "Agent 已空闲"}
        </div>
      )}
      {frame >= 145 && frame < 210 && (
        <div
          style={{
            position: "absolute",
            left: ROUTER_X - 70,
            top: 625,
            fontSize: 13,
            color: "rgba(255,255,255,0.35)",
            fontFamily: "'SF Mono', monospace",
            textAlign: "center",
            width: 140,
            opacity: interpolate(frame, [145, 155], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Agent 已空闲
        </div>
      )}

      {/* ── Legend ── */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 40,
          opacity: interpolate(frame, [50, 70], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }) * exitOpacity,
        }}
      >
        {PIPES.map((pipe) => (
          <div
            key={pipe.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: pipe.color,
              }}
            />
            <span
              style={{
                fontSize: 16,
                color: "#999",
              }}
            >
              {pipe.label}: {pipe.sublabel}
            </span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
