import React, { useState, useEffect, useRef } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";

const GENRES = [
  "pop",
  "rock",
  "jazz",
  "classical",
  "electronic",
  "hip hop",
  "r&b",
  "country",
  "reggae",
  "blues",
  "metal",
  "punk",
  "folk",
  "soul",
  "funk",
  "disco",
  "house",
  "techno",
  "trance",
  "ambient",
  "drum and bass",
  "dubstep",
  "lofi",
  "chillout",
  "lounge",
];

const GENRE_COLORS: Record<string, string> = {
  pop: "#f472b6",
  rock: "#fb923c",
  jazz: "#fbbf24",
  classical: "#a78bfa",
  electronic: "#38bdf8",
  "hip hop": "#c084fc",
  "r&b": "#f43f5e",
  country: "#86efac",
  reggae: "#4ade80",
  blues: "#60a5fa",
  metal: "#94a3b8",
  punk: "#fb7185",
  folk: "#a3e635",
  soul: "#f97316",
  funk: "#e879f9",
  disco: "#facc15",
  house: "#818cf8",
  techno: "#67e8f9",
  trance: "#c084fc",
  ambient: "#7dd3fc",
  "drum and bass": "#fb923c",
  dubstep: "#a78bfa",
  lofi: "#86efac",
  chillout: "#7dd3fc",
  lounge: "#f9a8d4",
};

const RadioPage: React.FC = () => {
  const { currentSong, setCurrentSong, setProgress, isPlaying } =
    usePlayerStore();
  const { setQueue } = useQueueStore();
  const [stations, setStations] = useState<any[]>([]);
  const [savedStations, setSavedStations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordingName, setRecordingName] = useState("");
  const searchTimeout = useRef<number | null>(null);

  useEffect(() => {
    loadPopular();
    loadSaved();
    checkRecording();
  }, []);

  const checkRecording = async () => {
    try {
      const active = await tauriCommands.isRecording();
      setRecording(active);
      if (active) {
        const name = await tauriCommands.getRecordingName();
        setRecordingName(name);
      }
    } catch (err) {
      console.error("Failed to check recording:", err);
    }
  };

  const loadSaved = async () => {
    try {
      const saved = await tauriCommands.getSavedStations();
      setSavedStations(saved || []);
    } catch (err) {
      console.error("Failed to load saved stations:", err);
    }
  };

  const loadPopular = async () => {
    setLoading(true);
    try {
      const result = await tauriCommands.getPopularStations();
      setStations(result || []);
    } catch (err) {
      console.error("Failed to load stations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setActiveGenre(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) {
      loadPopular();
      return;
    }
    searchTimeout.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const result = await tauriCommands.searchRadioStations(query);
        setStations(result || []);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleGenre = async (genre: string) => {
    setSearchQuery("");
    setActiveGenre(genre);
    setLoading(true);
    try {
      const result = await tauriCommands.getStationsByGenre(genre);
      setStations(result || []);
    } catch (err) {
      console.error("Genre search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStation = async (e: React.MouseEvent, station: any) => {
    e.stopPropagation();
    try {
      await tauriCommands.saveRadioStation(station);
      loadSaved();
    } catch (err) {
      console.error("Failed to save station:", err);
    }
  };

  const handleRemoveStation = async (
    e: React.MouseEvent,
    stationId: string,
  ) => {
    e.stopPropagation();
    try {
      await tauriCommands.removeRadioStation(stationId);
      loadSaved();
    } catch (err) {
      console.error("Failed to remove station:", err);
    }
  };

  const handleToggleRecord = async (
    e: React.MouseEvent,
    stationUrl: string,
  ) => {
    e.stopPropagation();
    try {
      const result = await tauriCommands.toggleRecording(stationUrl);
      setRecordingName(result);
      const active = await tauriCommands.isRecording();
      setRecording(active);
    } catch (err) {
      console.error("Recording failed:", err);
    }
  };

  const handlePlayStation = (station: any) => {
    const radioSong: Song = {
      id: `radio-${station.id}`,
      path: station.url,
      title: station.name,
      artist: `${station.genre || "Radio"} · ${station.bitrate || ""}`,
      album: station.country || "Internet Radio",
      duration: 0,
      genre: station.genre || null,
      year: null,
      track_number: null,
      artwork: null,
      source: "local" as any,
      videoId: undefined,
      dur: "Live",
      emoji: "📻",
      grad: "linear-gradient(135deg, #1a5c1a, #0d2d0d)",
      bpm: 0,
      key: "—",
      plays: 0,
      liked: false,
    };
    setQueue([radioSong], radioSong, "library");
    setCurrentSong(radioSong);
    setProgress(0);
  };

  const currentStationId = currentSong?.id?.startsWith("radio-")
    ? currentSong.id
    : null;
  const isSaved = (stationId: string) =>
    savedStations.some((s) => s.id === stationId);

  const renderStationRow = (station: any, saved: boolean) => {
    const isActive = currentStationId === `radio-${station.id}`;
    const isThisRecording =
      recording && currentStationId === `radio-${station.id}`;
    const genreColor =
      GENRE_COLORS[station.genre?.toLowerCase()] || "var(--accent)";

    return (
      <div
        key={station.id}
        onClick={() => handlePlayStation(station)}
        className="radio-station-row"
        style={{
          background: isActive ? "rgba(124,106,245,0.07)" : "transparent",
          borderLeft: isActive
            ? `2px solid var(--accent)`
            : "2px solid transparent",
        }}
      >
        {/* Index / playing indicator */}
        <div className="radio-row-index">
          {isActive && isPlaying ? (
            <div className="radio-bars">
              <span />
              <span />
              <span />
            </div>
          ) : (
            <span
              className="radio-row-dot"
              style={{ background: genreColor }}
            />
          )}
        </div>

        {/* Station info */}
        <div className="radio-row-info">
          <div
            className="radio-row-name"
            style={{ color: isActive ? "var(--accent2)" : "var(--text)" }}
          >
            {station.name}
          </div>
          <div className="radio-row-meta">
            {station.genre && (
              <span
                className="radio-genre-tag"
                style={{ color: genreColor, borderColor: `${genreColor}33` }}
              >
                {station.genre}
              </span>
            )}
            {station.country && (
              <span className="radio-country">{station.country}</span>
            )}
          </div>
        </div>

        {/* Bitrate */}
        {station.bitrate && (
          <div className="radio-row-bitrate">{station.bitrate}</div>
        )}

        {/* Live badge */}
        <div className="radio-live-badge">
          <span
            className="radio-live-dot"
            style={{ background: isActive ? "#4ade80" : "var(--text3)" }}
          />
          LIVE
        </div>

        {/* Actions */}
        <div className="radio-row-actions" onClick={(e) => e.stopPropagation()}>
          {isActive && (
            <button
              className="radio-action-btn"
              onClick={(e) => handleToggleRecord(e, station.url)}
              title={recording ? "Stop recording" : "Record"}
              style={{
                color: isThisRecording ? "#ff4444" : "var(--text3)",
                background: isThisRecording
                  ? "rgba(255,68,68,0.1)"
                  : "transparent",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill={isThisRecording ? "#ff4444" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="6" />
              </svg>
            </button>
          )}
          {saved ? (
            <button
              className="radio-action-btn"
              onClick={(e) => handleRemoveStation(e, station.id)}
              title="Remove from saved"
              style={{ color: "var(--accent2)" }}
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="currentColor"
                stroke="none"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
          ) : (
            <button
              className="radio-action-btn"
              onClick={(e) => handleSaveStation(e, station)}
              title="Save station"
              style={{ color: "var(--text3)" }}
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="song-list-pane"
      style={{ overflowY: "auto", height: "100%" }}
    >
      <style>{`
        @keyframes recPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes barBounce1 { 0%,100%{height:4px} 50%{height:14px} }
        @keyframes barBounce2 { 0%,100%{height:10px} 50%{height:4px} }
        @keyframes barBounce3 { 0%,100%{height:6px} 50%{height:12px} }

        .radio-page { max-width: 900px; margin: 0 auto; padding: 0 2rem 8rem; }

        .radio-header { padding: 3rem 0 2rem; }
        .radio-eyebrow {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          color: var(--accent);
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }
        .radio-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .radio-title {
          font-family: 'Syne', sans-serif;
          font-size: 3rem;
          font-weight: 800;
          line-height: 0.9;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .radio-title span { color: var(--accent2); }

        .radio-rec-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          border-radius: 100px;
          background: rgba(255,60,60,0.08);
          border: 1px solid rgba(255,60,60,0.25);
        }
        .radio-rec-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #ff3333;
          animation: recPulse 1s ease-in-out infinite;
        }
        .radio-rec-label {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #ff4444;
          letter-spacing: 0.08em;
        }

        .radio-search-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          margin-bottom: 1rem;
          transition: border-color 0.15s;
        }
        .radio-search-bar:focus-within { border-color: var(--accent); }
        .radio-search-bar input {
          background: none;
          border: none;
          color: var(--text);
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          outline: none;
          width: 100%;
        }
        .radio-search-bar input::placeholder { color: var(--text3); }

        .radio-genre-pills {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 2.5rem;
        }
        .radio-pill {
          padding: 5px 13px;
          border-radius: 100px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text2);
          cursor: pointer;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          transition: all 0.12s;
        }
        .radio-pill:hover { border-color: var(--border2); color: var(--text); }
        .radio-pill.active {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
        }

        .radio-section-label {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          color: var(--text3);
          text-transform: uppercase;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }
        .radio-section-label span { color: var(--accent2); margin-right: 6px; }

        .radio-station-list { margin-bottom: 2.5rem; }

        .radio-station-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background 0.12s;
          margin-bottom: 2px;
        }
        .radio-station-row:hover { background: var(--surface) !important; }

        .radio-row-index {
          width: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .radio-row-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          display: block;
        }
        .radio-bars {
          display: flex;
          align-items: flex-end;
          gap: 2px;
          height: 14px;
        }
        .radio-bars span {
          display: block;
          width: 3px;
          border-radius: 2px;
          background: var(--accent2);
        }
        .radio-bars span:nth-child(1) { animation: barBounce1 0.8s ease-in-out infinite; }
        .radio-bars span:nth-child(2) { animation: barBounce2 0.8s ease-in-out infinite 0.15s; }
        .radio-bars span:nth-child(3) { animation: barBounce3 0.8s ease-in-out infinite 0.3s; }

        .radio-row-info { flex: 1; min-width: 0; }
        .radio-row-name {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 3px;
          transition: color 0.12s;
        }
        .radio-row-meta { display: flex; align-items: center; gap: 8px; }
        .radio-genre-tag {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 2px 7px;
          border-radius: 4px;
          border: 1px solid;
        }
        .radio-country {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: var(--text3);
        }

        .radio-row-bitrate {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: var(--text3);
          flex-shrink: 0;
        }

        .radio-live-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
          color: var(--text3);
          flex-shrink: 0;
        }
        .radio-live-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          display: block;
        }

        .radio-row-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
          opacity: 0;
          transition: opacity 0.12s;
        }
        .radio-station-row:hover .radio-row-actions { opacity: 1; }

        .radio-action-btn {
          width: 28px; height: 28px;
          border-radius: 6px;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.1s;
        }
        .radio-action-btn:hover { background: var(--surface2); }

        .radio-divider {
          height: 1px;
          background: var(--border);
          margin: 0.5rem 0 2rem;
        }

        .radio-empty {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--text3);
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.05em;
        }

        .radio-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 4rem 2rem;
          color: var(--text3);
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.05em;
        }
        .radio-loading-bars {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 20px;
        }
        .radio-loading-bars span {
          display: block;
          width: 4px;
          border-radius: 2px;
          background: var(--accent);
        }
        .radio-loading-bars span:nth-child(1) { animation: barBounce1 0.7s ease-in-out infinite; }
        .radio-loading-bars span:nth-child(2) { animation: barBounce2 0.7s ease-in-out infinite 0.1s; }
        .radio-loading-bars span:nth-child(3) { animation: barBounce3 0.7s ease-in-out infinite 0.2s; }
        .radio-loading-bars span:nth-child(4) { animation: barBounce1 0.7s ease-in-out infinite 0.3s; }
        .radio-loading-bars span:nth-child(5) { animation: barBounce2 0.7s ease-in-out infinite 0.4s; }
      `}</style>

      <div className="radio-page">
        {/* Header */}
        <div className="radio-header">
          <div className="radio-eyebrow">Streaming</div>
          <div className="radio-title-row">
            <h1 className="radio-title">
              Radio <span>Stations</span>
            </h1>
            {recording && (
              <div className="radio-rec-badge">
                <div className="radio-rec-dot" />
                <span className="radio-rec-label">REC · {recordingName}</span>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="radio-search-bar">
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="var(--text3)"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search stations..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          {/* Genre pills */}
          <div className="radio-genre-pills">
            <button
              className={`radio-pill${!activeGenre && !searchQuery ? " active" : ""}`}
              onClick={loadPopular}
            >
              Popular
            </button>
            {GENRES.map((genre) => (
              <button
                key={genre}
                className={`radio-pill${activeGenre === genre ? " active" : ""}`}
                onClick={() => handleGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Saved stations */}
        {savedStations.length > 0 && (
          <>
            <div className="radio-section-label">
              <span>♥</span> Saved Stations
            </div>
            <div className="radio-station-list">
              {savedStations.map((station) => renderStationRow(station, true))}
            </div>
            <div className="radio-divider" />
          </>
        )}

        {/* Browse */}
        {loading ? (
          <div className="radio-loading">
            <div className="radio-loading-bars">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            Loading stations...
          </div>
        ) : stations.length === 0 ? (
          <div className="radio-empty">No stations found</div>
        ) : (
          <>
            {(activeGenre || searchQuery) && (
              <div className="radio-section-label">
                {activeGenre ? (
                  <>
                    <span
                      style={{
                        color: GENRE_COLORS[activeGenre] || "var(--accent)",
                      }}
                    >
                      ▸
                    </span>
                    {activeGenre}
                  </>
                ) : (
                  <>
                    <span>▸</span>Results for "{searchQuery}"
                  </>
                )}
              </div>
            )}
            {!activeGenre && !searchQuery && (
              <div className="radio-section-label">
                <span>▸</span> Popular Stations
              </div>
            )}
            <div className="radio-station-list">
              {stations.map((station) =>
                renderStationRow(station, isSaved(station.id)),
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RadioPage;
