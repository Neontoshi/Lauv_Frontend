import React, { useRef, useCallback, useState, useEffect } from "react";
import { usePlayerContext as usePlayer } from "../../hooks/PlayerContext";
import { formatTime } from "../../../lib/formatTime";
import { usePlayerStore } from "../../stores/playerStore";

const ProgressSlider: React.FC = () => {
  const { setProgress } = usePlayer();
  const currentProgress = usePlayerStore((s) => s.currentProgress);
  const duration = usePlayerStore((s) => s.duration);
  const isRadio = usePlayerStore((s) => {
    const song = s.currentSong;
    if (!song) return false;
    return (
      song.id?.startsWith("radio-") ||
      (song.path?.startsWith("http") && !song.videoId)
    );
  });
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [displayPercent, setDisplayPercent] = useState(0);
  const ignoreStoreUntil = useRef(0);

  // Sync from store only when not dragging and past grace period
  useEffect(() => {
    if (isDragging.current) return;
    if (Date.now() < ignoreStoreUntil.current) return;
    if (duration > 0) {
      setDisplayPercent((currentProgress / duration) * 100);
    }
  }, [currentProgress, duration]);

  const getPercentFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent): number => {
      if (!progressTrackRef.current || duration <= 0) return -1;
      const rect = progressTrackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      return Math.min(1, Math.max(0, x / rect.width));
    },
    [duration],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      ignoreStoreUntil.current = Date.now() + 2000; // ignore store updates for 2s
      const percent = getPercentFromEvent(e);
      if (percent >= 0) {
        setDisplayPercent(percent * 100);
        setProgress(percent * duration);
      }

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const percent = getPercentFromEvent(e);
        if (percent >= 0) {
          setDisplayPercent(percent * 100);
          setProgress(percent * duration);
        }
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        ignoreStoreUntil.current = Date.now() + 1500;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [getPercentFromEvent, duration, setProgress],
  );

  if (isRadio) {
    return (
      <div className="progress-wrap">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "4px",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              color: "var(--accent)",
              letterSpacing: "0.1em",
              animation: "livePulse 1.5s ease-in-out infinite",
            }}
          >
            ● LIVE
          </span>
        </div>
        <div className="progress-times">
          <span>Live</span>
          <span>∞</span>
        </div>
        <style>{`@keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
    );
  }

  const displayTime = duration > 0 ? (displayPercent / 100) * duration : 0;

  return (
    <div className="progress-wrap">
      <div
        className="progress-track"
        ref={progressTrackRef}
        onMouseDown={handleMouseDown}
        style={{ cursor: "pointer" }}
      >
        <div className="progress-fill" style={{ width: `${displayPercent}%` }}>
          <div className="progress-thumb" />
        </div>
      </div>

      <div className="progress-times">
        <span>{formatTime(displayTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default ProgressSlider;
