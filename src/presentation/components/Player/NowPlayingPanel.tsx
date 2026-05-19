import React, { useEffect, useRef, useState, useDeferredValue } from "react";
import { usePlayerContext as usePlayer } from "../../hooks/PlayerContext";
import { useLibraryStore } from "../../stores/libraryStore";
import { usePlayerStore } from "../../stores/playerStore";
import { Song } from "../../../core/entities/Song";
import AudioVisualizer from "../AudioVisualizer";
import { useQueueStore } from "../../stores/queueStore";

// ── LRC types & helpers ───────────────────────────────────────────────────────

interface LrcLine {
  time: number;
  text: string;
}

function parseLRC(lrc: string): LrcLine[] {
  const lines: LrcLine[] = [];
  const re = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
  for (const raw of lrc.split("\n")) {
    const m = raw.match(re);
    if (!m) continue;
    const time =
      parseInt(m[1]) * 60 +
      parseInt(m[2]) +
      parseInt(m[3].padEnd(3, "0")) / 1000;
    const text = m[4].trim();
    if (text) lines.push({ time, text });
  }
  return lines;
}

async function fetchLyrics(
  title: string,
  artist: string,
  signal?: AbortSignal,
): Promise<LrcLine[] | null> {
  try {
    const res = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(title + " " + artist)}&track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`,
      { signal },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data.find((d: any) => d.syncedLyrics) ?? data[0];
    if (!hit) return null;
    if (hit.syncedLyrics) return parseLRC(hit.syncedLyrics);
    if (hit.plainLyrics) {
      return hit.plainLyrics
        .split("\n")
        .filter(Boolean)
        .map((text: string, i: number) => ({ time: i * 4, text }));
    }
    return null;
  } catch {
    return null;
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface NowPlayingPanelProps {
  showLyrics?: boolean;
}

// ── Main Component ────────────────────────────────────────────────────────────

const NowPlayingPanel: React.FC<NowPlayingPanelProps> = ({
  showLyrics = false,
}) => {
  const { currentSong, currentProgress, isPlaying } = usePlayer();
  const { toggleLike } = useLibraryStore();
  const { setCurrentSong, setProgress } = usePlayerStore();
  const { queue, currentIndex } = useQueueStore();

  // CRITICAL: Defer lyrics updates to prevent UI freeze
  const deferredProgress = useDeferredValue(currentProgress);

  const [lyrics, setLyrics] = useState<LrcLine[] | null>(null);
  const [lyricsStatus, setLyricsStatus] = useState<
    "idle" | "loading" | "found" | "not_found"
  >("idle");
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!showLyrics || !currentSong) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }

    setLyrics(null);
    setActiveIdx(0);
    setLyricsStatus("loading");

    const controller = new AbortController();
    abortRef.current = controller;

    fetchLyrics(currentSong.title, currentSong.artist, controller.signal)
      .then((lines) => {
        if (controller.signal.aborted) return;
        if (lines && lines.length > 0) {
          setLyrics(lines);
          setLyricsStatus("found");
        } else {
          setLyricsStatus("not_found");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLyricsStatus("not_found");
        }
      });

    return () => controller.abort();
  }, [currentSong?.id, showLyrics]);

  useEffect(() => {
    if (!lyrics || !currentSong) return;
    const elapsed = deferredProgress;
    let idx = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= elapsed) idx = i;
      else break;
    }
    setActiveIdx(idx);
  }, [deferredProgress, lyrics, currentSong]);

  useEffect(() => {
    const timer = setTimeout(() => {
      lineRefs.current[activeIdx]?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [activeIdx]);
  // ── Empty state ────────────────────────────────────────────────────────────

  if (!currentSong) {
    return (
      <div className={showLyrics ? "np-fullscreen" : "now-playing-panel"}>
        <div className="np-empty-state">
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎵</div>
          <div style={{ color: "var(--text2)", fontSize: "14px" }}>
            No song playing
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text3)",
              marginTop: "8px",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Select a song from your library
          </div>
        </div>
      </div>
    );
  }

  // ── Queue ──────────────────────────────────────────────────────────────────

  const queueSongs = queue.slice(currentIndex + 1, currentIndex + 15);
  // ── Song info column (shared between both modes) ───────────────────────────

  const songInfoCol = (
    <div className={showLyrics ? "np-info-col" : "np-info-col-inline"}>
      {/* Album Art */}
      <div className="np-art-wrap">
        <div className="np-art" style={{ background: currentSong.grad }}>
          {currentSong.artwork ? (
            <img
              src={currentSong.artwork}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "var(--radius)",
              }}
            />
          ) : currentSong.videoId ? (
            <img
              src={`https://i.ytimg.com/vi/${currentSong.videoId}/hqdefault.jpg`}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "var(--radius)",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span>{currentSong.emoji}</span>
          )}
          <div className="np-art-glow" />
        </div>
      </div>

      {/* Title + Like */}
      <div className="np-title-row">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="np-song-title">{currentSong.title}</div>
          <div className="np-song-artist">
            {currentSong.artist} · {currentSong.album}
          </div>
        </div>
        <button
          className={`np-like-btn ${currentSong.liked ? "liked" : ""}`}
          onClick={() => toggleLike(currentSong.id)}
        >
          <svg
            viewBox="0 0 24 24"
            fill={currentSong.liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>
      </div>

      {/* Queue */}
      <div className="queue-next">
        <div className="queue-label">Up Next</div>
        <hr className="divider" />
        {queueSongs.map((song, idx) => (
          <QueueItem
            key={idx}
            song={song}
            setCurrentSong={setCurrentSong}
            setProgress={setProgress}
          />
        ))}
      </div>
    </div>
  );

  // ── Narrow panel mode (no lyrics) ─────────────────────────────────────────

  if (!showLyrics) {
    return <div className="now-playing-panel">{songInfoCol}</div>;
  }

  // ── Full-screen mode (with lyrics) ────────────────────────────────────────

  return (
    <div className="np-fullscreen">
      {/* Left: Lyrics */}
      <div className="np-lyrics-col">
        <div className="np-lyrics-header">
          <span className="np-lyrics-label">
            {lyricsStatus === "not_found" ? "Visualizer" : "Lyrics"}
          </span>
          {lyricsStatus === "found" && (
            <span className="np-lyrics-badge">lrclib.net</span>
          )}
        </div>

        {/* AudioVisualizer lives OUTSIDE the keyed container so it is never
            remounted on song change. Visibility is toggled via CSS only. */}
        {lyricsStatus === "not_found" && (
          <div style={{ flex: "1 1 auto", minHeight: 0 }}>
            <AudioVisualizer isPlaying={isPlaying} />
          </div>
        )}

        {/* Keyed container: remounts on song change to clear stale lyrics */}
        <div
          className="np-lyrics-scroll"
          ref={scrollRef}
          key={currentSong.id}
          style={{ display: lyricsStatus === "not_found" ? "none" : undefined }}
        >
          {lyricsStatus === "loading" && (
            <div className="np-lyrics-status">
              <div className="np-lyrics-spinner" />
              <span>Fetching lyrics…</span>
            </div>
          )}

          {lyricsStatus === "found" && lyrics && (
            <div className="np-lyrics-lines">
              {lyrics.map((line, i) => (
                <div
                  key={i}
                  ref={(el) => (lineRefs.current[i] = el)}
                  className={`np-lyric-line ${
                    i === activeIdx
                      ? "active"
                      : i < activeIdx
                        ? "past"
                        : "upcoming"
                  }`}
                >
                  {line.text}
                </div>
              ))}
              <div className="np-lyrics-spacer" />
            </div>
          )}
        </div>
      </div>

      {/* Right: Song Info */}
      {songInfoCol}
    </div>
  );
};

// ── Queue Item ────────────────────────────────────────────────────────────────

const QueueItem: React.FC<{
  song: Song;
  setCurrentSong: (song: Song) => void;
  setProgress: (progress: number) => void;
}> = ({ song, setCurrentSong, setProgress }) => (
  <div
    className="queue-item"
    onClick={() => {
      setCurrentSong(song);
      setProgress(0);
    }}
  >
    <div className="q-art" style={{ background: song.grad }}>
      {song.artwork ? (
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
      ) : song.videoId ? (
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
      ) : (
        <span style={{ fontSize: "20px" }}>{song.emoji}</span>
      )}
    </div>
    <div className="q-info">
      <div className="q-name">{song.title}</div>
      <div className="q-artist">{song.artist}</div>
    </div>
    <div
      style={{
        fontSize: "11px",
        fontFamily: "'DM Mono', monospace",
        color: "var(--text3)",
        flexShrink: 0,
      }}
    >
      {song.dur}
    </div>
  </div>
);

export default React.memo(NowPlayingPanel);
