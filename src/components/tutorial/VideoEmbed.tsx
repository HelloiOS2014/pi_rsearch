import React, { useState, useRef } from "react";

interface VideoEmbedProps {
  title: string;
  description?: string;
  duration?: string;
  compositionId?: string;
  src?: string;
}

export const VideoEmbed: React.FC<VideoEmbedProps> = ({
  title,
  description,
  duration,
  compositionId,
  src,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Determine video source: explicit src > compositionId-based path
  const videoSrc = src || (compositionId ? `/videos/${compositionId}.mp4` : null);

  // If we have a video source and no error, show the real player
  if (videoSrc && !hasError) {
    return (
      <div
        style={{
          backgroundColor: "#1e1e2e",
          border: "1px solid #2a2a3a",
          borderRadius: 8,
          overflow: "hidden",
          margin: "1.5rem 0",
        }}
      >
        {/* Title bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px",
            backgroundColor: "rgba(255,255,255,0.03)",
            borderBottom: "1px solid #2a2a3a",
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 13,
              fontFamily: "'SF Mono', 'Fira Code', monospace",
            }}
          >
            {title}
          </span>
          {duration && (
            <span
              style={{
                color: "rgba(255,255,255,0.3)",
                fontSize: 12,
                fontFamily: "'SF Mono', monospace",
              }}
            >
              {duration}
            </span>
          )}
        </div>

        {/* Video — autoplay muted loop, behaves like an animated diagram */}
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onError={() => setHasError(true)}
          onLoadedMetadata={() => setIsLoaded(true)}
          style={{
            width: "100%",
            display: "block",
            backgroundColor: "#0a0a1a",
            opacity: isLoaded ? 1 : 0.5,
            transition: "opacity 0.3s ease",
          }}
        />
      </div>
    );
  }

  // Fallback: placeholder UI (no video source or video failed to load)
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
        minHeight: 200,
        margin: "1.5rem 0",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(217,119,87,0.08) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          width: 48,
          height: 48,
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
        <span style={{ color: "#D97757", fontSize: 22, marginLeft: 3 }}>
          &#9654;
        </span>
      </div>
      <div
        style={{
          color: "#e0e0e0",
          fontSize: 16,
          fontWeight: 600,
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 13,
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {hasError
          ? "视频加载失败 — 请运行 npm run render-videos 生成视频文件"
          : description || "视频未生成 — 运行 npm run render-videos"}
      </div>
    </div>
  );
};

export default VideoEmbed;
