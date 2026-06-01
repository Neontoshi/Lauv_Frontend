import { useParams, useNavigate, useLocation } from "react-router-dom";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";

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

const splitArtists = (name: string): string[] => {
  return name
    .split(/[,;&]|\band\b|\bfeat\.?\b|\bft\.?\b|\bx\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 100);
};

const mapYtSong = (r: any): Song => ({
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
});

const YT_SEARCH_QUERIES = [
  (artist: string) => artist,
  (artist: string) => `${artist} music`,
  (artist: string) => `${artist} official`,
  (artist: string) => `${artist} audio`,
  (artist: string) => `${artist} vevo`,
  (artist: string) => `${artist} feat`,
  (artist: string) => `${artist} featuring`,
  (artist: string) => `${artist} ft`,
];

const ArtistsPage: React.FC = () => {
  const { songs } = useLibraryStore();
  const { currentSong, setCurrentSong, setProgress, isPlaying } =
    usePlayerStore();
  const { setQueue } = useQueueStore();
  const { artistName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname.startsWith("/artists");
  const selectedArtist = artistName ? decodeURIComponent(artistName) : null;
  const [searchQuery, setSearchQuery] = useState("");
  const [ytArtistSongs, setYtArtistSongs] = useState<Song[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreYt, setHasMoreYt] = useState(true);
  const [savedArtists, setSavedArtists] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [addSearchResults, setAddSearchResults] = useState<any[]>([]);
  const [addingArtist, setAddingArtist] = useState(false);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const addSearchTimeout = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const queryFailCount = useRef<Set<number>>(new Set());
  const hasMoreYtRef = useRef(true);
  const abortRef = useRef<number>(0);

  useEffect(() => {
    tauriCommands
      .getSavedArtists()
      .then((artists) => {
        setSavedArtists(artists);
        setFollowedIds(new Set(artists.map((a: any) => a.artist_id)));
      })
      .catch(() => {});
  }, []);

  const allArtists = useMemo(() => {
    return savedArtists
      .map((a: any) => ({
        key: a.artist_id,
        name: a.name,
        source: a.source || "youtube",
        thumbnail: a.thumbnail,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [savedArtists]);

  const selectedArtistKey =
    allArtists.find((a) => a.name === selectedArtist)?.key ?? "";

  const filteredArtists = searchQuery
    ? allArtists.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : allArtists;

  const selectedLocalSongs = selectedArtist
    ? songs.filter((s) => {
        if (s.source === "youtube" || s.source === "soundcloud") return false;
        const searchName = selectedArtist.toLowerCase().replace(/-/g, " ");
        const artists = splitArtists(s.artist || "").map((a) =>
          a.toLowerCase(),
        );
        return artists.some(
          (a) => a.includes(searchName) || searchName.includes(a),
        );
      })
    : [];

  useEffect(() => {
    if (selectedArtist) {
      const generation = ++abortRef.current;
      setYtArtistSongs([]);
      setHasMoreYt(true);
      seenIds.current = new Set();
      queryFailCount.current = new Set();
      setLoadingStreams(true);
      loadArtistStreams(selectedArtist, 1, true, generation);
    }
  }, [selectedArtist]);

  useEffect(() => {
    hasMoreYtRef.current = hasMoreYt;
  }, [hasMoreYt]);

  const loadArtistStreams = async (
    artist: string,
    page: number,
    reset: boolean,
    generation: number,
  ) => {
    if (generation !== abortRef.current) return;
    if (!reset) setLoadingMore(true);
    try {
      if (hasMoreYtRef.current) {
        const queryIdx = (page - 1) % YT_SEARCH_QUERIES.length;
        const ytQuery = YT_SEARCH_QUERIES[queryIdx](artist);
        const yt = await tauriCommands.searchYoutube(ytQuery);
        if (generation !== abortRef.current) return;

        const newYt = yt.filter((r: any) => {
          const id = `yt-${r.id}`;
          const cleanTitle = r.title
            ?.toLowerCase()
            .trim()
            .replace(/\s*\(.*?\)\s*/g, "")
            .replace(/\s*\[.*?\]\s*/g, "")
            .replace(/\s*\|.*$/g, "")
            .replace(/\s+/g, " ")
            .trim();
          const cleanArtist = r.artist
            ?.toLowerCase()
            .trim()
            .replace(/\s*-\s*topic\s*$/i, "")
            .replace(/\s*vevo\s*$/i, "")
            .replace(/\s*official\s*$/i, "")
            .trim();
          const titleKey = `${cleanTitle}|${cleanArtist}`;
          if (seenIds.current.has(id) || seenIds.current.has(titleKey))
            return false;
          const dur = r.duration_secs;
          if (!dur || dur < 60 || dur > 420) return false;
          seenIds.current.add(id);
          seenIds.current.add(titleKey);
          return true;
        });

        if (newYt.length === 0) {
          queryFailCount.current.add(queryIdx);
          if (queryFailCount.current.size >= YT_SEARCH_QUERIES.length)
            setHasMoreYt(false);
        } else queryFailCount.current.clear();

        if (reset) setYtArtistSongs(newYt.map(mapYtSong));
        else setYtArtistSongs((prev) => [...prev, ...newYt.map(mapYtSong)]);
      }

      if (hasMoreYtRef.current) {
        setTimeout(
          () => loadArtistStreams(artist, page + 1, false, generation),
          500,
        );
      }
    } catch (err) {
      if (generation === abortRef.current)
        console.error("Failed to load artist streams:", err);
    } finally {
      if (generation === abortRef.current) {
        setLoadingStreams(false);
        setLoadingMore(false);
      }
    }
  };

  const handleAddSearch = (query: string) => {
    setAddSearchQuery(query);
    if (addSearchTimeout.current) clearTimeout(addSearchTimeout.current);
    if (!query.trim()) {
      setAddSearchResults([]);
      return;
    }
    addSearchTimeout.current = window.setTimeout(async () => {
      try {
        setAddSearchResults(await tauriCommands.searchArtistForSave(query));
      } catch (err) {
        console.error("Add artist search failed:", err);
      }
    }, 400);
  };

  const handleSaveArtist = async (artist: any) => {
    if (addingArtist) return;
    setAddingArtist(true);
    try {
      await tauriCommands.saveArtist(
        artist.name,
        artist.thumbnail || null,
        artist.source || "youtube",
      );
      setFollowedIds((prev) => new Set(prev).add(artist.artist_id));
      setSavedArtists(await tauriCommands.getSavedArtists());
    } catch (err) {
      console.error("Failed to save artist:", err);
    } finally {
      setAddingArtist(false);
    }
  };

  const handleRemoveArtist = async (artistKey: string) => {
    try {
      await tauriCommands.removeArtist(artistKey);
      setFollowedIds((prev) => {
        const next = new Set(prev);
        next.delete(artistKey);
        return next;
      });
      setSavedArtists(await tauriCommands.getSavedArtists());
    } catch (err) {
      console.error("Failed to remove artist:", err);
    }
  };

  const allArtistSongs = [...selectedLocalSongs, ...ytArtistSongs];

  const handlePlayAll = () => {
    if (allArtistSongs.length > 0) {
      setQueue(allArtistSongs, allArtistSongs[0], "library");
      setCurrentSong(allArtistSongs[0]);
      setProgress(0);
    }
  };

  const handlePlaySong = (song: Song) => {
    setQueue(allArtistSongs, song, "library");
    setCurrentSong(song);
    setProgress(0);
  };

  const totalDuration = allArtistSongs.reduce(
    (acc, s) => acc + (s.duration || 0),
    0,
  );
  const albumCount = [
    ...new Set(selectedLocalSongs.map((s) => s.album).filter(Boolean)),
  ].length;

  return (
    <div style={{ display: isActive ? "block" : "none", height: "100%" }}>
      {selectedArtist ? (
        /* ─── ARTIST DETAIL VIEW ─── */
        <div className="ap-detail" ref={scrollRef}>
          <div className="ap-detail-inner">
            {/* Back button */}
            <button className="ap-back" onClick={() => navigate("/artists")}>
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
              Artists
            </button>

            {/* Hero banner */}
            <div
              className="ap-hero"
              style={{ background: randomGradient(selectedArtist) }}
            >
              <div className="ap-hero-noise" />
              <div className="ap-hero-content">
                <div
                  className="ap-hero-avatar"
                  style={{
                    background: randomGradient(selectedArtist + "_inner"),
                  }}
                >
                  <span>🎤</span>
                </div>
                <div className="ap-hero-meta">
                  <div className="ap-hero-eyebrow">Artist</div>
                  <h1 className="ap-hero-name">{selectedArtist}</h1>
                  <div className="ap-hero-stats">
                    <div className="ap-stat">
                      <span className="ap-stat-val">
                        {allArtistSongs.length}
                      </span>
                      <span className="ap-stat-lbl">Tracks</span>
                    </div>
                    {selectedLocalSongs.length > 0 && (
                      <div className="ap-stat">
                        <span className="ap-stat-val">
                          {selectedLocalSongs.length}
                        </span>
                        <span className="ap-stat-lbl">Local</span>
                      </div>
                    )}
                    <div className="ap-stat">
                      <span className="ap-stat-val ap-stat-yt">
                        {ytArtistSongs.length}
                      </span>
                      <span className="ap-stat-lbl">YouTube</span>
                    </div>
                    {albumCount > 0 && (
                      <div className="ap-stat">
                        <span className="ap-stat-val">{albumCount}</span>
                        <span className="ap-stat-lbl">Albums</span>
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
                </div>
              </div>

              {/* Action buttons in hero */}
              <div className="ap-hero-actions">
                {allArtistSongs.length > 0 && !loadingStreams && (
                  <button className="ap-play-all" onClick={handlePlayAll}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      width="14"
                      height="14"
                    >
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                    Play All
                    <span className="ap-play-count">
                      {allArtistSongs.length}
                    </span>
                  </button>
                )}
                {savedArtists.some(
                  (a: any) => a.artist_id === selectedArtistKey,
                ) && (
                  <button
                    className="ap-unfollow"
                    onClick={() => handleRemoveArtist(selectedArtistKey)}
                  >
                    Unfollow
                  </button>
                )}
              </div>
            </div>

            {/* Track list */}
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
              ) : (
                <>
                  {/* Column headers */}
                  {allArtistSongs.length > 0 && (
                    <div className="ap-tracks-header">
                      <span>#</span>
                      <span style={{ gridColumn: "span 2" }}>Title</span>
                      <span>Album</span>
                      <span style={{ textAlign: "right" }}>Time</span>
                      <span style={{ textAlign: "center" }}>Src</span>
                    </div>
                  )}

                  {allArtistSongs.map((song, i) => (
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
                        ) : song.videoId ? (
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
                        {song.dur ||
                          (song.duration ? formatDuration(song.duration) : "—")}
                      </div>

                      <div className="ap-track-src">
                        <span className="ap-badge yt">YT</span>
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

                  {!hasMoreYt && !loadingMore && allArtistSongs.length > 0 && (
                    <div className="ap-end-marker">
                      <span />— end of results —<span />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ─── ARTISTS LIST VIEW ─── */
        <div className="ap-page">
          <div className="ap-container">
            {/* Header */}
            <div className="ap-page-header">
              <div className="ap-page-header-top">
                <div>
                  <div className="ap-page-eyebrow">Collection</div>
                  <h1 className="ap-page-title">
                    Artists
                    {filteredArtists.length > 0 && (
                      <span className="ap-page-count">
                        {filteredArtists.length}
                      </span>
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
                      placeholder="Filter artists…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="ap-add-btn"
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
                    Follow Artist
                  </button>
                </div>
              </div>
            </div>

            {/* Artists grid */}
            <div className="ap-grid">
              {filteredArtists.map((artist, idx) => (
                <div
                  key={artist.key}
                  className="ap-card"
                  onClick={() =>
                    navigate(`/artists/${encodeURIComponent(artist.name)}`)
                  }
                  style={{ animationDelay: `${idx * 0.03}s` }}
                >
                  <div
                    className="ap-card-avatar"
                    style={{ background: randomGradient(artist.name) }}
                  >
                    {artist.thumbnail ? (
                      <img src={artist.thumbnail} alt={artist.name} />
                    ) : (
                      <span>🎤</span>
                    )}
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
                    <div className="ap-card-name">{artist.name}</div>
                    <div className="ap-card-meta">
                      {artist.source === "soundcloud"
                        ? "SoundCloud"
                        : "YouTube"}{" "}
                      · Followed
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredArtists.length === 0 && (
              <div className="ap-empty">
                {searchQuery ? (
                  <>
                    <div className="ap-empty-icon">🔍</div>
                    <div className="ap-empty-text">
                      No artists match "{searchQuery}"
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ap-empty-icon">🎤</div>
                    <div className="ap-empty-text">No followed artists yet</div>
                    <div className="ap-empty-sub">
                      Click "Follow Artist" to start building your collection
                    </div>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="ap-add-btn"
                      style={{ marginTop: "16px" }}
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
                      Follow Artist
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Follow Artist Modal */}
          {showAddModal && (
            <>
              <div
                className="ap-modal-overlay"
                onClick={() => setShowAddModal(false)}
              />
              <div className="ap-modal">
                <div className="ap-modal-header">
                  <div className="ap-modal-title-row">
                    <h2 className="ap-modal-title">Follow Artist</h2>
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
                      placeholder="Search for an artist…"
                      value={addSearchQuery}
                      onChange={(e) => handleAddSearch(e.target.value)}
                      className="ap-modal-input"
                    />
                  </div>
                </div>
                <div className="ap-modal-results">
                  {addSearchResults.map((artist: any) => {
                    const isFollowed =
                      followedIds.has(artist.artist_id) ||
                      savedArtists.some(
                        (a: any) => a.artist_id === artist.artist_id,
                      );
                    return (
                      <div key={artist.artist_id} className="ap-modal-row">
                        <div className="ap-modal-artist-info">
                          <div
                            className="ap-modal-avatar"
                            style={{ background: randomGradient(artist.name) }}
                          >
                            🎤
                          </div>
                          <div>
                            <div className="ap-modal-artist-name">
                              {artist.name}
                            </div>
                            <div className="ap-modal-artist-src">
                              {artist.source === "soundcloud"
                                ? "SoundCloud"
                                : "YouTube"}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSaveArtist(artist)}
                          disabled={addingArtist || isFollowed}
                          className={`ap-follow-btn${isFollowed ? " followed" : ""}`}
                        >
                          {isFollowed ? "✓ Followed" : "Follow"}
                        </button>
                      </div>
                    );
                  })}
                  {addSearchQuery && addSearchResults.length === 0 && (
                    <div className="ap-modal-empty">No artists found</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ArtistsPage;
