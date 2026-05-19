import React, { useEffect } from "react";
import LibraryView from "../components/Library/LibraryView";
import NowPlayingPanel from "../components/Player/NowPlayingPanel";
import { useLibrary } from "../hooks/useLibrary";
import { useLibraryStore } from "../stores/libraryStore";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

const SongsPage: React.FC = () => {
  const { loading, error, reloadSongs } = useLibrary();
  const { setActiveSort } = useLibraryStore();

  useKeyboardShortcuts();

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

  if (error) {
    return (
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
    );
  }

  return (
    <div className="content-area">
      <LibraryView />
      <NowPlayingPanel showLyrics={false} />
    </div>
  );
};

export default SongsPage;
