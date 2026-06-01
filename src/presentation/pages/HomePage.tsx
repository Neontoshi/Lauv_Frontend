import React, { useMemo, useEffect, useState } from "react";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { Song } from "../../core/entities/Song";
import { tauriCommands } from "../../services/tauriBridge";
import { useNavigate } from "react-router-dom";
import { useLibrary } from "../hooks/useLibrary";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function totalListeningHours(songs: Song[]): number {
  return Math.floor(
    songs.reduce((acc, s) => acc + (s.duration ?? 0) * (s.plays ?? 0), 0) /
      3600,
  );
}

function topArtist(songs: Song[]): string {
  const counts: Record<string, number> = {};
  for (const s of songs) {
    counts[s.artist] = (counts[s.artist] ?? 0) + (s.plays ?? 0);
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

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
        background: "var(--accent)",
        borderRadius: "1px",
        animation: "barBounce 0.8s ease-in-out infinite",
        animationDelay: "0s",
        height: "14px",
      }}
    />
    <div
      style={{
        width: "3px",
        background: "var(--accent)",
        borderRadius: "1px",
        animation: "barBounce 0.8s ease-in-out infinite",
        animationDelay: "0.15s",
        height: "14px",
      }}
    />
    <div
      style={{
        width: "3px",
        background: "var(--accent)",
        borderRadius: "1px",
        animation: "barBounce 0.8s ease-in-out infinite",
        animationDelay: "0.3s",
        height: "14px",
      }}
    />
  </div>
);

const SongArt: React.FC<{
  song?: Song;
  artwork?: string;
  emoji?: string;
  grad?: string;
  videoId?: string;
  size?: number;
}> = ({ song, artwork, emoji, grad, videoId, size = 48 }) => {
  const art = artwork || song?.artwork;
  const em = emoji || song?.emoji || "🎵";
  const gr = grad || song?.grad || "linear-gradient(135deg, #7c6af5, #4a3fd4)";
  const vid = videoId || song?.videoId;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: gr,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {art ? (
        <img
          src={art}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            inset: 0,
          }}
        />
      ) : vid ? (
        <img
          src={`https://i.ytimg.com/vi/${vid}/default.jpg`}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            inset: 0,
          }}
          onError={(e) =>
            ((e.target as HTMLImageElement).style.display = "none")
          }
        />
      ) : (
        <span>{em}</span>
      )}
    </div>
  );
};

const FeatureCard: React.FC<{
  icon: string;
  label: string;
  title: string;
  count: string;
  colorClass: string;
  onClick: () => void;
}> = ({ icon, label, title, count, colorClass, onClick }) => (
  <div
    onClick={onClick}
    style={{
      borderRadius: "14px",
      padding: "24px",
      border: "1px solid var(--border2)",
      background: "var(--surface)",
      cursor: "pointer",
      transition: "all 0.2s",
      position: "relative",
      overflow: "hidden",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "var(--surface2)";
      e.currentTarget.style.borderColor = "var(--border2)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "var(--surface)";
      e.currentTarget.style.borderColor = "var(--border2)";
    }}
  >
    <div
      style={{
        position: "absolute",
        top: "-40px",
        right: "-40px",
        width: "160px",
        height: "160px",
        borderRadius: "50%",
        background:
          colorClass === "accent"
            ? "var(--accent)"
            : colorClass === "green"
              ? "var(--accent2)"
              : colorClass === "red"
                ? "#ff3366"
                : "#ff6b35",
        opacity: 0.08,
        transition: "opacity 0.2s",
      }}
    />
    <span
      style={{ fontSize: "2.5rem", marginBottom: "14px", display: "block" }}
    >
      {icon}
    </span>
    <div
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "10px",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        marginBottom: "6px",
        color:
          colorClass === "accent"
            ? "var(--accent)"
            : colorClass === "green"
              ? "var(--accent2)"
              : colorClass === "red"
                ? "#ff3366"
                : "#ff6b35",
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: "1.8rem",
        fontWeight: 800,
        letterSpacing: "-0.02em",
        color: "var(--text)",
        lineHeight: 1,
        fontFamily: "'Syne', sans-serif",
      }}
    >
      {title}
    </div>
    <div
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "11px",
        color: "var(--text3)",
        marginTop: "6px",
      }}
    >
      {count}
    </div>
    <div
      style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        color: "var(--text3)",
        transition: "all 0.2s",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        height="18"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    </div>
  </div>
);

const HomePage: React.FC = () => {
  const { songs } = useLibraryStore();
  const { loading } = useLibrary();
  const { currentSong, setCurrentSong, setProgress, isPlaying } =
    usePlayerStore();

  const playSong = (song: Song) => {
    setCurrentSong(song);
    setProgress(0);
  };

  const topPlayed = useMemo(
    () =>
      [...songs]
        .filter((s) => (s.plays ?? 0) > 0)
        .sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0))
        .slice(0, 8),
    [songs],
  );

  const recentlyAdded = useMemo(() => songs.slice(0, 8), [songs]);
  const quickPicks = useMemo(() => shuffle(songs).slice(0, 6), [songs]);
  const likedSongsPreview = useMemo(
    () => songs.filter((s) => s.liked).slice(0, 12),
    [songs],
  );

  const [topArtists, setTopArtists] = useState<
    { name: string; plays: number }[]
  >([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    tauriCommands.getSetting("listenbrainz_user").then((user) => {
      if (user) {
        tauriCommands
          .fetchListenbrainzStats(user)
          .then((json) => {
            const data = JSON.parse(json);
            const artists =
              data.payload?.artists?.map((a: any) => ({
                name: a.artist_name,
                plays: a.listen_count,
              })) || [];
            setTopArtists(artists);
          })
          .catch(() => {});
      }
    });
  }, [songs]);

  useEffect(() => {
    tauriCommands
      .getRecentlyPlayed(7)
      .then((data) => {
        setRecentlyPlayed((data as any[]) || []);
      })
      .catch(() => {});
  }, [songs]);

  const stats = useMemo(() => {
    const localOnly = songs.filter((s) => s.source !== "youtube");
    return {
      total: localOnly.length,
      hours: totalListeningHours(localOnly),
      artist: topArtist(localOnly),
      liked: songs.filter((s) => s.liked).length,
    };
  }, [songs]);
  const greeting = getGreeting();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <div style={{ color: "var(--text2)" }}>Loading your library...</div>
      </div>
    );
  }
  if (songs.length === 0) {
    return (
      <div
        className="song-list-pane"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
          height: "100%",
        }}
      >
        <div style={{ fontSize: 48 }}>🎵</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          Your library is empty
        </div>
        <div style={{ fontSize: 13, color: "var(--text3)" }}>
          Scan a folder from the Library tab to get started
        </div>
      </div>
    );
  }

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
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{ maxWidth: "1040px", margin: "0 auto", padding: "0 2rem 8rem" }}
      >
        {/* Greeting */}
        <div
          style={{
            padding: "3.5rem 0 2.5rem",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "end",
            gap: "2rem",
            borderBottom: "1px solid var(--border)",
            marginBottom: "3rem",
            position: "relative",
          }}
        >
          <div style={{ position: "relative" }}>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.2em",
                color: "var(--accent)",
                textTransform: "uppercase",
                marginBottom: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "1px",
                  background: "var(--accent)",
                }}
              />
              {greeting}
            </div>
            <h1
              style={{
                fontSize: "clamp(3rem, 7vw, 6rem)",
                fontWeight: 800,
                lineHeight: "0.9",
                letterSpacing: "-0.02em",
                color: "var(--text)",
                fontFamily: "'Syne', sans-serif",
              }}
            >
              Good
              <br />
              <span style={{ color: "var(--accent2)" }}>Listening</span>
            </h1>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "12px",
                color: "var(--text3)",
                marginTop: "0.9rem",
                letterSpacing: "0.05em",
              }}
            ></div>
          </div>
          <div
            style={{
              display: "flex",
              gap: "1px",
              borderRadius: "12px",
              overflow: "hidden",
              border: "1px solid var(--border2)",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                textAlign: "center",
                background: "var(--surface)",
                borderRight: "1px solid var(--border)",
                minWidth: "90px",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "var(--accent)",
                  lineHeight: 1,
                }}
              >
                {stats.total}
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--text3)",
                  marginTop: "3px",
                }}
              >
                Songs
              </div>
            </div>
            <div
              style={{
                padding: "14px 20px",
                textAlign: "center",
                background: "var(--surface)",
                borderRight: "1px solid var(--border)",
                minWidth: "90px",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "var(--accent2)",
                  lineHeight: 1,
                }}
              >
                {stats.hours}h
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--text3)",
                  marginTop: "3px",
                }}
              >
                Listened
              </div>
            </div>
            <div
              style={{
                padding: "14px 20px",
                textAlign: "center",
                background: "var(--surface)",
                borderRight: "1px solid var(--border)",
                minWidth: "90px",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "#ff3366",
                  lineHeight: 1,
                }}
              >
                {stats.liked}
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--text3)",
                  marginTop: "3px",
                }}
              >
                Liked
              </div>
            </div>
          </div>
        </div>

        {/* Feature Band */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginBottom: "3rem",
          }}
        >
          <FeatureCard
            icon="♡"
            label="Collection"
            title="Liked Songs"
            count={`${stats.liked} tracks you love`}
            colorClass="red"
            onClick={() => navigate("/liked")}
          />
          <FeatureCard
            icon="✦"
            label="Fresh"
            title="Recently Added"
            count={`${recentlyAdded.length} new in library`}
            colorClass="green"
            onClick={() => {}}
          />
          <FeatureCard
            icon="▲"
            label="Charts"
            title="Most Played"
            count="Your all-time top tracks"
            colorClass="accent"
            onClick={() => {}}
          />
          <FeatureCard
            icon="◉"
            label="Discover"
            title="Radio"
            count="Infinite similar music"
            colorClass="orange"
            onClick={() => navigate("/radio")}
          />
        </div>

        {/* Quick Picks */}
        <div style={{ marginBottom: "3rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: "1.2rem",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "var(--text)",
                }}
              >
                Quick Picks
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  color: "var(--text3)",
                  letterSpacing: "0.1em",
                  marginLeft: "10px",
                }}
              >
                shuffled for you
              </span>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "12px",
            }}
          >
            {quickPicks.map((s) => (
              <div
                key={s.id}
                onClick={() => playSong(s)}
                style={{
                  cursor: "pointer",
                  transition: "transform 0.2s",
                  position: "relative",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-4px)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2.2rem",
                    position: "relative",
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    background: s.grad,
                  }}
                >
                  {s.artwork ? (
                    <img
                      src={s.artwork}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        position: "absolute",
                        inset: 0,
                      }}
                    />
                  ) : s.videoId ? (
                    <img
                      src={`https://i.ytimg.com/vi/${s.videoId}/hqdefault.jpg`}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        position: "absolute",
                        inset: 0,
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: "2.2rem" }}>{s.emoji}</span>
                  )}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background 0.2s",
                      borderRadius: "10px",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(0,0,0,0.5)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "rgba(0,0,0,0)")
                    }
                  >
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "50%",
                        background:
                          currentSong?.id === s.id
                            ? "var(--accent2)"
                            : "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: currentSong?.id === s.id ? 1 : 0,
                        transform:
                          currentSong?.id === s.id ? "scale(1)" : "scale(0.8)",
                        transition: "all 0.2s",
                      }}
                    >
                      {currentSong?.id === s.id && isPlaying ? (
                        <PlayingBars />
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          fill="#0a0a0f"
                          width="14"
                          height="14"
                        >
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    marginTop: "8px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color:
                      currentSong?.id === s.id
                        ? "var(--accent)"
                        : "var(--text)",
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text3)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginTop: "2px",
                  }}
                >
                  {s.artist}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Played */}
        {topPlayed.length > 0 && (
          <div style={{ marginBottom: "3rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: "1.2rem",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: "var(--text)",
                  }}
                >
                  Most Played
                </span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    color: "var(--text3)",
                    letterSpacing: "0.1em",
                    marginLeft: "10px",
                  }}
                >
                  all-time favourites
                </span>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px",
              }}
            >
              {topPlayed.map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => playSong(s)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 40px 1fr auto",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "background 0.12s",
                    border: "1px solid transparent",
                    background:
                      currentSong?.id === s.id
                        ? "rgba(124,106,245,0.07)"
                        : "transparent",
                    borderColor:
                      currentSong?.id === s.id
                        ? "rgba(124,106,245,0.2)"
                        : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (currentSong?.id !== s.id)
                      e.currentTarget.style.background = "var(--surface2)";
                  }}
                  onMouseLeave={(e) => {
                    if (currentSong?.id !== s.id)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "11px",
                      color:
                        currentSong?.id === s.id
                          ? "var(--accent)"
                          : "var(--text3)",
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <SongArt song={s} size={40} />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color:
                          currentSong?.id === s.id
                            ? "var(--accent2)"
                            : "var(--text)",
                      }}
                    >
                      {s.title}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text3)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: "2px",
                      }}
                    >
                      {s.artist}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "3px",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "11px",
                        color: "var(--text3)",
                      }}
                    >
                      {s.dur}
                    </span>
                    {(s.plays ?? 0) > 0 && (
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "9px",
                          color: "var(--accent)",
                          background: "rgba(124,106,245,0.1)",
                          border: "1px solid rgba(124,106,245,0.2)",
                          padding: "2px 6px",
                          borderRadius: "20px",
                        }}
                      >
                        {s.plays} plays
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recently Played Timeline */}
        {recentlyPlayed.length > 0 && (
          <div style={{ marginBottom: "3rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: "1.2rem",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: "var(--text)",
                  }}
                >
                  Recently Played
                </span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    color: "var(--text3)",
                    letterSpacing: "0.1em",
                    marginLeft: "10px",
                  }}
                >
                  listening history
                </span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {recentlyPlayed.map((entry, i) => {
                const timeAgo = i === 0 ? "Just now" : `${i * 15} min ago`;
                return (
                  <div
                    key={entry.id}
                    onClick={() => {
                      const song: Song = {
                        id: entry.track_id,
                        title: entry.title,
                        artist: entry.artist,
                        album: entry.album,
                        duration: entry.duration_secs,
                        genre: null,
                        year: null,
                        track_number: null,
                        artwork: entry.thumbnail || null,
                        source: entry.source as any,
                        path: entry.path || "",
                        videoId: entry.video_id || undefined,
                        dur: "",
                        emoji: "🎵",
                        grad: "linear-gradient(135deg, #7c6af5, #4a3fd4)",
                        bpm: 0,
                        key: "—",
                        plays: 0,
                        liked: false,
                      };
                      playSong(song);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "10px 0",
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      transition: "padding-left 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.paddingLeft = "6px")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.paddingLeft = "0")
                    }
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background:
                          i === 0 ? "var(--accent)" : "var(--surface3)",
                        border:
                          i === 0
                            ? "1px solid var(--accent)"
                            : "1px solid var(--border2)",
                        flexShrink: 0,
                      }}
                    />
                    <SongArt
                      artwork={entry.thumbnail}
                      emoji="🎵"
                      grad="linear-gradient(135deg, #7c6af5, #4a3fd4)"
                      videoId={entry.video_id}
                      size={38}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 600 }}>
                        {entry.title}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--text3)",
                          marginTop: "2px",
                        }}
                      >
                        {entry.artist}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        color: "var(--text3)",
                        flexShrink: 0,
                        marginLeft: "auto",
                      }}
                    >
                      {timeAgo}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Artists */}
        {topArtists.length > 0 && (
          <div style={{ marginBottom: "3rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: "1.2rem",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: "var(--text)",
                  }}
                >
                  Top Artists
                </span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    color: "var(--text3)",
                    letterSpacing: "0.1em",
                    marginLeft: "10px",
                  }}
                >
                  this week
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {topArtists.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 14px 8px 8px",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "40px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "var(--surface3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      flexShrink: 0,
                    }}
                  >
                    🎤
                  </div>
                  <span>{a.name}</span>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      color: "var(--text3)",
                      marginLeft: "2px",
                    }}
                  >
                    {a.plays} plays
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Liked Songs Preview */}
        {likedSongsPreview.length > 0 && (
          <div style={{ marginBottom: "3rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: "1.2rem",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: "var(--text)",
                  }}
                >
                  ❤ Liked
                </span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    color: "var(--text3)",
                    letterSpacing: "0.1em",
                    marginLeft: "10px",
                  }}
                >
                  songs you love
                </span>
              </div>
              <a
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  color: "var(--accent)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  textDecoration: "none",
                }}
                onClick={() => navigate("/liked")}
              >
                See all →
              </a>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px",
              }}
            >
              {likedSongsPreview.map((s) => (
                <div
                  key={s.id}
                  onClick={() => playSong(s)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 40px 1fr auto",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "background 0.12s",
                    border: "1px solid transparent",
                    background:
                      currentSong?.id === s.id
                        ? "rgba(255,51,102,0.07)"
                        : "transparent",
                    borderColor:
                      currentSong?.id === s.id
                        ? "rgba(255,51,102,0.2)"
                        : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (currentSong?.id !== s.id)
                      e.currentTarget.style.background = "var(--surface2)";
                  }}
                  onMouseLeave={(e) => {
                    if (currentSong?.id !== s.id)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "11px",
                      color: "#ff3366",
                      textAlign: "center",
                    }}
                  >
                    ♥
                  </div>
                  <SongArt song={s} size={40} />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color:
                          currentSong?.id === s.id ? "#ff3366" : "var(--text)",
                      }}
                    >
                      {s.title}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text3)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: "2px",
                      }}
                    >
                      {s.artist}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "11px",
                      color: "var(--text3)",
                    }}
                  >
                    {s.dur}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: "40px" }} />
      </div>
    </div>
  );
};

export default HomePage;
