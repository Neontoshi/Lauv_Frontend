import React, { useEffect } from "react";
import LibraryView from "../components/Library/LibraryView";
import NowPlayingPanel from "../components/Player/NowPlayingPanel";
import { useUIStore } from "../stores/uiStore";
import { useLibrary } from "../hooks/useLibrary";
import { useLibraryStore } from "../stores/libraryStore";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

const SongsPage: React.FC = () => {
  const { loading, error, reloadSongs } = useLibrary();
  const { setSearchQuery, setActiveSort } = useLibraryStore();
  const { isEQPanelOpen, toggleEQPanel } = useUIStore();

  useKeyboardShortcuts();

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
  }, [setSearchQuery]);

  useEffect(() => {
    const sortSelect = document.getElementById(
      "sortSelect",
    ) as HTMLSelectElement;
    if (sortSelect) {
      const handleSort = (e: Event) => {
        setActiveSort((e.target as HTMLSelectElement).value);
      };
      sortSelect.addEventListener("change", handleSort);
      return () => sortSelect.removeEventListener("change", handleSort);
    }
  }, [setActiveSort]);

  return (
    <>
      {/* Top Bar */}
      <div className="top-bar">
        <div className="search-wrap">
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
            id="searchInput"
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--text3)",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            SORT
          </span>
          <select
            id="sortSelect"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text2)",
              fontFamily: "'Syne', sans-serif",
              fontSize: "12px",
              padding: "6px 10px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="default">Default</option>
            <option value="title">Title A–Z</option>
            <option value="artist">Artist</option>
            <option value="duration">Duration</option>
            <option value="liked">Liked First</option>
          </select>
        </div>

        <div className="top-actions">
          <div className="icon-btn" title="Equalizer" onClick={toggleEQPanel}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </div>
          <div className="icon-btn" title="Notifications">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </div>
        </div>
      </div>

      {/* EQ Panel */}
      {isEQPanelOpen && (
        <div
          style={{
            padding: "16px 24px",
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              width: "100%",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "var(--text3)",
                fontFamily: "'DM Mono', monospace",
                textTransform: "uppercase",
                letterSpacing: "1px",
                minWidth: "80px",
              }}
            >
              Equalizer
            </span>
            <div
              style={{
                display: "flex",
                gap: "16px",
                alignItems: "flex-end",
                flex: 1,
              }}
            >
              {["60Hz", "230Hz", "910Hz", "3kHz", "14kHz"].map((freq, i) => (
                <div
                  key={freq}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    defaultValue={[3, 1, 0, -2, 2][i]}
                    style={{
                      writingMode: "vertical-lr",
                      direction: "rtl",
                      height: "60px",
                      cursor: "pointer",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "10px",
                      color: "var(--text3)",
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {[3, 1, 0, -2, 2][i] > 0 ? "+" : ""}
                    {[3, 1, 0, -2, 2][i]}dB
                  </span>
                  <span
                    style={{
                      fontSize: "9px",
                      color: "var(--text3)",
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {freq}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
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
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ color: "var(--red)" }}>Error: {error}</div>
          <button
            onClick={() => reloadSongs()}
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 16px",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div className="content-area">
          <LibraryView />
          <NowPlayingPanel showLyrics={false} />
        </div>
      )}
    </>
  );
};

export default SongsPage;
