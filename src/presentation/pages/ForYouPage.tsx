import React, { useMemo, useState, useEffect, useRef } from "react";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { useSystemStore } from "../stores/systemStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";

const ALL_GENRES = [
  "pop",
  "rock",
  "jazz",
  "classical",
  "electronic",
  "hip hop",
  "r&b",
  "country",
  "reggae",
  "blues",
  "metal",
  "punk",
  "folk",
  "soul",
  "funk",
  "disco",
  "house",
  "techno",
  "trance",
  "ambient",
  "drum and bass",
  "dubstep",
  "lofi",
  "chillout",
  "lounge",
  "gospel",
  "latin",
  "afrobeats",
  "k-pop",
  "indie",
  "alternative",
];

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

const YT_SEARCH_QUERIES = [
  (genre: string) => `${genre} music`,
  (genre: string) => `${genre} songs`,
  (genre: string) => `${genre} playlist`,
  (genre: string) => `best ${genre} songs`,
  (genre: string) => `${genre} hits 2025`,
  (genre: string) => `top ${genre} tracks`,
  (genre: string) => `${genre} mix`,
  (genre: string) => `new ${genre} 2025`,
  (genre: string) => `${genre} classic`,
  (genre: string) => `${genre} official`,
  (genre: string) => `${genre} vevo`,
  (genre: string) => `greatest ${genre}`,
  (genre: string) => `${genre} bangers`,
  (genre: string) => `${genre} essentials`,
  (genre: string) => `${genre} top 50`,
  (genre: string) => `${genre} trending`,
];

const SC_SEARCH_QUERIES = [
  (genre: string) => `${genre} music`,
  (genre: string) => `${genre} mix`,
  (genre: string) => `${genre} original`,
];

const BATCH_SIZE = 2;
const BATCH_DELAY = 1200;

interface GenreCache {
  ytSongs: Song[];
  scSongs: Song[];
  timestamp: number;
}

const CACHE_TTL = 24 * 60 * 60 * 1000;

function getCachedGenre(genre: string): GenreCache | null {
  try {
    const raw = localStorage.getItem(`lauv-genre-${genre}`);
    if (!raw) return null;
    const cache: GenreCache = JSON.parse(raw);
    if (Date.now() - cache.timestamp > CACHE_TTL) {
      localStorage.removeItem(`lauv-genre-${genre}`);
      return null;
    }
    return cache;
  } catch {
    return null;
  }
}

function setCachedGenre(genre: string, ytSongs: Song[], scSongs: Song[]) {
  try {
    const cache: GenreCache = { ytSongs, scSongs, timestamp: Date.now() };
    localStorage.setItem(`lauv-genre-${genre}`, JSON.stringify(cache));
  } catch {}
}

const randomGradient = (seed: string) => {
  const hash = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hues = [280, 200, 340, 40, 160, 100, 10, 260, 320, 180];
  const h = hues[hash % hues.length];
  return `linear-gradient(135deg, hsl(${h}, 40%, 22%), hsl(${h + 30}, 35%, 10%))`;
};

const formatDuration = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const mapYtSong = (r: any, source: "youtube" | "soundcloud"): Song => ({
  id: `${source === "youtube" ? "yt" : "sc"}-${r.id}`,
  path: "",
  title: r.title,
  artist: r.artist,
  album: source === "youtube" ? "YouTube" : "SoundCloud",
  duration: r.duration_secs,
  genre: null,
  year: null,
  track_number: null,
  artwork: r.thumbnail,
  source: source as any,
  videoId: r.id,
  dur: r.duration_str,
  emoji: source === "youtube" ? "▶️" : randomEmoji(),
  grad:
    source === "youtube"
      ? "linear-gradient(135deg, #ff0000, #cc0000)"
      : "linear-gradient(135deg, #ff8800, #ff5500)",
  bpm: 0,
  key: "—",
  plays: 0,
  liked: false,
});

const ForYouPage: React.FC = () => {
  const { songs } = useLibraryStore();
  const { currentSong, setCurrentSong, setProgress, isPlaying } =
    usePlayerStore();
  const { setQueue } = useQueueStore();
  const { ytdlpAvailable } = useSystemStore();
  const [addedGenres, setAddedGenres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [ytSongs, setYtSongs] = useState<Song[]>([]);
  const [scSongs, setScSongs] = useState<Song[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [ytProgress, setYtProgress] = useState(0);
  const seenYtIds = useRef<Set<string>>(new Set());
  const seenScIds = useRef<Set<string>>(new Set());
  const hasMoreRef = useRef(true);
  const abortRef = useRef<number>(0);
  const accumulatedYt = useRef<Song[]>([]);
  const accumulatedSc = useRef<Song[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("lauv-added-genres");
      if (stored) setAddedGenres(JSON.parse(stored));
    } catch {}
  }, []);

  const saveGenres = (genres: string[]) => {
    setAddedGenres(genres);
    localStorage.setItem("lauv-added-genres", JSON.stringify(genres));
  };

  const addGenre = (genre: string) => {
    if (!addedGenres.includes(genre)) saveGenres([...addedGenres, genre]);
  };

  const removeGenre = (genre: string) => {
    saveGenres(addedGenres.filter((g) => g !== genre));
  };

  const filteredGenres = searchQuery
    ? addedGenres.filter((g) =>
        g.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : addedGenres;

  const availableGenres = addSearchQuery
    ? ALL_GENRES.filter(
        (g) =>
          g.toLowerCase().includes(addSearchQuery.toLowerCase()) &&
          !addedGenres.includes(g),
      )
    : ALL_GENRES.filter((g) => !addedGenres.includes(g));

  useEffect(() => {
    if (selectedGenre && ytdlpAvailable) {
      const generation = ++abortRef.current;
      const cached = getCachedGenre(selectedGenre);
      setYtSongs([]);
      setScSongs([]);
      setHasMore(true);
      setYtProgress(0);
      seenYtIds.current = new Set();
      seenScIds.current = new Set();
      accumulatedYt.current = [];
      accumulatedSc.current = [];

      if (cached) {
        setYtSongs(cached.ytSongs);
        setScSongs(cached.scSongs);
        setYtProgress(YT_SEARCH_QUERIES.length);
        setHasMore(false);
        setLoadingStreams(false);
        setLoadingMore(false);
        return;
      }

      setLoadingStreams(true);
      loadGenreStreams(selectedGenre, 0, generation);
    }
  }, [selectedGenre, ytdlpAvailable]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const loadGenreStreams = async (
    genre: string,
    startIdx: number,
    generation: number,
  ) => {
    if (generation !== abortRef.current) return;
    const isFirstBatch = startIdx === 0;
    if (!isFirstBatch) setLoadingMore(true);
    try {
      const endIdx = Math.min(startIdx + BATCH_SIZE, YT_SEARCH_QUERIES.length);
      const ytExhausted = startIdx >= YT_SEARCH_QUERIES.length;
      if (!ytExhausted) {
        const batchQueries = YT_SEARCH_QUERIES.slice(startIdx, endIdx);
        const results = await Promise.all(
          batchQueries.map((q) =>
            tauriCommands.searchYoutube(q(genre)).catch(() => []),
          ),
        );
        if (generation !== abortRef.current) return;
        const newYt: Song[] = [];
        for (const yt of results) {
          for (const r of yt || []) {
            const id = `yt-${r.id}`;
            if (seenYtIds.current.has(id)) continue;
            const dur = r.duration_secs;
            if (!dur || dur < 60 || dur > 600) continue;
            seenYtIds.current.add(id);
            newYt.push(mapYtSong(r, "youtube"));
          }
        }
        accumulatedYt.current = [...accumulatedYt.current, ...newYt];
        setYtProgress(endIdx);
        setYtSongs([...accumulatedYt.current]);
        const nextIdx = endIdx;
        const allYtDone = nextIdx >= YT_SEARCH_QUERIES.length;
        if (!allYtDone && hasMoreRef.current) {
          setTimeout(
            () => loadGenreStreams(genre, nextIdx, generation),
            BATCH_DELAY,
          );
        } else if (allYtDone) {
          loadSoundcloudStreams(genre, 0, generation);
        }
      }
    } catch (err) {
      if (generation === abortRef.current)
        console.error("Failed to load streams:", err);
    } finally {
      if (generation === abortRef.current) {
        setLoadingStreams(false);
        setLoadingMore(false);
      }
    }
  };

  const loadSoundcloudStreams = async (
    genre: string,
    queryIdx: number,
    generation: number,
  ) => {
    if (generation !== abortRef.current) return;
    if (queryIdx >= SC_SEARCH_QUERIES.length) {
      setHasMore(false);
      setLoadingStreams(false);
      setLoadingMore(false);
      setCachedGenre(genre, accumulatedYt.current, accumulatedSc.current);
      return;
    }
    setLoadingMore(true);
    try {
      const query = SC_SEARCH_QUERIES[queryIdx](genre);
      const sc = await tauriCommands.searchSoundcloud(query);
      if (generation !== abortRef.current) return;
      const newSc: Song[] = [];
      for (const r of sc || []) {
        const id = `sc-${r.id}`;
        if (seenScIds.current.has(id)) continue;
        const dur = r.duration_secs;
        if (!dur || dur < 90 || dur > 600) continue;
        seenScIds.current.add(id);
        newSc.push(mapYtSong(r, "soundcloud"));
      }
      accumulatedSc.current = [...accumulatedSc.current, ...newSc];
      setScSongs([...accumulatedSc.current]);
      const nextIdx = queryIdx + 1;
      if (nextIdx < SC_SEARCH_QUERIES.length) {
        setTimeout(
          () => loadSoundcloudStreams(genre, nextIdx, generation),
          BATCH_DELAY,
        );
      } else {
        setHasMore(false);
        setLoadingStreams(false);
        setLoadingMore(false);
        setCachedGenre(genre, accumulatedYt.current, accumulatedSc.current);
      }
    } catch (err) {
      if (generation === abortRef.current)
        console.error("SC load failed:", err);
      setHasMore(false);
      setLoadingStreams(false);
      setLoadingMore(false);
      setCachedGenre(genre, accumulatedYt.current, accumulatedSc.current);
    }
  };

  const localSongs = useMemo(() => {
    if (!selectedGenre) return [];
    return songs.filter((s) => {
      if (s.source === "youtube" || s.source === "soundcloud") return false;
      return s.genre?.toLowerCase() === selectedGenre.toLowerCase();
    });
  }, [songs, selectedGenre]);

  const allSongs = [...localSongs, ...ytSongs, ...scSongs];
  const totalDuration = allSongs.reduce((acc, s) => acc + (s.duration || 0), 0);

  const handlePlayAll = () => {
    if (allSongs.length > 0) {
      setQueue(allSongs, allSongs[0], "library");
      setCurrentSong(allSongs[0]);
      setProgress(0);
    }
  };

  const handlePlaySong = (song: Song) => {
    setQueue(allSongs, song, "library");
    setCurrentSong(song);
    setProgress(0);
  };

  if (selectedGenre) {
    const ytDone = ytProgress >= YT_SEARCH_QUERIES.length;
    return (
      <div className="ap-detail" ref={scrollRef}>
        <div className="ap-detail-inner">
          {!ytdlpAvailable && (
            <div
              style={{
                padding: "8px 16px",
                margin: "1rem 0",
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
              <span>⚠️</span> yt-dlp not installed. Streaming unavailable.
            </div>
          )}
          <button className="ap-back" onClick={() => setSelectedGenre(null)}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="14"
              height="14"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            For You
          </button>
          <div
            className="ap-hero"
            style={{ background: randomGradient(selectedGenre) }}
          >
            <div className="ap-hero-noise" />
            <div className="ap-hero-content">
              <div
                className="ap-hero-avatar"
                style={{ background: randomGradient(selectedGenre + "_inner") }}
              >
                <span>🎵</span>
              </div>
              <div className="ap-hero-meta">
                <div className="ap-hero-eyebrow">Genre</div>
                <h1
                  className="ap-hero-name"
                  style={{ textTransform: "capitalize" }}
                >
                  {selectedGenre}
                </h1>
                <div className="ap-hero-stats">
                  <div className="ap-stat">
                    <span className="ap-stat-val">{allSongs.length}</span>
                    <span className="ap-stat-lbl">Tracks</span>
                  </div>
                  {localSongs.length > 0 && (
                    <div className="ap-stat">
                      <span className="ap-stat-val">{localSongs.length}</span>
                      <span className="ap-stat-lbl">Local</span>
                    </div>
                  )}
                  <div className="ap-stat">
                    <span className="ap-stat-val ap-stat-yt">
                      {ytSongs.length}
                    </span>
                    <span className="ap-stat-lbl">YouTube</span>
                  </div>
                  {scSongs.length > 0 && (
                    <div className="ap-stat">
                      <span
                        className="ap-stat-val"
                        style={{ color: "#ff6600" }}
                      >
                        {scSongs.length}
                      </span>
                      <span className="ap-stat-lbl">SoundCloud</span>
                    </div>
                  )}
                  {totalDuration > 0 && (
                    <div className="ap-stat">
                      <span className="ap-stat-val">
                        {Math.floor(totalDuration / 3600) > 0
                          ? `${Math.floor(totalDuration / 3600)}h ${Math.floor((totalDuration % 3600) / 60)}m`
                          : `${Math.floor((totalDuration % 3600) / 60)}m`}
                      </span>
                      <span className="ap-stat-lbl">Duration</span>
                    </div>
                  )}
                </div>
                {!ytDone && (
                  <div
                    style={{
                      marginTop: 10,
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 10,
                      color: "rgba(255,255,255,0.5)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {ytSongs.length} songs
                  </div>
                )}
              </div>
            </div>
            <div className="ap-hero-actions">
              {allSongs.length > 0 && !loadingStreams && (
                <button className="ap-play-all" onClick={handlePlayAll}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width="14"
                    height="14"
                  >
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  Play All{" "}
                  <span className="ap-play-count">{allSongs.length}</span>
                </button>
              )}
              <button
                className="ap-unfollow"
                onClick={() => {
                  removeGenre(selectedGenre);
                  setSelectedGenre(null);
                }}
              >
                Remove
              </button>
            </div>
          </div>
          <div className="ap-tracks-section">
            {loadingStreams ? (
              <div className="ap-loading">
                <div className="ap-loading-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <p>Searching streams…</p>
              </div>
            ) : allSongs.length === 0 ? (
              <div className="ap-loading">
                <p>
                  {ytdlpAvailable
                    ? "No songs found for this genre"
                    : "yt-dlp required to stream"}
                </p>
              </div>
            ) : (
              <>
                <div className="ap-tracks-header">
                  <span>#</span>
                  <span style={{ gridColumn: "span 2" }}>Title</span>
                  <span>Album</span>
                  <span style={{ textAlign: "right" }}>Time</span>
                  <span style={{ textAlign: "center" }}>Src</span>
                </div>
                {allSongs.map((song, i) => (
                  <div
                    key={song.id}
                    onClick={() => handlePlaySong(song)}
                    className={`ap-track-row${currentSong?.id === song.id ? " active" : ""}`}
                  >
                    <div className="ap-track-num">
                      {currentSong?.id === song.id && isPlaying ? (
                        <span className="ap-track-playing">▶</span>
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>
                    <div
                      className="ap-track-thumb"
                      style={{
                        background: song.grad || randomGradient(song.title),
                      }}
                    >
                      {song.artwork ? (
                        <img src={song.artwork} alt="" />
                      ) : song.videoId && song.source === "youtube" ? (
                        <img
                          src={`https://i.ytimg.com/vi/${song.videoId}/default.jpg`}
                          alt=""
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        song.emoji || "🎵"
                      )}
                    </div>
                    <div className="ap-track-title-col">
                      <div
                        className="ap-track-title"
                        style={{
                          color:
                            currentSong?.id === song.id
                              ? "var(--accent2)"
                              : "var(--text)",
                        }}
                      >
                        {song.title}
                      </div>
                    </div>
                    <div className="ap-track-album">{song.album || "—"}</div>
                    <div className="ap-track-dur">
                      {song.dur || formatDuration(song.duration || 0)}
                    </div>
                    <div className="ap-track-src">
                      <span
                        className={`ap-badge ${song.source === "youtube" ? "yt" : song.source === "soundcloud" ? "sc" : "local"}`}
                      >
                        {song.source === "youtube"
                          ? "YT"
                          : song.source === "soundcloud"
                            ? "SC"
                            : "Local"}
                      </span>
                    </div>
                  </div>
                ))}
                {loadingMore && (
                  <div className="ap-loading-more">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="2"
                      width="18"
                      height="18"
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
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ap-page">
      <div className="ap-container">
        {!ytdlpAvailable && (
          <div
            style={{
              padding: "8px 16px",
              margin: "1rem 0",
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
            <span>⚠️</span> yt-dlp not installed. Genre streaming unavailable.
            Run: pip install yt-dlp
          </div>
        )}
        <div className="ap-page-header">
          <div className="ap-page-header-top">
            <div>
              <div className="ap-page-eyebrow">Discovery</div>
              <h1 className="ap-page-title">
                For You
                {filteredGenres.length > 0 && (
                  <span className="ap-page-count">{filteredGenres.length}</span>
                )}
              </h1>
            </div>
            <div className="ap-page-controls">
              <div className="ap-search-wrap">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text3)"
                  strokeWidth="2"
                  width="13"
                  height="13"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Filter genres…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                className="ap-add-btn"
                onClick={() => {
                  if (!ytdlpAvailable) return;
                  setShowAddModal(true);
                }}
                style={{
                  opacity: ytdlpAvailable ? 1 : 0.5,
                  cursor: ytdlpAvailable ? "pointer" : "not-allowed",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  width="13"
                  height="13"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Genre
              </button>
            </div>
          </div>
        </div>

        {addedGenres.length === 0 ? (
          <div className="ap-empty">
            <div className="ap-empty-icon">🎧</div>
            <div className="ap-empty-text">No genres added yet</div>
            <div className="ap-empty-sub">
              Click "Add Genre" to start building your collection
            </div>
            <button
              className="ap-add-btn"
              style={{ marginTop: 16 }}
              onClick={() => {
                if (!ytdlpAvailable) return;
                setShowAddModal(true);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                width="13"
                height="13"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Genre
            </button>
          </div>
        ) : (
          <div className="ap-grid">
            {filteredGenres.map((genre, idx) => {
              const count = songs.filter(
                (s) => s.genre?.toLowerCase() === genre.toLowerCase(),
              ).length;
              return (
                <div
                  key={genre}
                  className="ap-card"
                  onClick={() => {
                    if (!ytdlpAvailable) return;
                    setSelectedGenre(genre);
                  }}
                  style={{
                    animationDelay: `${idx * 0.03}s`,
                    opacity: ytdlpAvailable ? 1 : 0.6,
                    cursor: ytdlpAvailable ? "pointer" : "default",
                  }}
                >
                  <div
                    className="ap-card-avatar"
                    style={{ background: randomGradient(genre) }}
                  >
                    <span>🎵</span>
                    <div className="ap-card-overlay">
                      <svg
                        viewBox="0 0 24 24"
                        fill="white"
                        width="20"
                        height="20"
                      >
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    </div>
                  </div>
                  <div className="ap-card-info">
                    <div
                      className="ap-card-name"
                      style={{ textTransform: "capitalize" }}
                    >
                      {genre}
                    </div>
                    <div className="ap-card-meta">{count} tracks · Added</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <>
          <div
            className="ap-modal-overlay"
            onClick={() => setShowAddModal(false)}
          />
          <div className="ap-modal">
            <div className="ap-modal-header">
              <div className="ap-modal-title-row">
                <h2 className="ap-modal-title">Add Genre</h2>
                <button
                  className="ap-modal-close"
                  onClick={() => setShowAddModal(false)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="14"
                    height="14"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="ap-modal-search-wrap">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text3)"
                  strokeWidth="2"
                  width="14"
                  height="14"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  placeholder="Search genres…"
                  value={addSearchQuery}
                  onChange={(e) => setAddSearchQuery(e.target.value)}
                  className="ap-modal-input"
                />
              </div>
            </div>
            <div className="ap-modal-results">
              {availableGenres.map((genre) => {
                const count = songs.filter(
                  (s) => s.genre?.toLowerCase() === genre.toLowerCase(),
                ).length;
                return (
                  <div key={genre} className="ap-modal-row">
                    <div className="ap-modal-artist-info">
                      <div
                        className="ap-modal-avatar"
                        style={{ background: randomGradient(genre) }}
                      >
                        🎵
                      </div>
                      <div>
                        <div
                          className="ap-modal-artist-name"
                          style={{ textTransform: "capitalize" }}
                        >
                          {genre}
                        </div>
                        <div className="ap-modal-artist-src">
                          {count} tracks in library
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        addGenre(genre);
                        setAddSearchQuery("");
                      }}
                      className="ap-follow-btn"
                    >
                      Add
                    </button>
                  </div>
                );
              })}
              {addSearchQuery && availableGenres.length === 0 && (
                <div className="ap-modal-empty">No genres found</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ForYouPage;
