import React, { useMemo, useEffect, useState } from "react";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { Song } from "../../core/entities/Song";
import { tauriCommands } from "../../services/tauriBridge";

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function totalListeningHours(songs: Song[]): number {
  return Math.floor(
    songs.reduce((acc, s) => acc + (s.duration ?? 0) * (s.plays ?? 0), 0) /
      3600,
  );
}

function topArtist(songs: Song[]): string {
  const counts: Record<string, number> = {};
  for (const s of songs) {
    counts[s.artist] = (counts[s.artist] ?? 0) + (s.plays ?? 0);
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
}

// ── Sub-components ────────────────────────────────────────────────────────────

const SongArt: React.FC<{ song: Song; size?: number }> = ({
  song,
  size = 48,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 8,
      background: song.grad,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.42,
      overflow: "hidden",
      position: "relative",
    }}
  >
    {song.artwork ? (
      <img
        src={song.artwork}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    ) : song.videoId ? (
      <img
        src={`https://i.ytimg.com/vi/${song.videoId}/default.jpg`}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
      />
    ) : (
      <span>{song.emoji}</span>
    )}
  </div>
);

// Large card for hero / quick picks
const SongCard: React.FC<{
  song: Song;
  onPlay: (song: Song) => void;
  isPlaying?: boolean;
}> = ({ song, onPlay, isPlaying }) => (
  <div
    className="home-card"
    onClick={() => onPlay(song)}
    style={{ borderColor: isPlaying ? "var(--accent)" : undefined }}
  >
    <div className="home-card-art" style={{ background: song.grad }}>
      {song.artwork ? (
        <img
          src={song.artwork}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : song.videoId ? (
        <img
          src={`https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) =>
            ((e.target as HTMLImageElement).style.display = "none")
          }
        />
      ) : (
        <span style={{ fontSize: 40 }}>{song.emoji}</span>
      )}
      <div className="home-card-overlay">
        <div className="home-card-play">
          {isPlaying ? (
            <div className="bars" style={{ transform: "scale(1.2)" }}>
              <div className="bar" />
              <div className="bar" />
              <div className="bar" />
            </div>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width={20} height={20}>
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </div>
      </div>
    </div>
    <div className="home-card-info">
      <div className="home-card-title">{song.title}</div>
      <div className="home-card-artist">{song.artist}</div>
    </div>
  </div>
);

// Compact row for top played / recent
const SongRow: React.FC<{
  song: Song;
  rank?: number;
  onPlay: (song: Song) => void;
  isPlaying?: boolean;
}> = ({ song, rank, onPlay, isPlaying }) => (
  <div
    className="home-row"
    onClick={() => onPlay(song)}
    style={{ background: isPlaying ? "rgba(124,106,245,0.08)" : undefined }}
  >
    {rank !== undefined && (
      <div className="home-row-rank">{String(rank).padStart(2, "0")}</div>
    )}
    <SongArt song={song} size={40} />
    <div className="home-row-info">
      <div
        className="home-row-title"
        style={{ color: isPlaying ? "var(--accent2)" : undefined }}
      >
        {song.title}
      </div>
      <div className="home-row-artist">{song.artist}</div>
    </div>
    <div className="home-row-meta">
      <span
        style={{
          color: "var(--text3)",
          fontSize: 11,
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {song.dur}
      </span>
      {(song.plays ?? 0) > 0 && (
        <span className="home-row-plays">{song.plays} plays</span>
      )}
    </div>
  </div>
);

// Section header
const SectionHead: React.FC<{ title: string; sub?: string }> = ({
  title,
  sub,
}) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
    {sub && (
      <div
        style={{
          fontSize: 11,
          color: "var(--text3)",
          fontFamily: "'DM Mono', monospace",
          marginTop: 3,
        }}
      >
        {sub}
      </div>
    )}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

const HomePage: React.FC = () => {
  const { songs } = useLibraryStore();
  const { currentSong, setCurrentSong, setProgress } = usePlayerStore();

  const playSong = (song: Song) => {
    setCurrentSong(song);
    setProgress(0);
  };

  // Derived data — all memoized so they don't recompute on every render
  const topPlayed = useMemo(
    () =>
      [...songs]
        .filter((s) => (s.plays ?? 0) > 0)
        .sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0))
        .slice(0, 8),
    [songs],
  );

  const recentlyAdded = useMemo(() => songs.slice(0, 8), [songs]);

  const quickPicks = useMemo(() => shuffle(songs).slice(0, 6), [songs]);

  const likedSongs = useMemo(
    () => songs.filter((s) => s.liked).slice(0, 8),
    [songs],
  );

  // Genre rows — top 3 genres with enough songs
  const genreRows = useMemo(() => {
    const map: Record<string, Song[]> = {};
    for (const s of songs) {
      if (s.genre) {
        if (!map[s.genre]) map[s.genre] = [];
        map[s.genre].push(s);
      }
    }
    return Object.entries(map)
      .filter(([, ss]) => ss.length >= 3)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([genre, ss]) => ({ genre, songs: shuffle(ss).slice(0, 6) }));
  }, [songs]);

  const [topArtists, setTopArtists] = useState<
    { name: string; plays: number }[]
  >([]);

  useEffect(() => {
    tauriCommands.getSetting("listenbrainz_user").then((user) => {
      if (user) {
        tauriCommands
          .fetchListenbrainzStats(user)
          .then((json) => {
            const data = JSON.parse(json);
            const artists =
              data.payload?.artists?.map((a: any) => ({
                name: a.artist_name,
                plays: a.listen_count,
              })) || [];
            setTopArtists(artists);
          })
          .catch(() => {});
      }
    });
  }, [songs]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);

  useEffect(() => {
    tauriCommands
      .getRecentlyPlayed(8)
      .then((data) => {
        console.log("[HOME] Recently played data:", data);
        setRecentlyPlayed((data as any[]) || []);
      })
      .catch((err) => console.error("[HOME] Recently played error:", err));
  }, [songs]);

  const stats = useMemo(
    () => ({
      total: songs.length,
      hours: totalListeningHours(songs),
      artist: topArtist(songs),
      liked: songs.filter((s) => s.liked).length,
    }),
    [songs],
  );

  if (songs.length === 0) {
    return (
      <div
        className="song-list-pane"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 48 }}>🎵</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          Your library is empty
        </div>
        <div style={{ fontSize: 13, color: "var(--text3)" }}>
          Scan a folder from the Library tab to get started
        </div>
      </div>
    );
  }

  return (
    <div className="song-list-pane home-page">
      {/* ── Greeting ── */}
      <div className="home-greeting">
        <div className="home-greeting-text">
          <div className="home-greeting-title">Good listening 🎧</div>
          <div className="home-greeting-sub">
            {songs.length} songs in your library
          </div>
        </div>

        {/* Stats strip */}
        <div className="home-stats-strip">
          <div className="home-stat">
            <div className="home-stat-val">{stats.total}</div>
            <div className="home-stat-lbl">Songs</div>
          </div>
          <div className="home-stat-divider" />
          <div className="home-stat">
            <div className="home-stat-val">{stats.hours}h</div>
            <div className="home-stat-lbl">Listened</div>
          </div>
          <div className="home-stat-divider" />
          <div className="home-stat">
            <div className="home-stat-val">{stats.liked}</div>
            <div className="home-stat-lbl">Liked</div>
          </div>
          <div className="home-stat-divider" />
          <div className="home-stat" style={{ maxWidth: 120 }}>
            <div
              className="home-stat-val"
              style={{
                fontSize: 13,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {stats.artist}
            </div>
            <div className="home-stat-lbl">Top Artist</div>
          </div>
        </div>
      </div>

      {/* ── Quick Picks ── */}
      <div className="home-section">
        <SectionHead title="Quick Picks" sub="Randomly selected for you" />
        <div className="home-cards-row">
          {quickPicks.map((s) => (
            <SongCard
              key={s.id}
              song={s}
              onPlay={playSong}
              isPlaying={currentSong?.id === s.id}
            />
          ))}
        </div>
      </div>

      {/* ── Top Played ── */}
      {topPlayed.length > 0 && (
        <div className="home-section">
          <SectionHead title="Most Played" sub="Your all-time favourites" />
          <div className="home-two-col">
            {topPlayed.map((s, i) => (
              <SongRow
                key={s.id}
                song={s}
                rank={i + 1}
                onPlay={playSong}
                isPlaying={currentSong?.id === s.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Recently Added ── */}
      <div className="home-section">
        <SectionHead
          title="Recently Added"
          sub="Latest additions to your library"
        />
        <div className="home-two-col">
          {recentlyAdded.map((s) => (
            <SongRow
              key={s.id}
              song={s}
              onPlay={playSong}
              isPlaying={currentSong?.id === s.id}
            />
          ))}
        </div>
      </div>

      {/* ── Liked Songs ── */}
      {likedSongs.length > 0 && (
        <div className="home-section">
          <SectionHead
            title="❤️ Liked Songs"
            sub={`${stats.liked} songs you loved`}
          />
          <div className="home-two-col">
            {likedSongs.map((s) => (
              <SongRow
                key={s.id}
                song={s}
                onPlay={playSong}
                isPlaying={currentSong?.id === s.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Genre Rows ── */}
      {genreRows.map(({ genre, songs: gs }) => (
        <div key={genre} className="home-section">
          <SectionHead
            title={genre}
            sub={`${songs.filter((s) => s.genre === genre).length} songs`}
          />
          <div className="home-cards-row">
            {gs.map((s) => (
              <SongCard
                key={s.id}
                song={s}
                onPlay={playSong}
                isPlaying={currentSong?.id === s.id}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ── Recently Played ── */}
      {recentlyPlayed.length > 0 && (
        <div className="home-section">
          <SectionHead title="Recently Played" sub="Your listening history" />
          <div className="home-two-col">
            {recentlyPlayed.map((entry: any) => (
              <div
                key={entry.id}
                className="home-row"
                onClick={() => {
                  const song: Song = {
                    id: entry.track_id,
                    title: entry.title,
                    artist: entry.artist,
                    album: entry.album,
                    duration: entry.duration_secs,
                    genre: null,
                    year: null,
                    track_number: null,
                    artwork: entry.thumbnail || null,
                    source: entry.source as any,
                    path: entry.path || "",
                    videoId: entry.video_id || undefined,
                    dur: "",
                    emoji: "🎵",
                    grad: "linear-gradient(135deg, #7c6af5, #4a3fd4)",
                    bpm: 0,
                    key: "—",
                    plays: 0,
                    liked: false,
                  };
                  playSong(song);
                }}
              >
                <SongArt
                  song={
                    {
                      artwork: entry.thumbnail,
                      grad: "linear-gradient(135deg, #7c6af5, #4a3fd4)",
                      emoji: "🎵",
                      videoId: entry.video_id,
                    } as any
                  }
                  size={40}
                />
                <div className="home-row-info">
                  <div className="home-row-title">{entry.title}</div>
                  <div className="home-row-artist">{entry.artist}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ListenBrainz ── */}
      {topArtists.length > 0 && (
        <div className="home-section">
          <SectionHead
            title="This Week on ListenBrainz"
            sub="Your top artists"
          />
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {topArtists.map((a, i) => (
              <div
                key={i}
                style={{
                  background: "var(--surface2)",
                  borderRadius: "var(--radius)",
                  padding: "16px 20px",
                  textAlign: "center",
                  minWidth: "120px",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  {a.name}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text3)",
                    marginTop: "4px",
                  }}
                >
                  {a.plays} plays
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ height: 40 }} />
    </div>
  );
};

export default HomePage;
