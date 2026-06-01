import React, { useState, useEffect, useMemo } from "react";
import SongRow from "./SongRow";
import { useLibrary } from "../../hooks/useLibrary";
import { usePlayerStore } from "../../stores/playerStore";
import { useUIStore } from "../../stores/uiStore";
import { useYouTubeStore } from "../../stores/youtubeStore";
import { Song } from "../../../core/entities/Song";
import { useQueueStore } from "../../stores/queueStore";
import { useLibraryStore } from "../../stores/libraryStore";
import { tauriCommands } from "../../../services/tauriBridge";

type SearchTab = "library" | "youtube" | "soundcloud";

const LibraryView: React.FC = () => {
  const { songs: localSongs, setActiveSort, loading } = useLibrary();
  const { searchQuery, setSearchQuery } = useUIStore();
  const { setSearchQuery: setLibSearchQuery } = useLibraryStore();
  const { setCurrentSong, setProgress, currentSong } = usePlayerStore();
  const { libraryView, setLibraryView } = useUIStore();
  const { setQueue } = useQueueStore();
  const {
    results: ytSongs,
    isSearching,
    search: searchYouTube,
  } = useYouTubeStore();

  const [sortChip, setSortChip] = useState("#");
  const [activeTab, setActiveTab] = useState<SearchTab>("library");
  const [scSongs, setScSongs] = useState<Song[]>([]);
  const [isScSearching, setIsScSearching] = useState(false);

  const isSearching_ = searchQuery.trim().length > 0;

  useEffect(() => {
    setLibSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setActiveTab("library");
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!searchQuery.trim()) return;
    const timer = setTimeout(() => {
      searchYouTube(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const timer = setTimeout(() => {
      setIsScSearching(true);
      tauriCommands
        .searchSoundcloud(searchQuery)
        .then((results: any[]) => {
          setScSongs(
            results.map((r: any) => ({
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
              emoji: "☁️",
              grad: "linear-gradient(135deg, #ff8800, #ff5500)",
              bpm: 0,
              key: "—",
              plays: 0,
              liked: false,
            })) || [],
          );
          setIsScSearching(false);
        })
        .catch(() => setIsScSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displaySongs: Song[] = useMemo(() => {
    if (!isSearching_) return localSongs;
    if (activeTab === "library") return localSongs;
    if (activeTab === "youtube") {
      const librarySongs = useLibraryStore.getState().songs;
      const likedIds = new Set(
        librarySongs.filter((s) => s.liked).map((s) => s.id),
      );
      return ytSongs.map((s) => ({ ...s, liked: likedIds.has(s.id) }));
    }
    if (activeTab === "soundcloud") {
      const librarySongs = useLibraryStore.getState().songs;
      const likedIds = new Set(
        librarySongs.filter((s) => s.liked).map((s) => s.id),
      );
      return scSongs.map((s) => ({ ...s, liked: likedIds.has(s.id) }));
    }
    return [];
  }, [localSongs, ytSongs, scSongs, activeTab, isSearching_]);

  const totalDuration = localSongs.reduce((acc, song) => {
    const parts = song.dur.split(":");
    return acc + parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }, 0);
  //@ts-ignore
  const _totalHours = Math.floor(totalDuration / 3600);
  //@ts-ignore
  const _totalMinutes = Math.floor((totalDuration % 3600) / 60);

  const handlePlaySong = (song: Song) => {
    const combined = [...localSongs, ...ytSongs, ...scSongs];
    setQueue(
      combined,
      song,
      activeTab === "youtube"
        ? "search"
        : activeTab === "soundcloud"
          ? "search"
          : "library",
    );
    setCurrentSong(song);
    setProgress(0);
  };

  const handleSortChip = (chip: string) => {
    setSortChip(chip);
    if (chip === "#") setActiveSort("default");
    else if (chip === "Title") setActiveSort("title");
    else if (chip === "Artist") setActiveSort("artist");
    else if (chip === "Album") setActiveSort("album");
    else if (chip === "Duration") setActiveSort("duration");
    else if (chip === "Plays") setActiveSort("plays");
  };

  if (loading) {
    return (
      <div className="song-list-pane">
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "var(--text3)",
          }}
        >
          Loading songs...
        </div>
      </div>
    );
  }

  return (
    <div
      className="song-list-pane"
      style={{
        overflow: "visible",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#0a0a0f",
          padding: "0 0 16px 0",
          flexShrink: 0,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="search-wrap" style={{ maxWidth: "100%" }}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="Search songs, artists, albums…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div style={{ overflowY: "auto", flex: 1, paddingTop: "16px" }}>
        <div className="section-header">
          <div>
            <div className="section-title">Your Library</div>
            <div className="section-sub">
              {isSearching_
                ? `${localSongs.length + ytSongs.length + scSongs.length} results`
                : `${localSongs.length} songs`}
              {isSearching && (
                <span style={{ marginLeft: 8, color: "var(--accent)" }}>
                  · Searching...
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <div
              className="icon-btn"
              title="Shuffle all"
              style={{ width: "32px", height: "32px" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="15"
                height="15"
              >
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
              </svg>
            </div>
            <div
              className="icon-btn"
              title="Add to library"
              style={{ width: "32px", height: "32px" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="15"
                height="15"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div className="view-toggle">
              <div
                className={`view-btn ${libraryView === "list" ? "active" : ""}`}
                onClick={() => setLibraryView("list")}
                title="List view"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </div>
              <div
                className={`view-btn ${libraryView === "grid" ? "active" : ""}`}
                onClick={() => setLibraryView("grid")}
                title="Grid view"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="sort-row">
          {["#", "Title", "Artist", "Album", "Duration", "Plays"].map(
            (chip) => (
              <div
                key={chip}
                className={`sort-chip ${sortChip === chip ? "active" : ""}`}
                onClick={() => handleSortChip(chip)}
              >
                {chip}
              </div>
            ),
          )}
        </div>

        {isSearching_ && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "12px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <button
              onClick={() => setActiveTab("library")}
              style={{
                padding: "8px 24px",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === "library"
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                color: activeTab === "library" ? "var(--text)" : "var(--text3)",
                cursor: "pointer",
                fontFamily: "'Syne', sans-serif",
                fontSize: "13px",
                fontWeight: activeTab === "library" ? 600 : 400,
              }}
            >
              Library ({localSongs.length})
            </button>
            <button
              onClick={() => setActiveTab("youtube")}
              style={{
                padding: "8px 24px",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === "youtube"
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                color: activeTab === "youtube" ? "var(--text)" : "var(--text3)",
                cursor: "pointer",
                fontFamily: "'Syne', sans-serif",
                fontSize: "13px",
                fontWeight: activeTab === "youtube" ? 600 : 400,
              }}
            >
              YouTube{ytSongs.length > 0 ? ` (${ytSongs.length})` : ""}
              {isSearching && !ytSongs.length && " ···"}
            </button>
            <button
              onClick={() => setActiveTab("soundcloud")}
              style={{
                padding: "8px 24px",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === "soundcloud"
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                color:
                  activeTab === "soundcloud" ? "var(--text)" : "var(--text3)",
                cursor: "pointer",
                fontFamily: "'Syne', sans-serif",
                fontSize: "13px",
                fontWeight: activeTab === "soundcloud" ? 600 : 400,
              }}
            >
              SoundCloud{scSongs.length > 0 ? ` (${scSongs.length})` : ""}
              {isScSearching && !scSongs.length && " ···"}
            </button>
          </div>
        )}

        {displaySongs.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "var(--text3)",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {isSearching_
              ? activeTab === "youtube"
                ? isSearching
                  ? "Searching YouTube..."
                  : "No YouTube results"
                : activeTab === "soundcloud"
                  ? isScSearching
                    ? "Searching SoundCloud..."
                    : "No SoundCloud results"
                  : "No library matches"
              : "No songs found"}
          </div>
        ) : (
          displaySongs.map((song, idx) => (
            <SongRow
              key={song.id}
              song={song}
              index={idx}
              isCurrent={currentSong?.id === song.id}
              onPlay={() => handlePlaySong(song)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default LibraryView;
