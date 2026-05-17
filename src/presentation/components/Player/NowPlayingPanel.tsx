import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useDeferredValue,
} from "react";
import { usePlayerContext as usePlayer } from "../../hooks/PlayerContext";
import { useLibraryStore } from "../../stores/libraryStore";
import { usePlayerStore } from "../../stores/playerStore";
import { Song } from "../../../core/entities/Song";
import AudioVisualizer from "../AudioVisualizer";

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
): Promise<LrcLine[] | null> {
  try {
    const res = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(title + " " + artist)}&track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`,
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
  const { toggleLike, songs } = useLibraryStore();
  const { setCurrentSong, setProgress } = usePlayerStore();

  // CRITICAL: Defer lyrics updates to prevent UI freeze
  const deferredProgress = useDeferredValue(currentProgress);

  // Lyrics state
  const [lyrics, setLyrics] = useState<LrcLine[] | null>(null);
  const [lyricsStatus, setLyricsStatus] = useState<
    "idle" | "loading" | "found" | "not_found"
  >("idle");
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastSongId = useRef<string | null>(null);

  // Fetch lyrics when song changes (only when showLyrics=true)
  useEffect(() => {
    if (!showLyrics || !currentSong) return;
    if (currentSong.id === lastSongId.current) return;
    lastSongId.current = currentSong.id;
    setLyrics(null);
    setActiveIdx(0);
    setLyricsStatus("loading");

    fetchLyrics(currentSong.title, currentSong.artist).then((lines) => {
      if (lines && lines.length > 0) {
        setLyrics(lines);
        setLyricsStatus("found");
      } else {
        setLyricsStatus("not_found");
      }
    });
  }, [currentSong?.id, showLyrics]);

  // Track active lyric line — useDeferredValue already deprioritises this.
  useEffect(() => {
    if (!lyrics || !currentSong) return;
    const elapsed = deferredProgress + 0.3;
    let idx = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= elapsed) idx = i;
      else break;
    }
    setActiveIdx(idx);
  }, [deferredProgress, lyrics, currentSong]);

  // Scroll active line to center — one frame delay lets React paint first.
  useEffect(() => {
    const timer = setTimeout(() => {
      lineRefs.current[activeIdx]?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 16);
    return () => clearTimeout(timer);
  }, [activeIdx]);

  // ── Queue computation (MUST be before any conditional return) ──
  const queueSongs = useMemo(() => {
    if (!currentSong) return [];

    const result: Song[] = [];
    const currentIndex = songs.findIndex((s) => s.id === currentSong.id);

    // Get songs after current song in library
    for (
      let i = currentIndex + 1;
      i < songs.length && result.length < 12;
      i++
    ) {
      result.push(songs[i]);
    }

    // Fill remaining slots from library using random picks, no duplicates.
    if (result.length < 12 && songs.length > 0) {
      const seen = new Set([currentSong.id, ...result.map((s) => s.id)]);
      const pool = songs.filter((s) => !seen.has(s.id));
      // Fisher-Yates shuffle
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      for (const song of pool) {
        if (result.length >= 12) break;
        result.push(song);
      }
    }

    return result;
  }, [currentSong?.id, songs]);

  // Calculate stats (MUST be before any conditional return)
  const durationMinutes = currentSong
    ? parseInt(currentSong.dur?.split(":")[0]) || 0
    : 0;
  const totalListenedHours = currentSong
    ? Math.floor((currentSong.plays * durationMinutes) / 60)
    : 0;

  // ── Empty state (now after all hooks) ────────────────────────────────────────────
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

      {/* Tags */}
      <div className="np-tags">
        <span className="tag genre">{currentSong.genre || "Unknown"}</span>
        <span className="tag">♩ {currentSong.bpm || "—"} BPM</span>
        <span className="tag">Key: {currentSong.key || "—"}</span>
      </div>

      <hr className="divider" />

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-val">
            {currentSong.plays?.toLocaleString() || 0}
          </div>
          <div className="stat-lbl">Total Plays</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{totalListenedHours}h</div>
          <div className="stat-lbl">Listened</div>
        </div>
      </div>

      <hr className="divider" />

      {/* Queue */}
      <div className="queue-next">
        <div className="queue-label">Up Next</div>
        {queueSongs.map((song, idx) => (
          <QueueItem
            key={song.id || idx}
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
          <span className="np-lyrics-label">Lyrics</span>
          {lyricsStatus === "found" && (
            <span className="np-lyrics-badge">lrclib.net</span>
          )}
        </div>

        <div className="np-lyrics-scroll" ref={scrollRef}>
          {lyricsStatus === "loading" && (
            <div className="np-lyrics-status">
              <div className="np-lyrics-spinner" />
              <span>Fetching lyrics…</span>
            </div>
          )}

          {lyricsStatus === "not_found" && (
            <div className="np-lyrics-status">
              <AudioVisualizer
                isPlaying={isPlaying}
                barCount={32}
                className="audio-visualizer"
              />
              <span style={{ marginTop: "20px", color: "var(--text3)" }}>
                Visualizing your music
              </span>
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
