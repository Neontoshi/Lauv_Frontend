import React from "react";
import { Song } from "../../../core/entities/Song";
import { usePlayerStore } from "../../stores/playerStore";
import { useLibraryStore } from "../../stores/libraryStore";

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
        animationDelay: "0.2s",
        height: "14px",
      }}
    />
    <div
      style={{
        width: "3px",
        background: "var(--accent)",
        borderRadius: "1px",
        animation: "barBounce 0.8s ease-in-out infinite",
        animationDelay: "0.4s",
        height: "14px",
      }}
    />
  </div>
);

interface SongRowProps {
  song: Song;
  index: number;
  isCurrent: boolean;
  onPlay: () => void;
}

const SongRow: React.FC<SongRowProps> = ({
  song,
  index,
  isCurrent,
  onPlay,
}) => {
  const { toggleLike } = useLibraryStore();
  const { isPlaying } = usePlayerStore();
  const isLoading = usePlayerStore((s) => s.isLoading);
  const currentSongId = usePlayerStore((s) => s.currentSong?.id);
  const isThisSongLoading = isLoading && currentSongId === song.id;
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isDownloaded, setIsDownloaded] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = React.useState(false);
  const [playlists, setPlaylists] = React.useState<any[]>([]);
  const playlistMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (song.videoId) {
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke("check_download_exists", { videoId: song.videoId })
          .then((exists) => setIsDownloaded(exists as boolean))
          .catch(() => {});
      });
    }
  }, [song.videoId]);

  React.useEffect(() => {
    if (showPlaylistMenu) {
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke("get_playlists").then((data: any) => setPlaylists(data || []));
      });
    }
  }, [showPlaylistMenu]);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        playlistMenuRef.current &&
        !playlistMenuRef.current.contains(e.target as Node)
      ) {
        setShowPlaylistMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(song.id);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!song.videoId || song.source !== "youtube" || isDownloading) return;
    setIsDownloading(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("youtube_download", {
        videoId: song.videoId,
        title: song.title,
      });
      setIsDownloaded(true);
      usePlayerStore.getState().setMessage(`Downloaded "${song.title}"`);
      useLibraryStore.getState().setTriggerReload();
    } catch (err) {
      console.error("Download failed:", err);
      usePlayerStore.getState().setError(String(err));
    } finally {
      setIsDownloading(false);
    }
  };

  const isYouTube = song.source === "youtube";

  const renderThumb = () => {
    if (song.artwork) {
      return (
        <img
          src={song.artwork}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "6px",
          }}
        />
      );
    }
    if (isYouTube && song.videoId) {
      return (
        <img
          src={`https://i.ytimg.com/vi/${song.videoId}/default.jpg`}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "6px",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      );
    }
    return song.emoji;
  };

  return (
    <div
      className={`song-row ${isCurrent ? "playing" : ""}`}
      onClick={onPlay}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="song-num">
        {isThisSongLoading ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="14"
            height="14"
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
        ) : isCurrent && isPlaying ? (
          <PlayingBars />
        ) : isHovered ? (
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        ) : (
          index + 1
        )}
      </div>
      <div className="song-thumb">
        <div className="song-thumb-inner" style={{ background: song.grad }}>
          {renderThumb()}
        </div>
      </div>
      <div className="song-info">
        <div className="song-name">
          {song.title}
          {isYouTube && <span className="yt-badge">YT</span>}
        </div>
        <div className="song-artist">{song.artist}</div>
      </div>
      <div className="song-album">{song.album}</div>
      <div className="song-dur">{song.dur}</div>
      <div className="song-actions">
        <div
          className={`sm-btn ${song.liked ? "liked" : ""}`}
          onClick={handleLike}
          title={song.liked ? "Unlike" : "Like"}
        >
          <svg
            viewBox="0 0 24 24"
            fill={song.liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </div>
        {isYouTube && (
          <div
            className="sm-btn"
            title={isDownloaded ? "Downloaded" : "Download"}
            onClick={handleDownload}
          >
            {isDownloading ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
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
            ) : isDownloaded ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                color="var(--accent2)"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
          </div>
        )}

        <div
          className="sm-btn"
          title="Add to playlist"
          onClick={(e) => {
            e.stopPropagation();
            setShowPlaylistMenu(!showPlaylistMenu);
          }}
          style={{ position: "relative" }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {showPlaylistMenu && (
            <div
              ref={playlistMenuRef}
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                zIndex: 100,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "4px",
                minWidth: "180px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}
            >
              {playlists.length === 0 ? (
                <div
                  style={{
                    padding: "8px 12px",
                    fontSize: "11px",
                    color: "var(--text3)",
                  }}
                >
                  No playlists
                </div>
              ) : (
                playlists.map((pl: any) => (
                  <div
                    key={pl.id}
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const { invoke } = await import("@tauri-apps/api/core");
                        await invoke("add_to_playlist", {
                          playlistId: pl.id,
                          songId: song.id,
                          title: song.title,
                          artist: song.artist,
                          album: song.album || "",
                          durationSecs: song.duration || 0,
                          thumbnail:
                            song.artwork ||
                            (song.videoId
                              ? `https://i.ytimg.com/vi/${song.videoId}/default.jpg`
                              : ""),
                          videoId: song.videoId || undefined,
                          source: song.source || "local",
                          path: song.path || "",
                        });
                        setShowPlaylistMenu(false);
                        usePlayerStore
                          .getState()
                          .setMessage(`Added to ${pl.name}`);
                      } catch (err) {
                        console.error("Failed to add to playlist:", err);
                      }
                    }}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      fontSize: "12px",
                      color: "var(--text2)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--surface2)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {pl.name}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="sm-btn" title="More options">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="5" r="1" fill="currentColor" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="19" r="1" fill="currentColor" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default SongRow;
