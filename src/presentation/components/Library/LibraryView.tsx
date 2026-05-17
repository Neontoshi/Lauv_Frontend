import React, { useState, useEffect, useMemo } from "react";
import SongRow from "./SongRow";
import { useLibrary } from "../../hooks/useLibrary";
import { usePlayerStore } from "../../stores/playerStore";
import { useUIStore } from "../../stores/uiStore";
import { useYouTubeStore } from "../../stores/youtubeStore";
import { GENRES } from "../../../lib/constants";
import { Song } from "../../../core/entities/Song";
import { useQueueStore } from "../../stores/queueStore";

const LibraryView: React.FC = () => {
  const {
    songs: localSongs,
    activeGenre,
    searchQuery,
    setSearchQuery,
    setActiveGenre,
    setActiveSort,
    loading,
  } = useLibrary();
  const { setCurrentSong, setProgress, currentSong } = usePlayerStore();
  const { libraryView, setLibraryView } = useUIStore();
  const { setQueue } = useQueueStore();
  const {
    results: ytSongs,
    isSearching,
    isLoadingMore,
    search: searchYouTube,
    loadMore,
  } = useYouTubeStore();

  const [sortChip, setSortChip] = useState("#");

  // Merge local + YouTube results
  const allSongs: Song[] = useMemo(() => {
    if (searchQuery.trim()) {
      // When searching, merge both sources. Local first, then YouTube.
      return [...localSongs, ...ytSongs];
    }
    return localSongs;
  }, [localSongs, ytSongs, searchQuery]);

  // Trigger YouTube search when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      searchYouTube(searchQuery);
    }
  }, [searchQuery]);

  // Calculate total duration (local only)
  const totalDuration = localSongs.reduce((acc, song) => {
    const parts = song.dur.split(":");
    return acc + parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }, 0);

  const totalHours = Math.floor(totalDuration / 3600);
  const totalMinutes = Math.floor((totalDuration % 3600) / 60);

  const handlePlaySong = (song: Song) => {
    if (song.source === "youtube") {
      setQueue(allSongs, song, "search");
    } else {
      setQueue(allSongs, song, "library");
    }
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

  useEffect(() => {
    const sortSelect = document.getElementById(
      "sortSelect",
    ) as HTMLSelectElement;
    if (sortSelect) {
      const handleSortChange = (e: Event) => {
        setActiveSort((e.target as HTMLSelectElement).value);
      };
      sortSelect.addEventListener("change", handleSortChange);
      return () => sortSelect.removeEventListener("change", handleSortChange);
    }
  }, []);

  useEffect(() => {
    const searchInput = document.getElementById(
      "searchInput",
    ) as HTMLInputElement;
    if (searchInput) {
      const handleSearch = (e: Event) => {
        setSearchQuery((e.target as HTMLInputElement).value);
      };
      searchInput.addEventListener("input", handleSearch);
      return () => searchInput.removeEventListener("input", handleSearch);
    }
  }, []);

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
    <div className="song-list-pane">
      {/* Header */}
      <div className="section-header">
        <div>
          <div className="section-title">Your Library</div>
          <div className="section-sub">
            {localSongs.length} songs · {totalHours}h {totalMinutes}m
            {isSearching && (
              <span style={{ marginLeft: 8, color: "var(--accent)" }}>
                · Searching YouTube...
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

      {/* Genre Filters */}
      <div className="genre-filters">
        {GENRES.map((genre) => (
          <div
            key={genre}
            className={`genre-chip ${activeGenre === genre ? "active" : ""}`}
            onClick={() => setActiveGenre(genre)}
          >
            {genre}
          </div>
        ))}
      </div>

      {/* Sort Row */}
      <div className="sort-row">
        {["#", "Title", "Artist", "Album", "Duration", "Plays"].map((chip) => (
          <div
            key={chip}
            className={`sort-chip ${sortChip === chip ? "active" : ""}`}
            onClick={() => handleSortChip(chip)}
          >
            {chip}
          </div>
        ))}
      </div>

      {/* Song List */}
      {allSongs.length === 0 ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "var(--text3)",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {searchQuery.trim() ? "No results found" : "No songs found"}
        </div>
      ) : (
        <>
          {allSongs.map((song, idx) => (
            <SongRow
              key={song.id}
              song={song}
              index={idx}
              isCurrent={currentSong?.id === song.id}
              onPlay={() => handlePlaySong(song)}
            />
          ))}
          {searchQuery.trim() && ytSongs.length > 0 && (
            <div style={{ padding: "16px", textAlign: "center" }}>
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 24px",
                  color: "var(--text2)",
                  cursor: isLoadingMore ? "not-allowed" : "pointer",
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "13px",
                  opacity: isLoadingMore ? 0.6 : 1,
                }}
              >
                {isLoadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LibraryView;
