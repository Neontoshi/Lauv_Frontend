import React, { useRef } from "react";
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

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressTrackRef.current || duration <= 0) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.min(1, Math.max(0, clickX / rect.width));
    const newTime = percent * duration;
    setProgress(newTime);
  };

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

  const progressPercent = duration > 0 ? (currentProgress / duration) * 100 : 0;
  const currentTime = currentProgress;
  const totalTime = duration;

  return (
    <div className="progress-wrap">
      <div
        className="progress-track"
        ref={progressTrackRef}
        onClick={handleProgressClick}
      >
        <div className="progress-fill" style={{ width: `${progressPercent}%` }}>
          <div className="progress-thumb"></div>
        </div>
      </div>

      <div className="progress-times">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(totalTime)}</span>
      </div>
    </div>
  );
};

export default ProgressSlider;
