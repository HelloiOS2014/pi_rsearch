import React from "react";

interface VideoEmbedProps {
  title: string;
  description?: string;
  duration?: string;
  compositionId?: string;
}

export const VideoEmbed: React.FC<VideoEmbedProps> = ({
  title,
  description,
  duration,
  compositionId,
}) => {
  return (
    <div
      style={{
        backgroundColor: "#1e1e2e",
        border: "1px solid #2a2a3a",
        borderRadius: 8,
        padding: "48px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        position: "relative",
        overflow: "hidden",
        minHeight: 280,
      }}
      data-composition-id={compositionId}
    >
      {/* Subtle gradient background suggesting video content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(217,119,87,0.08) 0%, transparent 60%), " +
            "linear-gradient(180deg, rgba(30,30,46,0) 0%, rgba(10,10,26,0.4) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Play button */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: "2px solid #D97757",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(217,119,87,0.1)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <span
          style={{
            color: "#D97757",
            fontSize: 28,
            marginLeft: 4,
            lineHeight: 1,
          }}
        >
          &#9654;
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          color: "#e0e0e0",
          fontSize: 18,
          fontWeight: 600,
          fontFamily: "'SF Pro Display', system-ui, sans-serif",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {title}
      </div>

      {/* Description or loading text */}
      <div
        style={{
          color: "rgba(255,255,255,0.45)",
          fontSize: 14,
          fontFamily: "'SF Pro Text', system-ui, sans-serif",
          textAlign: "center",
          maxWidth: 400,
          lineHeight: 1.5,
          position: "relative",
          zIndex: 1,
        }}
      >
        {description || "动画加载中..."}
      </div>

      {/* Duration badge */}
      {duration && (
        <div
          style={{
            color: "rgba(255,255,255,0.35)",
            fontSize: 12,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            backgroundColor: "rgba(255,255,255,0.05)",
            padding: "4px 12px",
            borderRadius: 4,
            position: "relative",
            zIndex: 1,
          }}
        >
          {duration}
        </div>
      )}
    </div>
  );
};

export default VideoEmbed;
