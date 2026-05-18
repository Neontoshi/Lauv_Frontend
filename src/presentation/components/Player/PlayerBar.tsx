import React from "react";
import { usePlayerContext as usePlayer } from "../../hooks/PlayerContext";
import VolumeControl from "./VolumeControl";
import ProgressSlider from "./ProgressSlider";
import Toast from "../Toast";
import { usePlayerStore } from "../../stores/playerStore";

const PlayerBar: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    isShuffle,
    repeatMode,
    togglePlay,
    nextSong,
    prevSong,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();
  const isLoading = usePlayerStore().isLoading;
  if (!currentSong) {
    return (
      <div
        className="player-bar"
        style={{ padding: "8px 20px", minHeight: "64px" }}
      >
        <div
          style={{
            flex: 1,
            textAlign: "center",
            color: "var(--text3)",
            fontSize: "13px",
          }}
        >
          Select a song to start playing
        </div>
        <Toast />
      </div>
    );
  }

  const getRepeatIcon = () => {
    if (repeatMode === 0) {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      );
    } else if (repeatMode === 1) {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: "var(--accent2)" }}
        >
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      );
    } else {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: "var(--accent2)" }}
        >
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
      );
    }
  };

  return (
    <div className="player-bar">
      <div className="player-left">
        <div className="player-song-thumb">
          <div
            className="song-thumb-inner"
            style={{ background: currentSong.grad }}
          >
            {currentSong.emoji}
          </div>
        </div>
        <div className="player-song-info">
          <div className="player-song-title">{currentSong.title}</div>
          <div className="player-song-artist">{currentSong.artist}</div>
        </div>
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button
            className={`player-control-btn ${isShuffle ? "active" : ""}`}
            onClick={toggleShuffle}
            title="Shuffle"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
            </svg>
          </button>

          <button
            className="player-control-btn"
            onClick={prevSong}
            title="Previous"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="19,20 9,12 19,4" />
              <line x1="5" y1="19" x2="5" y2="5" />
            </svg>
          </button>

          <button className="player-play-btn" onClick={togglePlay}>
            {isLoading ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="spinner"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  strokeDasharray="63"
                  strokeDashoffset="21"
                />
              </svg>
            ) : isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          <button
            className="player-control-btn"
            onClick={nextSong}
            title="Next"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="5,4 15,12 5,20" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>

          <button
            className={`player-control-btn ${repeatMode > 0 ? "active" : ""}`}
            onClick={toggleRepeat}
            title={
              repeatMode === 0
                ? "Repeat Off"
                : repeatMode === 1
                  ? "Repeat All"
                  : "Repeat One"
            }
          >
            {getRepeatIcon()}
          </button>
        </div>

        <div className="player-progress">
          <ProgressSlider />
        </div>
      </div>

      <div className="player-right">
        <VolumeControl />
      </div>

      <Toast />
    </div>
  );
};

export default PlayerBar;
