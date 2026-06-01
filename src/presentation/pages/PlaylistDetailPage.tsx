import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";

const formatDuration = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const formatTotalDuration = (songs: any[]) => {
  const total = songs.reduce((acc, s) => acc + (s.duration_secs || 0), 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = Math.floor(total % 60);
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m} min ${sec} sec`;
};

const randomGradient = () => {
  const hues = [280, 200, 340, 40, 160, 100, 10, 260];
  const h = hues[Math.floor(Math.random() * hues.length)];
  return `linear-gradient(135deg, hsl(${h}, 40%, 20%), hsl(${h + 30}, 40%, 12%))`;
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

const PlaylistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [songs, setSongs] = useState<any[]>([]);
  const [playlist, setPlaylist] = useState<any>(null);
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set());
  const { currentSong, setCurrentSong, setProgress, isPlaying } =
    usePlayerStore();
  const { setQueue } = useQueueStore();

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [data, playlists] = await Promise.all([
        tauriCommands.getPlaylistSongs(id!),
        tauriCommands.getPlaylists(),
      ]);
      setSongs(data || []);
      const pl = playlists.find((p: any) => p.id === id);
      if (pl) setPlaylist(pl);
    } catch (err) {
      console.error("Failed to load playlist:", err);
    }
  };

  const handlePlay = (_song: any, index: number) => {
    const songList: Song[] = songs.map((s) => ({
      id: s.song_id,
      path: s.path,
      title: s.title,
      artist: s.artist,
      album: s.album,
      duration: s.duration_secs,
      genre: null,
      year: null,
      track_number: null,
      artwork: s.thumbnail,
      source: s.source as any,
      videoId: s.video_id || undefined,
      dur: formatDuration(s.duration_secs),
      emoji: "🎵",
      grad: randomGradient(),
      bpm: 0,
      key: "—",
      plays: 0,
      liked: likedSongs.has(s.song_id),
    }));
    setQueue(songList, songList[index], "playlist");
    setCurrentSong(songList[index]);
    setProgress(0);
  };

  const handleRemove = async (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    try {
      await tauriCommands.removeFromPlaylist(id!, songId);
      loadData();
    } catch (err) {
      console.error("Failed to remove song:", err);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!confirm(`Delete "${playlist?.name}"? This cannot be undone.`)) return;
    try {
      await tauriCommands.removePlaylist(id!);
      navigate("/playlists");
    } catch (err) {
      console.error("Failed to delete playlist:", err);
    }
  };

  const toggleLike = (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    setLikedSongs((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  };

  const currentSongIndex = songs.findIndex(
    (s) => s.song_id === currentSong?.id,
  );

  return (
    <div
      className="song-list-pane"
      style={{
        padding: "3rem 2rem 6rem",
        maxWidth: "900px",
        margin: "0 auto",
        overflowY: "auto",
        height: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "end",
          marginBottom: "4rem",
          gap: "2rem",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.2em",
              color: "var(--text3)",
              textTransform: "uppercase",
              marginBottom: "0.75rem",
            }}
          >
            {playlist?.description || "Playlist"}
          </div>
          <h1
            style={{
              fontSize: "clamp(3rem, 8vw, 6rem)",
              fontWeight: 800,
              lineHeight: 0.9,
              letterSpacing: "-0.03em",
            }}
          >
            {playlist?.name || "Playlist"}
          </h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "4rem",
              fontWeight: 800,
              color: "var(--accent)",
              lineHeight: 1,
            }}
          >
            {songs.length}
          </div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              color: "var(--text3)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            tracks
          </div>
          <div
            style={{
              marginTop: "0.5rem",
              fontFamily: "'DM Mono', monospace",
              fontSize: "12px",
              color: "var(--text3)",
            }}
          >
            {formatTotalDuration(songs)}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "2.5rem",
        }}
      >
        <button
          onClick={() => songs.length > 0 && handlePlay(songs[0], 0)}
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: "var(--accent)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.15s, background 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.08)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <svg
            viewBox="0 0 24 24"
            fill="#0a0a0f"
            width="20"
            height="20"
            style={{ marginLeft: "3px" }}
          >
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </button>

        <button
          onClick={handleDeletePlaylist}
          style={{
            padding: "10px 20px",
            borderRadius: "100px",
            background: "transparent",
            border: "1px solid var(--red)",
            color: "var(--red)",
            cursor: "pointer",
            fontFamily: "'Syne', sans-serif",
            fontSize: "12px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          Delete Playlist
        </button>
      </div>

      {/* Table header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "40px 1fr 180px 100px 60px 80px",
          padding: "0 1rem 0.75rem",
          borderBottom: "1px solid var(--border)",
          marginBottom: "0.25rem",
        }}
      >
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.15em",
            color: "var(--text3)",
            textTransform: "uppercase",
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
        <div></div>
      </div>

      {/* Song list */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {songs.map((song, i) => (
          <React.Fragment key={song.song_id}>
            {i > 0 && i % 4 === 0 && (
              <div
                style={{
                  height: "1px",
                  background: "var(--border)",
                  margin: "0.5rem 0",
                }}
              />
            )}
            <div
              onClick={() => handlePlay(song, i)}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 180px 100px 60px 80px",
                alignItems: "center",
                padding: "0.6rem 1rem",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "background 0.12s",
                position: "relative",
                background:
                  currentSongIndex === i
                    ? "rgba(124,106,245,0.06)"
                    : "transparent",
                animation: `fadeUp 0.4s both`,
                animationDelay: `${0.05 + i * 0.03}s`,
              }}
              onMouseEnter={(e) => {
                if (currentSongIndex !== i)
                  e.currentTarget.style.background = "var(--surface2)";
              }}
              onMouseLeave={(e) => {
                if (currentSongIndex !== i)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              {currentSongIndex === i && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "3px",
                    height: "60%",
                    background: "var(--accent)",
                    borderRadius: "0 2px 2px 0",
                  }}
                />
              )}
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "12px",
                  color: "var(--text3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <span style={{ opacity: currentSongIndex === i ? 0 : 1 }}>
                  {i + 1}
                </span>
                <span
                  style={{
                    position: "absolute",
                    opacity: currentSongIndex === i ? 1 : 0,
                  }}
                >
                  {currentSongIndex === i && isPlaying ? (
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
                    width: "38px",
                    height: "38px",
                    borderRadius: "6px",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    background: randomGradient(),
                    overflow: "hidden",
                  }}
                >
                  {song.thumbnail ? (
                    <img
                      src={song.thumbnail}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    "🎵"
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color:
                        currentSongIndex === i
                          ? "var(--accent)"
                          : "var(--text)",
                    }}
                  >
                    {song.title}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text2)",
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
              <div>
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
                {formatDuration(song.duration_secs)}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "4px",
                }}
              >
                <button
                  onClick={(e) => toggleLike(e, song.song_id)}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    border: "none",
                    background: "none",
                    color: likedSongs.has(song.song_id)
                      ? "#f72585"
                      : "var(--text3)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) => {
                    if (!likedSongs.has(song.song_id))
                      e.currentTarget.style.color = "var(--text)";
                  }}
                  onMouseLeave={(e) => {
                    if (!likedSongs.has(song.song_id))
                      e.currentTarget.style.color = "var(--text3)";
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill={
                      likedSongs.has(song.song_id) ? "currentColor" : "none"
                    }
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => handleRemove(e, song.song_id)}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    border: "none",
                    background: "none",
                    color: "var(--text3)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--red)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text3)")
                  }
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {songs.length === 0 && (
        <div
          style={{
            padding: "60px",
            textAlign: "center",
            color: "var(--text3)",
          }}
        >
          No songs in this playlist. Add songs from your library using the +
          button on any song.
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default PlaylistDetailPage;
