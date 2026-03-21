import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

const ACCENT = "#D97757";

export const WhatIsAgent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Shared ---
  const bgOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [200, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Divider line grows (10-30)
  const dividerHeight = interpolate(frame, [10, 30], [0, 400], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Left side: ChatBot (linear flow) ---
  const chatbotLabelProgress = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14, stiffness: 180 },
  });

  // Linear flow items appear sequentially
  const leftItems = ["输入", "LLM", "输出"];
  const leftItemOpacities = leftItems.map((_, i) => {
    const delay = 30 + i * 20;
    return interpolate(frame, [delay, delay + 15], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });
  const leftArrowOpacities = leftItems.slice(0, -1).map((_, i) => {
    const delay = 40 + i * 20;
    return interpolate(frame, [delay, delay + 10], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });

  // --- Right side: Agent (circular flow) ---
  const agentLabelProgress = spring({
    frame: frame - 20,
    fps,
    config: { damping: 14, stiffness: 180 },
  });

  // Input appears
  const rightInputOpacity = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Loop items
  const loopItems = ["思考", "行动", "观察"];
  const loopOpacities = loopItems.map((_, i) => {
    const delay = 70 + i * 18;
    return spring({
      frame: frame - delay,
      fps,
      config: { damping: 12, stiffness: 150 },
    });
  });

  // Loop arrows between items
  const loopArrowOpacities = loopItems.map((_, i) => {
    const delay = 78 + i * 18;
    return interpolate(frame, [delay, delay + 10], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });

  // Output appears
  const rightOutputOpacity = interpolate(frame, [130, 145], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Loop glow pulse (after frame 120)
  const glowPulse = frame > 120
    ? interpolate(Math.sin((frame - 120) * 0.1), [-1, 1], [0.2, 0.8])
    : 0;

  const boxStyle = (color: string): React.CSSProperties => ({
    padding: "12px 24px",
    borderRadius: 8,
    border: `1px solid ${color}`,
    backgroundColor: `${color}15`,
    color: "#e0e0e0",
    fontSize: 24,
    fontWeight: 600,
    fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
    textAlign: "center",
    minWidth: 80,
  });

  const arrowStyle: React.CSSProperties = {
    color: "rgba(255,255,255,0.4)",
    fontSize: 28,
    fontWeight: 300,
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
        {/* Left side: ChatBot */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            padding: 40,
          }}
        >
          {/* Label */}
          <div
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: "#6e8efb",
              opacity: chatbotLabelProgress,
              fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
              marginBottom: 40,
            }}
          >
            ChatBot
          </div>

          {/* Linear flow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {leftItems.map((item, i) => (
              <React.Fragment key={item}>
                <div style={{ ...boxStyle("#6e8efb"), opacity: leftItemOpacities[i] }}>
                  {item}
                </div>
                {i < leftItems.length - 1 && (
                  <div style={{ ...arrowStyle, opacity: leftArrowOpacities[i] }}>
                    →
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Center divider */}
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

        {/* Right side: Agent */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            padding: 40,
          }}
        >
          {/* Label */}
          <div
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: ACCENT,
              opacity: agentLabelProgress,
              fontFamily: "'SF Pro Display', Helvetica, Arial, sans-serif",
              marginBottom: 20,
            }}
          >
            Agent
          </div>

          {/* Input */}
          <div style={{ opacity: rightInputOpacity, marginBottom: 12 }}>
            <div style={boxStyle(ACCENT)}>输入</div>
          </div>

          <div style={{ ...arrowStyle, opacity: rightInputOpacity }}>↓</div>

          {/* Loop container */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 24px",
              borderRadius: 16,
              border: `2px solid ${ACCENT}40`,
              backgroundColor: `rgba(217,119,87,${0.03 + glowPulse * 0.05})`,
              boxShadow: `0 0 ${20 + glowPulse * 30}px rgba(217,119,87,${glowPulse * 0.3})`,
              position: "relative",
            }}
          >
            {/* Loop bracket label */}
            <div
              style={{
                position: "absolute",
                top: -14,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 13,
                color: "rgba(217,119,87,0.6)",
                fontFamily: "'SF Mono', monospace",
                backgroundColor: "#0a0a1a",
                padding: "0 8px",
                opacity: loopOpacities[2],
              }}
            >
              [ ]*  循环
            </div>

            {loopItems.map((item, i) => (
              <React.Fragment key={item}>
                <div
                  style={{
                    ...boxStyle(ACCENT),
                    opacity: loopOpacities[i],
                    transform: `scale(${interpolate(loopOpacities[i], [0, 1], [0.8, 1])})`,
                  }}
                >
                  {item}
                </div>
                {i < loopItems.length - 1 && (
                  <div style={{ ...arrowStyle, opacity: loopArrowOpacities[i] }}>
                    →
                  </div>
                )}
              </React.Fragment>
            ))}

            {/* Loop-back arrow */}
            <div
              style={{
                position: "absolute",
                bottom: -20,
                left: "30%",
                right: "30%",
                height: 20,
                borderBottom: `2px solid ${ACCENT}60`,
                borderLeft: `2px solid ${ACCENT}60`,
                borderRight: `2px solid ${ACCENT}60`,
                borderRadius: "0 0 10px 10px",
                opacity: loopArrowOpacities[2],
              }}
            />
          </div>

          <div style={{ ...arrowStyle, opacity: rightOutputOpacity, marginTop: 12 }}>
            ↓
          </div>

          {/* Output */}
          <div style={{ opacity: rightOutputOpacity }}>
            <div style={boxStyle(ACCENT)}>输出</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
