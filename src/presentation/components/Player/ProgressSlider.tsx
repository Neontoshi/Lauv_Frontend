import React, { useRef } from "react";
import { usePlayerContext as usePlayer } from "../../hooks/PlayerContext";
import { formatTime } from "../../../lib/formatTime";
import { usePlayerStore } from "../../stores/playerStore";

const ProgressSlider: React.FC = () => {
  const { currentProgress, setProgress } = usePlayer();
  const duration = usePlayerStore((s) => s.duration);
  const progressTrackRef = useRef<HTMLDivElement>(null);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressTrackRef.current || duration <= 0) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.min(1, Math.max(0, clickX / rect.width));
    const newTime = percent * duration;
    setProgress(newTime); // Send seconds to backend
  };

  const progressPercent = duration > 0 ? (currentProgress / duration) * 100 : 0;
  const currentTime = currentProgress; // already seconds
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
