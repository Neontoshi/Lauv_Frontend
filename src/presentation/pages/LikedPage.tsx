import React, { useMemo, useState } from "react";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { Song } from "../../core/entities/Song";

const randomGradient = () => {
  const hues = [280, 200, 340, 40, 160, 100, 10, 260];
  const h = hues[Math.floor(Math.random() * hues.length)];
  return `linear-gradient(135deg, hsl(${h}, 40%, 20%), hsl(${h + 30}, 40%, 12%))`;
};

const formatDuration = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const formatTotalDuration = (songs: Song[]) => {
  const total = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
};

const PlayingBars = () => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 14 }}>
    <div
      style={{
        width: 3,
        background: "var(--accent2)",
        borderRadius: 1,
        animation: "barBounce 0.8s ease-in-out infinite",
        height: 14,
      }}
    />
    <div
      style={{
        width: 3,
        background: "var(--accent2)",
        borderRadius: 1,
        animation: "barBounce 0.8s ease-in-out infinite",
        animationDelay: "0.15s",
        height: 14,
      }}
    />
    <div
      style={{
        width: 3,
        background: "var(--accent2)",
        borderRadius: 1,
        animation: "barBounce 0.8s ease-in-out infinite",
        animationDelay: "0.3s",
        height: 14,
      }}
    />
  </div>
);

const LikedPage: React.FC = () => {
  const { songs, toggleLike } = useLibraryStore();
  const { currentSong, setCurrentSong, setProgress, isPlaying } =
    usePlayerStore();
  const { setQueue } = useQueueStore();
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState(0);
  const sortModes = ["Recently Added", "Title A–Z", "Artist A–Z", "Duration"];

  const likedSongs = useMemo(() => songs.filter((s) => s.liked), [songs]);

  const getSorted = () => {
    let list = [...likedSongs];
    if (sortMode === 1) list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortMode === 2)
      list.sort((a, b) => a.artist.localeCompare(b.artist));
    else if (sortMode === 3)
      list.sort((a, b) => (a.duration || 0) - (b.duration || 0));
    return list;
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return getSorted().filter(
      (s) =>
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.album || "").toLowerCase().includes(q),
    );
  }, [likedSongs, query, sortMode]);

  const handlePlay = (_song: Song, index: number) => {
    setQueue(filtered, filtered[index], "library");
    setCurrentSong(filtered[index]);
    setProgress(0);
  };

  const handlePlayAll = () => {
    if (filtered.length > 0) handlePlay(filtered[0], 0);
  };

  return (
    <div className="ap-page">
      <div className="ap-container" style={{ paddingBottom: "6rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            paddingTop: "1.5rem",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              className="ap-page-eyebrow"
              style={{ color: "var(--accent2)" }}
            >
              Your Collection
            </div>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1,
                margin: 0,
              }}
            >
              Liked{" "}
              <span style={{ color: "var(--accent2)", fontStyle: "italic" }}>
                Songs
              </span>
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "var(--accent2)",
                  lineHeight: 1,
                }}
              >
                {filtered.length}
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 9,
                  color: "var(--text3)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                tracks
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--text2)",
                  lineHeight: 1,
                }}
              >
                {formatTotalDuration(filtered)}
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 9,
                  color: "var(--text3)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                duration
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: "1.25rem",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handlePlayAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 22px",
              background:
                "linear-gradient(135deg, var(--accent), var(--accent2))",
              border: "none",
              borderRadius: 99,
              color: "#fff",
              fontFamily: "'Syne',sans-serif",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            Play All
          </button>
          <button
            onClick={() => setSortMode((sortMode + 1) % sortModes.length)}
            style={{
              padding: "9px 18px",
              borderRadius: 99,
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text2)",
              fontFamily: "'Syne',sans-serif",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            {sortModes[sortMode]}
          </button>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "0 12px",
              height: 36,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="var(--text3)"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Filter..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text)",
                fontFamily: "'DM Mono',monospace",
                fontSize: 11,
                outline: "none",
                width: 140,
              }}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(192,132,252,0.08)",
                border: "1px solid rgba(192,132,252,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              ♡
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>
              {query ? "Nothing found" : "No liked songs yet"}
            </div>
            <div
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 11,
                color: "var(--text3)",
              }}
            >
              {query
                ? "No songs match your search"
                : "Click the heart on any song"}
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr 140px 60px 70px 48px",
                gap: 12,
                padding: "0 12px 8px",
                borderBottom: "1px solid var(--border)",
                marginBottom: 4,
                fontFamily: "'DM Mono',monospace",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text3)",
              }}
            >
              <span style={{ textAlign: "center" }}>#</span>
              <span>Title</span>
              <span>Album</span>
              <span>Source</span>
              <span style={{ textAlign: "right" }}>Time</span>
              <span style={{ textAlign: "center" }}>♡</span>
            </div>
            {filtered.map((song, idx) => {
              const isActive = currentSong?.id === song.id;
              return (
                <div
                  key={song.id}
                  onClick={() => handlePlay(song, idx)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1fr 140px 60px 70px 48px",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    border: "1px solid transparent",
                    background: isActive
                      ? "rgba(192,132,252,0.06)"
                      : "transparent",
                    borderColor: isActive
                      ? "rgba(192,132,252,0.15)"
                      : "transparent",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "var(--surface2)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 12,
                      color: "var(--text3)",
                      textAlign: "center",
                    }}
                  >
                    {isActive && isPlaying ? <PlayingBars /> : idx + 1}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        background: song.grad || randomGradient(),
                        overflow: "hidden",
                      }}
                    >
                      {song.artwork ? (
                        <img
                          src={song.artwork}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : song.videoId ? (
                        <img
                          src={`https://i.ytimg.com/vi/${song.videoId}/default.jpg`}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        song.emoji || "🎵"
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          color: isActive ? "var(--accent2)" : "var(--text)",
                        }}
                      >
                        {song.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text2)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          marginTop: 1,
                        }}
                      >
                        {song.artist}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text3)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {song.album || "—"}
                  </div>
                  <div>
                    <span
                      style={{
                        fontFamily: "'DM Mono',monospace",
                        fontSize: 8,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        padding: "2px 7px",
                        borderRadius: 99,
                        border: "1px solid var(--border)",
                        color: "var(--text2)",
                      }}
                    >
                      {song.source === "youtube" ? "YT" : "Local"}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 11,
                      color: "var(--text3)",
                      textAlign: "right",
                    }}
                  >
                    {song.dur || formatDuration(song.duration || 0)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(song.id);
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        border: "none",
                        background: "none",
                        color: song.liked ? "var(--accent2)" : "var(--text3)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill={song.liked ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LikedPage;
