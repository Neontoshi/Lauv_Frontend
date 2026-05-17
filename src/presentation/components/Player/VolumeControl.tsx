import React, { useRef } from "react";
import { usePlayerContext as usePlayer } from "../../hooks/PlayerContext";

const VolumeControl: React.FC = () => {
  const { volume, setVolume, toggleMute } = usePlayer();
  const volumeTrackRef = useRef<HTMLDivElement>(null);

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!volumeTrackRef.current) return;
    const rect = volumeTrackRef.current.getBoundingClientRect();
    const newVolume = Math.min(
      100,
      Math.max(0, Math.round(((e.clientX - rect.left) / rect.width) * 100)),
    );
    setVolume(newVolume);
  };

  const getVolumeIcon = () => {
    if (volume === 0) {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="3" y1="3" x2="21" y2="21" />
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        </svg>
      );
    } else if (volume < 40) {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      );
    } else {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      );
    }
  };

  return (
    <div className="volume-row">
      <div className="vol-icon" onClick={toggleMute}>
        {getVolumeIcon()}
      </div>
      <div
        className="vol-track"
        ref={volumeTrackRef}
        onClick={handleVolumeChange}
      >
        <div className="vol-fill" style={{ width: `${volume}%` }}></div>
      </div>
      <span
        style={{
          fontSize: "10px",
          fontFamily: "'DM Mono', monospace",
          color: "var(--text3)",
          minWidth: "20px",
        }}
      >
        {volume}
      </span>
    </div>
  );
};

export default VolumeControl;
