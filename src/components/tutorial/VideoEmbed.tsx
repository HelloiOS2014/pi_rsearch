import React, { useState, useRef, useEffect, useCallback } from "react";

interface VideoEmbedProps {
  title: string;
  description?: string;
  duration?: string;
  compositionId?: string;
  src?: string;
}

function getBaseUrl(): string {
  if (typeof document === "undefined") return "";
  const meta = document.querySelector('meta[name="base-url"]');
  const base = meta?.getAttribute("content") || "/";
  return base.replace(/\/$/, "");
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
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build video source with base URL prefix
  const base = typeof document !== "undefined" ? getBaseUrl() : "";
  const videoSrc = src || (compositionId ? `${base}/videos/${compositionId}.mp4` : null);

  // Fix React muted attribute bug + IntersectionObserver for mobile autoplay
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Force muted attribute (React bug workaround)
    video.muted = true;

    // IntersectionObserver: play when visible, pause when not
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {
              // Autoplay blocked — show controls for manual play
              setNeedsManualPlay(true);
            });
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [videoSrc]);

  const handleManualPlay = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.play();
      setNeedsManualPlay(false);
    }
  }, []);

  if (videoSrc && !hasError) {
    return (
      <div
        ref={containerRef}
        style={{
          backgroundColor: "#1e1e2e",
          border: "1px solid #2a2a3a",
          borderRadius: 8,
          overflow: "hidden",
          margin: "1.5rem 0",
          position: "relative",
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

        {/* Video */}
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          controls={needsManualPlay}
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

        {/* Manual play overlay (shown when autoplay is blocked) */}
        {needsManualPlay && !isLoaded && (
          <div
            onClick={handleManualPlay}
            style={{
              position: "absolute",
              inset: 0,
              top: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              backgroundColor: "rgba(0,0,0,0.4)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                backgroundColor: "rgba(217,119,87,0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "#fff", fontSize: 24, marginLeft: 3 }}>
                &#9654;
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback placeholder
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
