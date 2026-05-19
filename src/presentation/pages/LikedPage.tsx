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
  if (h > 0) return `${h} hr ${m} min`;
  return `${m} min`;
};

const PlayingBars = () => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-end",
      gap: "2px",
      height: "14px",
    }}
  >
    <div
      style={{
        width: "3px",
        background: "var(--accent2)",
        borderRadius: "1px",
        animation: "barBounce 0.8s ease-in-out infinite",
        animationDelay: "0s",
        height: "14px",
      }}
    />
    <div
      style={{
        width: "3px",
        background: "var(--accent2)",
        borderRadius: "1px",
        animation: "barBounce 0.8s ease-in-out infinite",
        animationDelay: "0.15s",
        height: "14px",
      }}
    />
    <div
      style={{
        width: "3px",
        background: "var(--accent2)",
        borderRadius: "1px",
        animation: "barBounce 0.8s ease-in-out infinite",
        animationDelay: "0.3s",
        height: "14px",
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

  const getFiltered = () => {
    const q = query.toLowerCase();
    return getSorted().filter(
      (s) =>
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.album || "").toLowerCase().includes(q),
    );
  };

  const filtered = getFiltered();

  const handlePlay = (_song: Song, index: number) => {
    const list = filtered;
    setQueue(list, list[index], "library");
    setCurrentSong(list[index]);
    setProgress(0);
  };

  const handlePlayAll = () => {
    if (filtered.length > 0) handlePlay(filtered[0], 0);
  };

  const handleShuffle = () => {
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    if (pick) handlePlay(pick, filtered.indexOf(pick));
  };

  return (
    <div
      className="song-list-pane"
      style={{ padding: "0", overflowY: "auto", height: "100%" }}
    >
      <style>{`
        @keyframes barBounce {
          0%, 100% { transform: scaleY(0.15); }
          50% { transform: scaleY(1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heartPop {
          0% { transform: scale(1); }
          40% { transform: scale(1.4); }
          70% { transform: scale(0.85); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Hero */}
      <div
        style={{
          padding: "4rem 2rem 3rem",
          borderBottom: "1px solid var(--border)",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "end",
          gap: "2rem",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.2em",
              color: "var(--accent2)",
              textTransform: "uppercase",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "1px",
                background: "var(--accent2)",
              }}
            />
            Your collection
          </div>
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "clamp(3rem, 8vw, 7rem)",
              fontWeight: 800,
              lineHeight: "0.9",
              letterSpacing: "-0.03em",
              color: "var(--text)",
            }}
          >
            Liked
            <br />
            <span style={{ color: "var(--accent2)", fontStyle: "italic" }}>
              Songs
            </span>
          </h1>
        </div>
        <div
          style={{
            textAlign: "right",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <div
            style={{
              fontSize: "4rem",
              fontWeight: 800,
              color: "var(--accent2)",
              lineHeight: 1,
            }}
          >
            {filtered.length}
          </div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.15em",
              color: "var(--text3)",
              textTransform: "uppercase",
            }}
          >
            tracks
          </div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              color: "var(--text3)",
            }}
          >
            {formatTotalDuration(filtered)}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "1.5rem 2rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          onClick={handlePlayAll}
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, var(--accent), var(--accent2))",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.08)";
            e.currentTarget.style.boxShadow = "0 0 30px rgba(192,132,252,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="#fff"
            width="20"
            height="20"
            style={{ marginLeft: "3px" }}
          >
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </button>

        <button
          onClick={handleShuffle}
          style={{
            height: "38px",
            padding: "0 18px",
            borderRadius: "20px",
            background: "transparent",
            border: "1px solid var(--border2)",
            color: "var(--text2)",
            fontFamily: "'Syne', sans-serif",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--surface2)";
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text2)";
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
          </svg>
          Shuffle
        </button>

        <button
          onClick={() => setSortMode((sortMode + 1) % sortModes.length)}
          style={{
            height: "38px",
            padding: "0 18px",
            borderRadius: "20px",
            background: "transparent",
            border: "1px solid var(--border2)",
            color: "var(--text2)",
            fontFamily: "'Syne', sans-serif",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--surface2)";
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text2)";
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
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
            gap: "8px",
          }}
        >
          <div
            style={{
              height: "36px",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "0 12px",
              transition: "border-color 0.2s",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="var(--text3)"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Filter songs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text)",
                fontFamily: "'DM Mono', monospace",
                fontSize: "12px",
                outline: "none",
                width: "160px",
              }}
            />
          </div>
        </div>
      </div>

      {/* Table header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "48px 1fr 200px 80px 80px 48px",
          padding: "0 2rem 0.6rem",
          marginTop: "0.5rem",
        }}
      >
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.15em",
            color: "var(--text3)",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          #
        </div>
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.15em",
            color: "var(--text3)",
            textTransform: "uppercase",
          }}
        >
          Title
        </div>
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.15em",
            color: "var(--text3)",
            textTransform: "uppercase",
          }}
        >
          Album
        </div>
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.15em",
            color: "var(--text3)",
            textTransform: "uppercase",
            textAlign: "right",
          }}
        >
          Source
        </div>
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.15em",
            color: "var(--text3)",
            textTransform: "uppercase",
            textAlign: "right",
          }}
        >
          Time
        </div>
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.15em",
            color: "var(--text3)",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          ♡
        </div>
      </div>

      {/* Song list */}
      <div
        style={{ display: "flex", flexDirection: "column", padding: "0 1rem" }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "6rem 2rem",
              gap: "1rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "rgba(192,132,252,0.08)",
                border: "1px solid rgba(192,132,252,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
              }}
            >
              ♡
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "var(--text)",
              }}
            >
              {query ? "Nothing here" : "No liked songs yet"}
            </div>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "12px",
                color: "var(--text3)",
                letterSpacing: "0.05em",
              }}
            >
              {query
                ? "No songs match your search"
                : "Click the heart on any song to add it here"}
            </div>
          </div>
        ) : (
          filtered.map((song, idx) => {
            const isActive = currentSong?.id === song.id;
            return (
              <div
                key={song.id}
                onClick={() => handlePlay(song, idx)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "48px 1fr 200px 80px 80px 48px",
                  alignItems: "center",
                  padding: "0.55rem 1rem",
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "background 0.12s, border-color 0.12s",
                  position: "relative",
                  border: "1px solid transparent",
                  background: isActive
                    ? "rgba(192,132,252,0.06)"
                    : "transparent",
                  borderColor: isActive
                    ? "rgba(192,132,252,0.15)"
                    : "transparent",
                  animation: `fadeUp 0.4s both`,
                  animationDelay: `${0.18 + idx * 0.03}s`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--surface2)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                  }
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "2px",
                      height: "55%",
                      background: "var(--accent2)",
                      borderRadius: "0 2px 2px 0",
                    }}
                  />
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "12px",
                      color: "var(--text3)",
                      opacity: isActive ? 0 : 1,
                      transition: "opacity 0.15s",
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    style={{
                      position: "absolute",
                      opacity: isActive ? 1 : 0,
                      transition: "opacity 0.15s",
                      color: isActive ? "var(--accent2)" : "var(--text2)",
                    }}
                  >
                    {isActive && isPlaying ? (
                      <PlayingBars />
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="14"
                        height="14"
                      >
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    )}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "8px",
                      background: song.grad || randomGradient(),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      flexShrink: 0,
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
                        fontSize: "14px",
                        fontWeight: 600,
                        color: isActive ? "var(--accent2)" : "var(--text)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {song.title}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text3)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: "2px",
                      }}
                    >
                      {song.artist}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text3)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {song.album || "—"}
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "3px 8px",
                      borderRadius: "20px",
                      border: "1px solid var(--border2)",
                      color: "var(--text2)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {song.source === "youtube" ? "YT" : "Local"}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "12px",
                    color: "var(--text3)",
                    textAlign: "right",
                  }}
                >
                  {song.dur || formatDuration(song.duration || 0)}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(song.id);
                    }}
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform 0.2s, background 0.15s",
                      color: song.liked ? "var(--accent2)" : "var(--text3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.2)";
                      e.currentTarget.style.background =
                        "rgba(192,132,252,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.background = "none";
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
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
          })
        )}
      </div>

      <div style={{ height: "40px" }} />
    </div>
  );
};

export default LikedPage;
