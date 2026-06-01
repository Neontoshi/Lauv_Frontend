import React, { useState, useEffect, useRef } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { tauriCommands } from "../../services/tauriBridge";
import { Song } from "../../core/entities/Song";

const GENRES = [
  "pop", "rock", "jazz", "classical", "electronic", "hip hop",
  "r&b", "country", "reggae", "blues", "metal", "punk", "folk",
  "soul", "funk", "disco", "house", "techno", "trance", "ambient",
  "drum and bass", "dubstep", "lofi", "chillout", "lounge",
];

const GENRE_COLORS: Record<string, string> = {
  pop: "#f472b6", rock: "#fb923c", jazz: "#fbbf24", classical: "#a78bfa",
  electronic: "#38bdf8", "hip hop": "#c084fc", "r&b": "#f43f5e",
  country: "#86efac", reggae: "#4ade80", blues: "#60a5fa", metal: "#94a3b8",
  punk: "#fb7185", folk: "#a3e635", soul: "#f97316", funk: "#e879f9",
  disco: "#facc15", house: "#818cf8", techno: "#67e8f9", trance: "#c084fc",
  ambient: "#7dd3fc", "drum and bass": "#fb923c", dubstep: "#a78bfa",
  lofi: "#86efac", chillout: "#7dd3fc", lounge: "#f9a8d4",
};

const RadioPage: React.FC = () => {
  const { currentSong, setCurrentSong, setProgress, isPlaying } = usePlayerStore();
  const { setQueue } = useQueueStore();
  const [stations, setStations] = useState<any[]>([]);
  const [savedStations, setSavedStations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordingName, setRecordingName] = useState("");
  const searchTimeout = useRef<number | null>(null);

  useEffect(() => { loadPopular(); loadSaved(); checkRecording(); }, []);

  const checkRecording = async () => {
    try {
      const active = await tauriCommands.isRecording();
      setRecording(active);
      if (active) setRecordingName(await tauriCommands.getRecordingName());
    } catch (err) { console.error("Failed to check recording:", err); }
  };

  const loadSaved = async () => {
    try { setSavedStations((await tauriCommands.getSavedStations()) || []); }
    catch (err) { console.error("Failed to load saved stations:", err); }
  };

  const loadPopular = async () => {
    setLoading(true);
    try { setStations((await tauriCommands.getPopularStations()) || []); }
    catch (err) { console.error("Failed to load stations:", err); }
    finally { setLoading(false); }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query); setActiveGenre(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) { loadPopular(); return; }
    searchTimeout.current = window.setTimeout(async () => {
      setLoading(true);
      try { setStations((await tauriCommands.searchRadioStations(query)) || []); }
      catch (err) { console.error("Search failed:", err); }
      finally { setLoading(false); }
    }, 400);
  };

  const handleGenre = async (genre: string) => {
    setSearchQuery(""); setActiveGenre(genre); setLoading(true);
    try { setStations((await tauriCommands.getStationsByGenre(genre)) || []); }
    catch (err) { console.error("Genre search failed:", err); }
    finally { setLoading(false); }
  };

  const handleSaveStation = async (e: React.MouseEvent, station: any) => {
    e.stopPropagation();
    try { await tauriCommands.saveRadioStation(station); loadSaved(); }
    catch (err) { console.error("Failed to save station:", err); }
  };

  const handleRemoveStation = async (e: React.MouseEvent, stationId: string) => {
    e.stopPropagation();
    try { await tauriCommands.removeRadioStation(stationId); loadSaved(); }
    catch (err) { console.error("Failed to remove station:", err); }
  };

  const handleToggleRecord = async (e: React.MouseEvent, stationUrl: string) => {
    e.stopPropagation();
    try {
      setRecordingName(await tauriCommands.toggleRecording(stationUrl));
      setRecording(await tauriCommands.isRecording());
    } catch (err) { console.error("Recording failed:", err); }
  };

  const handlePlayStation = (station: any) => {
    const radioSong: Song = {
      id: `radio-${station.id}`, path: station.url, title: station.name,
      artist: `${station.genre || "Radio"} · ${station.bitrate || ""}`,
      album: station.country || "Internet Radio", duration: 0,
      genre: station.genre || null, year: null, track_number: null,
      artwork: null, source: "local" as any, videoId: undefined,
      dur: "Live", emoji: "📻", grad: "linear-gradient(135deg, #1a5c1a, #0d2d0d)",
      bpm: 0, key: "—", plays: 0, liked: false,
    };
    setQueue([radioSong], radioSong, "library");
    setCurrentSong(radioSong); setProgress(0);
  };

  const currentStationId = currentSong?.id?.startsWith("radio-") ? currentSong.id : null;
  const isSaved = (stationId: string) => savedStations.some((s) => s.id === stationId);

  return (
    <div className="ap-page">
      <div className="ap-container">
        <div className="ap-page-header">
          <div className="ap-page-header-top">
            <div>
              <div className="ap-page-eyebrow">Streaming</div>
              <h1 className="ap-page-title">Radio</h1>
            </div>
            {recording && (
              <div className="radio-rec-badge">
                <div className="radio-rec-dot"/>
                <span className="radio-rec-label">REC · {recordingName}</span>
              </div>
            )}
          </div>
        </div>

        <div className="ap-search-wrap" style={{ marginBottom: 16 }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--text3)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search stations..." value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)} style={{ width: "100%", fontSize: 12 }}/>
        </div>

        {/* Genre buttons — Uiverse-inspired pill style */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
          <button onClick={loadPopular} className={`radio-genre-btn${!activeGenre && !searchQuery ? " active" : ""}`}
            style={{ "--glow": "var(--accent)" } as React.CSSProperties}>
            <span className="radio-genre-btn-bg"/>
            <span className="radio-genre-btn-glow"/>
            <span className="radio-genre-btn-text">Popular</span>
          </button>
          {GENRES.map((genre) => {
            const color = GENRE_COLORS[genre] || "var(--accent)";
            const isActive = activeGenre === genre;
            return (
              <button key={genre} onClick={() => handleGenre(genre)}
                className={`radio-genre-btn${isActive ? " active" : ""}`}
                style={{ "--glow": color } as React.CSSProperties}>
                <span className="radio-genre-btn-bg"/>
                <span className="radio-genre-btn-glow"/>
                <span className="radio-genre-btn-text">{genre}</span>
              </button>
            );
          })}
        </div>

        {savedStations.length > 0 && (
          <>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10,
              letterSpacing: "0.12em", color: "var(--text3)", textTransform: "uppercase",
              marginBottom: 8 }}>♥ Saved Stations</div>
            <div style={{ marginBottom: 20 }}>
              {savedStations.map((s) => renderStationRow(s, true, currentStationId, isPlaying, handlePlayStation, handleRemoveStation, handleSaveStation, handleToggleRecord, recording))}
            </div>
            <hr className="divider" style={{ margin: "0 0 20px" }}/>
          </>
        )}

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2rem 0",
            color: "var(--text3)", fontFamily: "'DM Mono',monospace", fontSize: 11 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"
              width="16" height="16" className="spinner">
              <circle cx="12" cy="12" r="10" strokeDasharray="63" strokeDashoffset="21"/>
            </svg>
            Loading stations...
          </div>
        ) : stations.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 2rem", color: "var(--text3)",
            fontFamily: "'DM Mono',monospace", fontSize: 11 }}>No stations found</div>
        ) : (
          <>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10,
              letterSpacing: "0.12em", color: "var(--text3)", textTransform: "uppercase",
              marginBottom: 8 }}>
              {activeGenre ? <>▸ {activeGenre}</> : searchQuery ? <>▸ Results for "{searchQuery}"</> : <>▸ Popular Stations</>}
            </div>
            {stations.map((s) => renderStationRow(s, isSaved(s.id), currentStationId, isPlaying, handlePlayStation, handleRemoveStation, handleSaveStation, handleToggleRecord, recording))}
          </>
        )}

        <style>{`
          @keyframes recPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
          @keyframes rBar1 { 0%,100%{height:4px} 50%{height:14px} }
          @keyframes rBar2 { 0%,100%{height:10px} 50%{height:4px} }
          @keyframes rBar3 { 0%,100%{height:6px} 50%{height:12px} }
          @keyframes genreGlow { 0%,100%{opacity:0.3} 50%{opacity:0.7} }

          .radio-rec-badge {
            display: flex; align-items: center; gap: 6px;
            padding: 5px 12px; border-radius: 100px;
            background: rgba(255,60,60,0.08); border: 1px solid rgba(255,60,60,0.2);
          }
          .radio-rec-dot {
            width: 7px; height: 7px; border-radius: 50%; background: #ff3333;
            animation: recPulse 1s ease-in-out infinite;
          }
          .radio-rec-label {
            font-family: 'DM Mono',monospace; font-size: 10px;
            color: #ff4444; letter-spacing: 0.06em;
          }

          .radio-genre-btn {
            position: relative;
            padding: 8px 16px;
            border-radius: 12px;
            border: none;
            background: var(--surface);
            color: var(--text2);
            font-family: 'Syne',sans-serif;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            overflow: hidden;
            isolation: isolate;
          }
          .radio-genre-btn:hover {
            color: var(--text);
            transform: translateY(-1px);
          }
          .radio-genre-btn.active {
            color: #fff;
            transform: translateY(-1px);
          }
          .radio-genre-btn-bg {
            position: absolute; inset: 0; z-index: -3;
            background: var(--surface);
            border-radius: 12px;
            border: 1px solid var(--border);
            transition: border-color 0.2s, background 0.2s;
          }
          .radio-genre-btn:hover .radio-genre-btn-bg {
            border-color: var(--border2);
          }
          .radio-genre-btn.active .radio-genre-btn-bg {
            background: var(--glow);
            border-color: var(--glow);
          }
          .radio-genre-btn-glow {
            position: absolute;
            inset: -2px;
            z-index: -2;
            border-radius: 14px;
            background: var(--glow);
            opacity: 0;
            filter: blur(8px);
            transition: opacity 0.3s;
          }
          .radio-genre-btn:hover .radio-genre-btn-glow {
            opacity: 0.4;
          }
          .radio-genre-btn.active .radio-genre-btn-glow {
            opacity: 0.6;
            animation: genreGlow 2s ease-in-out infinite;
          }
          .radio-genre-btn-text {
            position: relative; z-index: 1;
          }
        `}</style>
      </div>
    </div>
  );
};

function renderStationRow(
  station: any, saved: boolean, currentStationId: string | null,
  isPlaying: boolean, onPlay: (s: any) => void,
  onRemove: (e: React.MouseEvent, id: string) => void,
  onSave: (e: React.MouseEvent, s: any) => void,
  onRecord: (e: React.MouseEvent, url: string) => void,
  recording: boolean,
) {
  const isActive = currentStationId === `radio-${station.id}`;
  const isThisRecording = recording && isActive;
  const genreColor = GENRE_COLORS[station.genre?.toLowerCase()] || "var(--accent)";

  return (
    <div key={station.id} onClick={() => onPlay(station)} style={{
      display: "flex", alignItems: "center", gap: 12, padding: "8px 12px",
      borderRadius: 8, cursor: "pointer", marginBottom: 1,
      background: isActive ? "rgba(124,106,245,0.07)" : "transparent",
      borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
      transition: "background 0.12s",
    }} onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--surface)"; }}
       onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
      <div style={{ width: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {isActive && isPlaying ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 12 }}>
            <span style={{ display: "block", width: 2, borderRadius: 1, background: "var(--accent2)", animation: "rBar1 0.8s ease-in-out infinite" }}/>
            <span style={{ display: "block", width: 2, borderRadius: 1, background: "var(--accent2)", animation: "rBar2 0.8s ease-in-out infinite 0.15s" }}/>
            <span style={{ display: "block", width: 2, borderRadius: 1, background: "var(--accent2)", animation: "rBar3 0.8s ease-in-out infinite 0.3s" }}/>
          </div>
        ) : (
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: genreColor, display: "block" }}/>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden",
          textOverflow: "ellipsis", color: isActive ? "var(--accent2)" : "var(--text)", marginBottom: 2 }}>
          {station.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {station.genre && (
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: "0.06em",
              textTransform: "uppercase", padding: "1px 6px", borderRadius: 3,
              border: `1px solid ${genreColor}33`, color: genreColor }}>{station.genre}</span>
          )}
          {station.country && (
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "var(--text3)" }}>{station.country}</span>
          )}
        </div>
      </div>
      {station.bitrate && (
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "var(--text3)", flexShrink: 0 }}>
          {station.bitrate}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Mono',monospace",
        fontSize: 8, letterSpacing: "0.08em", color: "var(--text3)", flexShrink: 0 }}>
        <span style={{ width: 4, height: 4, borderRadius: "50%",
          background: isActive ? "#4ade80" : "var(--text3)" }}/>
        LIVE
      </div>
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 2, flexShrink: 0 }}>
        {isActive && (
          <button onClick={(e) => onRecord(e, station.url)} title={recording ? "Stop" : "Record"} style={{
            width: 26, height: 26, borderRadius: 5, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isThisRecording ? "rgba(255,68,68,0.1)" : "transparent",
            color: isThisRecording ? "#ff4444" : "var(--text3)",
          }}>
            <svg viewBox="0 0 24 24" width="13" height="13"
              fill={isThisRecording ? "#ff4444" : "none"} stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          </button>
        )}
        {saved ? (
          <button onClick={(e) => onRemove(e, station.id)} title="Remove" style={{
            width: 26, height: 26, borderRadius: 5, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", color: "var(--accent2)",
          }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" stroke="none">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
        ) : (
          <button onClick={(e) => onSave(e, station)} title="Save" style={{
            width: 26, height: 26, borderRadius: 5, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", color: "var(--text3)",
          }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default RadioPage;
