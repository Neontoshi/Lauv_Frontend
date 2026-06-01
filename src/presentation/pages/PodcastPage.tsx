import React, { useState, useEffect, useRef } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { useSystemStore } from "../stores/systemStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";

const CATEGORIES = [
  { label: "Comedy", query: "comedy podcast full episode 2025" },
  { label: "True Crime", query: "true crime podcast full episode" },
  { label: "Tech", query: "tech podcast full episode 2025" },
  { label: "Stoicism", query: "stoicism philosophy podcast full episode" },
  { label: "Self Help", query: "self improvement podcast full episode" },
  { label: "Relationships", query: "relationship advice podcast full episode" },
  { label: "Conspiracy", query: "conspiracy theory podcast full episode" },
  { label: "Scary Stories", query: "scary stories podcast full episode" },
  {
    label: "Space & Sci-Fi",
    query: "space universe aliens podcast full episode",
  },
  { label: "Money", query: "money finance podcast full episode 2025" },
  { label: "Gaming", query: "gaming podcast full episode" },
  { label: "Anime", query: "anime podcast full episode" },
];

const randomGradient = (seed: string) => {
  const hash = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hues = [280, 200, 340, 40, 160, 100, 10, 260, 320, 180];
  const h = hues[hash % hues.length];
  return `linear-gradient(135deg, hsl(${h}, 40%, 22%), hsl(${h + 30}, 35%, 10%))`;
};

const formatDuration = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
};

const PodcastPage: React.FC = () => {
  const { currentSong, setCurrentSong, setProgress, isPlaying } =
    usePlayerStore();
  const { setQueue } = useQueueStore();
  const { ytdlpAvailable, ytdlpChecked } = useSystemStore();
  const [episodes, setEpisodes] = useState<Song[]>([]);
  const [activeCategory, setActiveCategory] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (ytdlpAvailable) {
      loadCategory(CATEGORIES[activeCategory].query);
    } else if (ytdlpChecked) {
      setLoading(false);
    }
  }, [activeCategory, ytdlpAvailable, ytdlpChecked]);

  const loadCategory = async (query: string) => {
    if (!ytdlpAvailable) return;
    setLoading(true);
    setEpisodes([]);
    try {
      const yt = await tauriCommands.searchYoutube(query);
      const filtered = (yt || [])
        .filter((r: any) => {
          const dur = r.duration_secs;
          return dur && dur > 600;
        })
        .map((r: any) => ({
          id: `yt-${r.id}`,
          path: "",
          title: r.title,
          artist: r.artist,
          album: "Podcast",
          duration: r.duration_secs,
          genre: null,
          year: null,
          track_number: null,
          artwork: r.thumbnail,
          source: "youtube" as any,
          videoId: r.id,
          dur: formatDuration(r.duration_secs),
          emoji: "🎙️",
          grad: "linear-gradient(135deg, #7c3aed, #5b21b6)",
          bpm: 0,
          key: "—",
          plays: 0,
          liked: false,
        }));
      setEpisodes(filtered);
    } catch (err) {
      console.error("Failed to load podcasts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) {
      loadCategory(CATEGORIES[activeCategory].query);
      return;
    }
    searchTimeout.current = window.setTimeout(() => {
      loadCategory(`${query} podcast full episode`);
    }, 400);
  };

  const handlePlay = (song: Song, _index: number) => {
    setQueue(episodes, song, "library");
    setCurrentSong(song);
    setProgress(0);
  };

  const currentSongId = currentSong?.id;

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
        .pod-header { flex-shrink: 0; padding: 1.5rem 2rem 0; background: var(--bg); }
        .pod-eyebrow { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: var(--accent); margin-bottom: 4px; }
        .pod-title { font-family: 'Syne', sans-serif; font-size: 2rem; font-weight: 800; letter-spacing: -0.03em; line-height: 0.92; margin: 0; }
        .pod-tape { display: flex; gap: 0; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid var(--border); margin-top: 0.75rem; }
        .pod-tape::-webkit-scrollbar { display: none; }
        .pod-chip { flex-shrink: 0; padding: 8px 16px; background: transparent; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px; color: var(--text3); font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: color 0.15s, border-color 0.15s; white-space: nowrap; }
        .pod-chip:hover { color: var(--text2); }
        .pod-chip.active { color: var(--text); border-bottom-color: var(--accent2); }
        .pod-search { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 12px; margin: 0.75rem 0; }
        .pod-search:focus-within { border-color: var(--accent); }
        .pod-search input { background: none; border: none; color: var(--text); font-family: 'DM Mono',monospace; font-size: 12px; outline: none; width: 100%; }
        .pod-search input::placeholder { color: var(--text3); }
        .pod-content { flex: 1; overflow-y: auto; padding: 0 2rem 6rem; }
      `}</style>

      <div className="pod-header">
        <div className="pod-eyebrow">Listen</div>
        <h1 className="pod-title">Podcasts</h1>
        <div className="pod-tape">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.label}
              className={`pod-chip${activeCategory === i ? " active" : ""}`}
              onClick={() => {
                if (!ytdlpAvailable) return;
                setActiveCategory(i);
                setSearchQuery("");
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="pod-search">
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
            placeholder={
              ytdlpAvailable ? "Search podcasts..." : "yt-dlp required..."
            }
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            disabled={!ytdlpAvailable}
          />
        </div>
        {ytdlpChecked && !ytdlpAvailable && (
          <div
            style={{
              padding: "10px 16px",
              margin: "0.5rem 0",
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
            <span>⚠️</span> yt-dlp not installed. Podcasts unavailable. Run: pip
            install yt-dlp
          </div>
        )}
      </div>

      <div className="pod-content">
        {!ytdlpAvailable && ytdlpChecked ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 0",
              color: "var(--text3)",
              fontFamily: "'DM Mono',monospace",
              fontSize: 11,
            }}
          >
            Install yt-dlp to browse podcasts
          </div>
        ) : loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "2rem 0",
              color: "var(--text3)",
              fontFamily: "'DM Mono',monospace",
              fontSize: 11,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              width="16"
              height="16"
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
            Loading episodes...
          </div>
        ) : episodes.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 0",
              color: "var(--text3)",
              fontFamily: "'DM Mono',monospace",
              fontSize: 11,
            }}
          >
            No episodes found
          </div>
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "32px 48px 1fr 100px",
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
              <span></span>
              <span>Episode</span>
              <span style={{ textAlign: "right" }}>Duration</span>
            </div>
            {episodes.map((ep, i) => {
              const isActive = currentSongId === ep.id;
              return (
                <div
                  key={ep.id}
                  onClick={() => handlePlay(ep, i)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 48px 1fr 100px",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    border: "1px solid transparent",
                    background: isActive
                      ? "rgba(124,106,245,0.07)"
                      : "transparent",
                    borderColor: isActive
                      ? "rgba(124,106,245,0.18)"
                      : "transparent",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "var(--surface)";
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
                    {isActive && isPlaying ? "▶" : i + 1}
                  </div>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      background: ep.grad || randomGradient(ep.title),
                      overflow: "hidden",
                    }}
                  >
                    {ep.artwork ? (
                      <img
                        src={ep.artwork}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : ep.videoId ? (
                      <img
                        src={`https://i.ytimg.com/vi/${ep.videoId}/default.jpg`}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      "🎙️"
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
                      {ep.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text3)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: 2,
                      }}
                    >
                      {ep.artist}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 11,
                      color: "var(--text3)",
                      textAlign: "right",
                    }}
                  >
                    {ep.dur}
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

export default PodcastPage;
