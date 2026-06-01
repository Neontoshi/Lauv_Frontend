import React from "react";
import { Song } from "../../../core/entities/Song";
import { usePlayerStore } from "../../stores/playerStore";
import { useLibraryStore } from "../../stores/libraryStore";
import { tauriCommands } from "../../../services/tauriBridge";

// FIX #9: Define a Playlist type instead of any[]
interface Playlist {
  id: string;
  name: string;
}

const PlayingBars = () => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-end",
      gap: "2px",
      height: "14px",
    }}
  >
    {[0, 0.2, 0.4].map((delay, i) => (
      <div
        key={i}
        style={{
          width: "3px",
          background: "var(--accent)",
          borderRadius: "1px",
          height: "14px",
          animation: "barBounce 0.8s ease-in-out infinite",
          animationDelay: `${delay}s`,
        }}
      />
    ))}
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
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const setTriggerReload = useLibraryStore((s) => s.setTriggerReload);
  const likedIds = useLibraryStore(
    (s) => new Set(s.songs.filter((x) => x.liked).map((x) => x.id)),
  );
  const isLiked = likedIds.has(song.id) || song.liked;

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const currentSongId = usePlayerStore((s) => s.currentSong?.id);
  const setMessage = usePlayerStore((s) => s.setMessage);
  const setError = usePlayerStore((s) => s.setError);

  const isThisSongLoading =
    isLoading && currentSongId === song.id && !isPlaying;
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isDownloaded, setIsDownloaded] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = React.useState(false);
  const [playlists, setPlaylists] = React.useState<Playlist[]>([]);
  const playlistMenuRef = React.useRef<HTMLDivElement>(null);
  const isLikingRef = React.useRef(false);

  const isYouTube = song.source === "youtube";
  const isSoundCloud = song.source === "soundcloud";
  const isStreamable = isYouTube || isSoundCloud;

  React.useEffect(() => {
    let cancelled = false;
    if (!song.videoId) return;

    const check = isYouTube
      ? tauriCommands.checkDownloadExists(song.videoId)
      : isSoundCloud
        ? tauriCommands.checkSoundcloudDownloadExists(song.videoId)
        : null;

    check
      ?.then((exists) => {
        if (!cancelled) setIsDownloaded(exists);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [song.videoId, isYouTube, isSoundCloud]);

  React.useEffect(() => {
    if (!showPlaylistMenu) return;
    tauriCommands
      .getPlaylists()
      .then((data: Playlist[]) => setPlaylists(data || []))
      .catch(() => {});
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

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLikingRef.current) return;
    isLikingRef.current = true;

    if (isSoundCloud) {
      try {
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

        const store = useLibraryStore.getState();
        const exists = store.songs.find((s) => s.id === song.id);

        if (!exists) {
          store.setSongs([...store.songs, { ...song, liked: result }]);
        } else {
          store.setSongs(
            store.songs.map((s) =>
              s.id === song.id ? { ...s, liked: result } : s,
            ),
          );
        }
        store.filterAndSort();
        song.liked = result;
      } catch (err) {
        console.error("SC LIKE ERROR:", err);
        setError("Failed to save like");
      } finally {
        isLikingRef.current = false;
      }
    } else {
      try {
        toggleLike(song.id, isLiked ? undefined : song);
        await tauriCommands.toggleLike(song.id);
        if (!isLiked) {
          await tauriCommands.saveLikedSong({
            id: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album || "",
            durationSecs: song.duration || 0,
            thumbnail: song.artwork || "",
            videoId: song.videoId,
            source: song.source || "local",
            path: song.path || "",
          });
        }
      } catch (err) {
        console.error("Failed to toggle like:", err);
        toggleLike(song.id);
        setError("Failed to save like");
      } finally {
        isLikingRef.current = false;
      }
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!song.videoId || isDownloading || isDownloaded || !isStreamable) return;

    setIsDownloading(true);
    try {
      if (isYouTube) {
        await tauriCommands.downloadYoutube(song.videoId, song.title);
      } else if (isSoundCloud) {
        await tauriCommands.downloadSoundcloud(song.videoId, song.title);
      }
      setIsDownloaded(true);
      setMessage(`Downloaded "${song.title}"`);
      setTriggerReload();
    } catch (err) {
      console.error("Download failed:", err);
      setError(String(err));
    } finally {
      setIsDownloading(false);
    }
  };

  const renderThumb = (): React.ReactNode => {
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
    return song.emoji ?? null;
  };

  const getPlaylistThumbnail = (): string => {
    if (song.artwork) return song.artwork;
    if (isYouTube && song.videoId)
      return `https://i.ytimg.com/vi/${song.videoId}/default.jpg`;
    return "";
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
          {isSoundCloud && (
            <span className="yt-badge" style={{ background: "#ff5500" }}>
              SC
            </span>
          )}
        </div>
        <div className="song-artist">{song.artist}</div>
      </div>

      <div className="song-album">{song.album}</div>
      <div className="song-dur">{song.dur}</div>

      <div className="song-actions">
        {/* Like button — streams only */}
        {isStreamable && (
          <div
            className={`sm-btn ${isLiked ? "liked" : ""}`}
            onClick={handleLike}
            title={isLiked ? "Unlike" : "Like"}
          >
            <svg
              viewBox="0 0 24 24"
              fill={isLiked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          </div>
        )}

        {/* Download button — YouTube and SoundCloud only */}
        {isStreamable && (
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

        {/* Add to playlist */}
        <div
          className="sm-btn"
          title="Add to playlist"
          onMouseDown={(e) => {
            e.stopPropagation();
            setShowPlaylistMenu((prev) => !prev);
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
                playlists.map((pl) => (
                  <div
                    key={pl.id}
                    onMouseDown={async (e) => {
                      e.stopPropagation();
                      try {
                        await tauriCommands.addToPlaylist(
                          pl.id,
                          song.id,
                          song.title,
                          song.artist,
                          song.album || "",
                          song.duration || 0,
                          getPlaylistThumbnail(),
                          song.source || "local",
                          song.path || "",
                          song.videoId || undefined,
                        );
                        setShowPlaylistMenu(false);
                        setMessage(`Added to ${pl.name}`);
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
