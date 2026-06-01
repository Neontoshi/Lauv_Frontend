import React, { useEffect, useState } from "react";
import SongRow from "../components/Library/SongRow";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { useLibraryStore } from "../stores/libraryStore";
import { useSystemStore } from "../stores/systemStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";

const MUSIC_EMOJIS = [
  "🎵",
  "🎶",
  "🎧",
  "🎼",
  "🎹",
  "🎸",
  "🎤",
  "🥁",
  "🎺",
  "🎷",
  "🪕",
  "🎻",
  "💿",
  "📻",
  "🔊",
  "🎙️",
];
const randomEmoji = () =>
  MUSIC_EMOJIS[Math.floor(Math.random() * MUSIC_EMOJIS.length)];

const TRENDING_QUERIES = [
  {
    label: "Hot Right Now",
    query: "top english hits 2025 2026 official audio",
    scQuery: "top english hits 2025",
  },
  {
    label: "New Music",
    query: "new english song 2025 2026 official video",
    scQuery: "new english music 2025",
  },
  {
    label: "Hip Hop",
    query: "american hip hop 2025 2026 official video",
    scQuery: "american hip hop 2025",
  },
  {
    label: "Pop",
    query: "english pop 2025 2026 official audio vevo",
    scQuery: "english pop 2025",
  },
  {
    label: "Electronic",
    query: "english electronic music 2025 2026 official",
    scQuery: "english electronic 2025",
  },
  {
    label: "R&B",
    query: "american rnb 2025 2026 official audio",
    scQuery: "american rnb soul 2025",
  },
  {
    label: "Country",
    query: "american country music 2025 2026 official video",
    scQuery: "american country 2025",
  },
  {
    label: "Latin",
    query: "latin pop english 2025 2026 official video",
    scQuery: "latin pop 2025",
  },
  {
    label: "Afrobeats",
    query: "afrobeats english 2025 2026 official video",
    scQuery: "afrobeats english 2025",
  },
  {
    label: "Rock",
    query: "english rock 2025 2026 official audio",
    scQuery: "english rock band 2025",
  },
];

const randomGradient = (seed: string) => {
  const hash = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hues = [280, 200, 340, 40, 160, 100, 10, 260, 320, 180];
  const h = hues[hash % hues.length];
  return `linear-gradient(135deg, hsl(${h}, 45%, 20%), hsl(${h + 40}, 38%, 8%))`;
};

const SkeletonCard = ({ index }: { index: number }) => (
  <div className="ex-skeleton" style={{ animationDelay: `${index * 0.04}s` }}>
    <div className="ex-skeleton-img" />
    <div className="ex-skeleton-body">
      <div className="ex-skeleton-line" style={{ width: "72%" }} />
      <div
        className="ex-skeleton-line"
        style={{ width: "48%", marginTop: "6px" }}
      />
    </div>
  </div>
);

const ExplorePage: React.FC = () => {
  const { currentSong, setCurrentSong, setProgress } = usePlayerStore();
  const { setQueue } = useQueueStore();
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const { ytdlpAvailable } = useSystemStore();
  const [ytResults, setYtResults] = useState<Song[]>([]);
  const [scResults, setScResults] = useState<Song[]>([]);
  const [activeQuery, setActiveQuery] = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sourceTab, setSourceTab] = useState<"youtube" | "soundcloud">(
    "youtube",
  );

  useEffect(() => {
    if (ytdlpAvailable) {
      loadTrending(
        TRENDING_QUERIES[activeQuery].query,
        TRENDING_QUERIES[activeQuery].scQuery,
      );
    }
  }, [activeQuery, ytdlpAvailable]);

  const loadTrending = async (query: string, scQuery: string) => {
    if (!ytdlpAvailable) return;
    setLoading(true);
    setYtResults([]);
    setScResults([]);
    try {
      const [yt, sc] = await Promise.all([
        tauriCommands.searchYoutube(query),
        tauriCommands.searchSoundcloud(scQuery),
      ]);
      setYtResults(
        yt.map((r: any) => ({
          id: `yt-${r.id}`,
          path: "",
          title: r.title,
          artist: r.artist,
          album: "YouTube",
          duration: r.duration_secs,
          genre: null,
          year: null,
          track_number: null,
          artwork: r.thumbnail,
          source: "youtube" as any,
          videoId: r.id,
          dur: r.duration_str,
          emoji: "▶️",
          grad: "linear-gradient(135deg, #ff0000, #cc0000)",
          bpm: 0,
          key: "—",
          plays: 0,
          liked: false,
        })) || [],
      );
      setScResults(
        sc.map((r: any) => ({
          id: `sc-${r.id}`,
          path: "",
          title: r.title,
          artist: r.artist,
          album: "SoundCloud",
          duration: r.duration_secs,
          genre: null,
          year: null,
          track_number: null,
          artwork: r.thumbnail,
          source: "soundcloud" as any,
          videoId: r.id,
          dur: r.duration_str,
          emoji: randomEmoji(),
          grad: "linear-gradient(135deg, #ff8800, #ff5500)",
          bpm: 0,
          key: "—",
          plays: 0,
          liked: false,
        })) || [],
      );
    } catch (err) {
      console.error("Failed to load trending:", err);
    } finally {
      setLoading(false);
    }
  };

  const allSongs = sourceTab === "youtube" ? ytResults : scResults;

  const handlePlay = (song: Song, _index: number) => {
    setQueue(allSongs, song, "library");
    setCurrentSong(song);
    setProgress(0);
  };

  const handlePlayAll = () => {
    if (allSongs.length > 0) handlePlay(allSongs[0], 0);
  };

  const handleLike = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    const isSC = song.source === "soundcloud";
    try {
      if (isSC) {
        const result = await tauriCommands.toggleLikeSoundcloud({
          trackId: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album || "SoundCloud",
          durationSecs: song.duration || 0,
          thumbnail: song.artwork || "",
          videoId: song.videoId,
          path: song.path || "",
        });
        song.liked = result;
      } else {
        toggleLike(song.id, song.liked ? undefined : song);
        await tauriCommands.toggleLike(song.id);
        if (!song.liked) {
          await tauriCommands.saveLikedSong({
            id: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album || "",
            durationSecs: song.duration || 0,
            thumbnail: song.artwork || "",
            videoId: song.videoId,
            source: song.source || "youtube",
            path: song.path || "",
          });
        }
      }
      setYtResults([...ytResults]);
      setScResults([...scResults]);
    } catch (err) {
      console.error("Failed to toggle like:", err);
      toggleLike(song.id);
    }
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <style>{`
        .ex-header { flex-shrink: 0; padding: 1.5rem 2rem 0; background: var(--bg); }
        .ex-header-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .ex-header-left { display: flex; flex-direction: column; }
        .ex-eyebrow { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: var(--accent); margin-bottom: 4px; }
        .ex-title { font-family: 'Syne', sans-serif; font-size: 2rem; font-weight: 800; letter-spacing: -0.03em; line-height: 0.92; margin: 0; display: flex; align-items: baseline; gap: 0.35em; }
        .ex-title-dim { color: var(--text3); }
        .ex-title-accent { color: var(--text); }
        .ex-view-toggle { display: flex; gap: 3px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 3px; }
        .ex-toggle-btn { width: 30px; height: 28px; border-radius: 5px; background: transparent; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text3); transition: all 0.15s; }
        .ex-toggle-btn.active { background: var(--surface3); color: var(--text); }
        .ex-tape { display: flex; gap: 0; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid var(--border); margin-top: 0.75rem; }
        .ex-tape::-webkit-scrollbar { display: none; }
        .ex-chip { flex-shrink: 0; padding: 8px 16px; background: transparent; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px; color: var(--text3); font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: color 0.15s, border-color 0.15s; white-space: nowrap; }
        .ex-chip:hover { color: var(--text2); }
        .ex-chip.active { color: var(--text); border-bottom-color: var(--accent2); }
        .ex-source-tabs { display: flex; justify-content: center; gap: 0; border-bottom: 1px solid var(--border); }
        .ex-source-tab { padding: 8px 32px; background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--text3); cursor: pointer; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; transition: all 0.15s; }
        .ex-source-tab:hover { color: var(--text2); }
        .ex-source-tab.active { color: var(--text); border-bottom-color: var(--accent); }
        .ex-strip { display: flex; align-items: center; gap: 12px; padding: 0.75rem 0; }
        .ex-play-circle { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--accent2)); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: transform 0.15s; }
        .ex-play-circle:hover { transform: scale(1.07); }
        .ex-strip-title { font-size: 14px; font-weight: 700; }
        .ex-strip-count { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--text3); margin-top: 2px; }
        .ex-content { flex: 1; overflow-y: auto; padding: 0 2rem 6rem; }
        .ex-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); gap: 12px; }
        .ex-card { border-radius: var(--radius); overflow: hidden; background: var(--surface); border: 1px solid var(--border); cursor: pointer; animation: exFadeUp 0.35s ease both; transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s; position: relative; }
        .ex-card:hover { transform: translateY(-3px); border-color: var(--border2); box-shadow: 0 14px 40px rgba(0,0,0,0.45); }
        .ex-card.is-active { border-color: rgba(124,106,245,0.5); background: rgba(124,106,245,0.05); }
        .ex-like-btn { position: absolute; top: 8px; left: 8px; width: 28px; height: 28px; border-radius: 50%; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 3; opacity: 0; transition: opacity 0.18s, transform 0.15s; }
        .ex-card:hover .ex-like-btn, .ex-card.is-active .ex-like-btn { opacity: 1; }
        .ex-like-btn:hover { transform: scale(1.15); }
        .ex-card-art { width: 100%; aspect-ratio: 1; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 36px; }
        .ex-card-art img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .ex-card-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.18s; }
        .ex-card:hover .ex-card-overlay, .ex-card.is-active .ex-card-overlay { opacity: 1; }
        .ex-card-play-btn { width: 38px; height: 38px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,0.4); transition: transform 0.15s; }
        .ex-card:hover .ex-card-play-btn { transform: scale(1.1); }
        .ex-card-bars { display: flex; gap: 3px; align-items: flex-end; height: 16px; }
        .ex-bar { width: 3px; border-radius: 2px; background: #fff; }
        .ex-card-badge { position: absolute; top: 8px; right: 8px; font-family: 'DM Mono', monospace; font-size: 8px; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 99px; backdrop-filter: blur(8px); z-index: 2; }
        .ex-card-badge.yt { background: rgba(0,0,0,0.55); color: #ff5555; border: 1px solid rgba(255,50,50,0.3); }
        .ex-card-badge.sc { background: rgba(0,0,0,0.55); color: #ff7722; border: 1px solid rgba(255,100,0,0.3); }
        .ex-card-info { padding: 10px 11px 12px; }
        .ex-card-title { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; margin-bottom: 3px; }
        .ex-card-artist { font-size: 11px; color: var(--text3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: 'DM Mono', monospace; }
        .ex-skeleton { border-radius: var(--radius); overflow: hidden; background: var(--surface); border: 1px solid var(--border); animation: exSkPulse 1.6s ease-in-out infinite; }
        .ex-skeleton-img { width: 100%; aspect-ratio: 1; background: var(--surface2); }
        .ex-skeleton-body { padding: 10px 11px 12px; }
        .ex-skeleton-line { height: 12px; background: var(--surface2); border-radius: 4px; }
        @keyframes exFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes exSkPulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes exBarBounce { 0%,100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
      `}</style>

      <div className="ex-header">
        {!ytdlpAvailable && (
          <div
            style={{
              padding: "10px 16px",
              marginBottom: 12,
              borderRadius: 8,
              background: "rgba(255,170,50,0.08)",
              border: "1px solid rgba(255,170,50,0.2)",
              color: "#ffaa33",
              fontFamily: "'DM Mono',monospace",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>⚠️</span> yt-dlp not installed. Streaming features
            unavailable. Run: pip install yt-dlp
          </div>
        )}
        <div className="ex-header-top">
          <div className="ex-header-left">
            <div className="ex-eyebrow">Discovery</div>
            <h1 className="ex-title">
              <span className="ex-title-dim">Explore</span>
              <span className="ex-title-accent">Trending</span>
            </h1>
          </div>
          <div className="ex-view-toggle">
            <button
              className={`ex-toggle-btn${viewMode === "list" ? " active" : ""}`}
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="13"
                height="13"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              className={`ex-toggle-btn${viewMode === "grid" ? " active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid view"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="13"
                height="13"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
          </div>
        </div>
        <div className="ex-tape">
          {TRENDING_QUERIES.map((q, i) => (
            <button
              key={q.query}
              className={`ex-chip${activeQuery === i ? " active" : ""}`}
              onClick={() => {
                if (!ytdlpAvailable) return;
                setActiveQuery(i);
              }}
            >
              {q.label}
            </button>
          ))}
        </div>
        <div className="ex-source-tabs">
          <button
            className={`ex-source-tab${sourceTab === "youtube" ? " active" : ""}`}
            onClick={() => {
              if (!ytdlpAvailable) return;
              setSourceTab("youtube");
            }}
          >
            YouTube ({ytResults.length})
          </button>
          <button
            className={`ex-source-tab${sourceTab === "soundcloud" ? " active" : ""}`}
            onClick={() => {
              if (!ytdlpAvailable) return;
              setSourceTab("soundcloud");
            }}
          >
            SoundCloud ({scResults.length})
          </button>
        </div>
        {!loading && allSongs.length > 0 && (
          <div className="ex-strip">
            <button className="ex-play-circle" onClick={handlePlayAll}>
              <svg
                viewBox="0 0 24 24"
                fill="#fff"
                width="16"
                height="16"
                style={{ marginLeft: "2px" }}
              >
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </button>
            <div>
              <div className="ex-strip-title">
                {TRENDING_QUERIES[activeQuery].label}
              </div>
              <div className="ex-strip-count">{allSongs.length} tracks</div>
            </div>
          </div>
        )}
      </div>

      <div className="ex-content">
        {!ytdlpAvailable ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 0",
              color: "var(--text3)",
              fontFamily: "'DM Mono',monospace",
              fontSize: 11,
            }}
          >
            Install yt-dlp to explore trending music
          </div>
        ) : loading ? (
          <div className="ex-grid" style={{ marginTop: "1rem" }}>
            {Array.from({ length: 16 }).map((_, i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </div>
        ) : viewMode === "grid" ? (
          <div className="ex-grid">
            {allSongs.map((song, idx) => {
              const isActive = currentSong?.id === song.id;
              const isYt = song.source !== "soundcloud";
              return (
                <div
                  key={song.id}
                  className={`ex-card${isActive ? " is-active" : ""}`}
                  style={{ animationDelay: `${idx * 0.022}s` }}
                  onClick={() => handlePlay(song, idx)}
                >
                  <button
                    className="ex-like-btn"
                    onClick={(e) => handleLike(e, song)}
                    title={song.liked ? "Unlike" : "Like"}
                    style={{
                      color: song.liked ? "#ff4466" : "rgba(255,255,255,0.7)",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill={song.liked ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      width="14"
                      height="14"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                  </button>
                  <span className={`ex-card-badge ${isYt ? "yt" : "sc"}`}>
                    {isYt ? "YT" : "SC"}
                  </span>
                  <div
                    className="ex-card-art"
                    style={{
                      background: song.grad || randomGradient(song.title),
                    }}
                  >
                    {song.artwork ? (
                      <img src={song.artwork} alt="" />
                    ) : song.videoId && isYt ? (
                      <img
                        src={`https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`}
                        alt=""
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      song.emoji
                    )}
                    <div className="ex-card-overlay">
                      {isActive ? (
                        <div className="ex-card-bars">
                          {[0, 0.15, 0.3].map((d, bi) => (
                            <div
                              key={bi}
                              className="ex-bar"
                              style={{
                                height: "16px",
                                animation:
                                  "exBarBounce 0.75s ease-in-out infinite",
                                animationDelay: `${d}s`,
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="ex-card-play-btn">
                          <svg
                            viewBox="0 0 24 24"
                            fill="#fff"
                            width="16"
                            height="16"
                            style={{ marginLeft: "2px" }}
                          >
                            <polygon points="5,3 19,12 5,21" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ex-card-info">
                    <div
                      className="ex-card-title"
                      style={{
                        color: isActive ? "var(--accent2)" : "var(--text)",
                      }}
                    >
                      {song.title}
                    </div>
                    <div className="ex-card-artist">{song.artist}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            {allSongs.map((song, idx) => (
              <SongRow
                key={song.id}
                song={song}
                index={idx}
                isCurrent={currentSong?.id === song.id}
                onPlay={() => handlePlay(song, idx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
