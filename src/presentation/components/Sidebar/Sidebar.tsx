import React from "react";
import { useLibraryStore } from "../../stores/libraryStore";
import { useNavigate, useLocation } from "react-router-dom";

// ========== ICON COMPONENTS ==========
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  </svg>
);

const NowPlayingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polygon points="10,8 16,12 10,16" />
  </svg>
);

const SongsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const AlbumsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 21V9" />
  </svg>
);

const ArtistsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const LikedIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);

const ExploreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const TrendingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const RadioIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
  </svg>
);
// ========== END ICONS ==========

interface SidebarProps {
  className?: string;
}

const EMOJIS = ["🎵", "🔥", "🌙", "⚡", "🌴", "💜", "🎸", "🎤", "🥁", "🎹"];

const MOODS = [
  { id: "chill", label: "chill", color: "#7c6af5" },
  { id: "hype", label: "hype", color: "#ff6b35" },
  { id: "focus", label: "focus", color: "#1d9e75" },
  { id: "sad", label: "sad", color: "#378add" },
  { id: "romantic", label: "romantic", color: "#d4537e" },
  { id: "workout", label: "workout", color: "#c8f54a", textColor: "#0d0d0d" },
];

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { songs } = useLibraryStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [playlists, setPlaylists] = React.useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [newEmoji, setNewEmoji] = React.useState("🎵");
  const [newMood, setNewMood] = React.useState<string | null>(null);
  const [newPrivacy, setNewPrivacy] = React.useState<
    "private" | "public" | "collab"
  >("private");
  const [isCreating, setIsCreating] = React.useState(false);

  const albumCount = songs ? new Set(songs.map((s: any) => s.album)).size : 0;

  const navItems = [
    { path: "/", label: "Home", icon: HomeIcon },
    { path: "/nowplaying", label: "Now Playing", icon: NowPlayingIcon },
    { path: "/songs", label: "Songs", icon: SongsIcon, badge: songs?.length },
    { path: "/albums", label: "Albums", icon: AlbumsIcon, badge: albumCount },
    { path: "/artists", label: "Artists", icon: ArtistsIcon },
    { path: "/liked", label: "Liked", icon: LikedIcon },
  ];

  React.useEffect(() => {
    import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke("get_playlists").then((data: any) => setPlaylists(data || []));
    });
  }, []);

  const refreshPlaylists = () => {
    import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke("get_playlists").then((data: any) => setPlaylists(data || []));
    });
  };

  const canCreate = newName.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate || isCreating) return;
    setIsCreating(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("create_playlist", {
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        emoji: newEmoji,
        mood: newMood || undefined,
        privacy: newPrivacy,
      });
      setNewName("");
      setNewDesc("");
      setNewEmoji("🎵");
      setNewMood(null);
      setNewPrivacy("private");
      setShowCreateModal(false);
      refreshPlaylists();
    } catch (err) {
      console.error("Failed to create playlist:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setShowCreateModal(false);
  };

  return (
    <aside className={`sidebar ${className || ""}`}>
      <div className="logo">
        <div className="logo-text">LauvPlayer</div>
        <div className="logo-sub">Music</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        <div className="nav-section">
          <div className="nav-label">Library</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.path}
                className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
                onClick={() => navigate(item.path)}
              >
                <Icon />
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="nav-section">
          <div className="nav-label">Discover</div>
          <div
            className={`nav-item ${location.pathname === "/explore" ? "active" : ""}`}
            onClick={() => navigate("/explore")}
          >
            <ExploreIcon />
            Explore
          </div>
          <div
            className={`nav-item ${location.pathname === "/trending" ? "active" : ""}`}
            onClick={() => navigate("/trending")}
          >
            <TrendingIcon />
            Trending
          </div>
          <div
            className={`nav-item ${location.pathname === "/radio" ? "active" : ""}`}
            onClick={() => navigate("/radio")}
          >
            <RadioIcon />
            Radio
          </div>
        </div>

        <div className="nav-section">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0 8px",
              marginBottom: "8px",
            }}
          >
            <div className="nav-label" style={{ marginBottom: 0 }}>
              Playlists
            </div>
            <div
              onClick={() => setShowCreateModal(true)}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--text3)",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.background = "var(--surface2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text3)";
                e.currentTarget.style.background = "transparent";
              }}
              title="New Playlist"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="14"
                height="14"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
          </div>
        </div>

        <div className="playlist-list">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              className="playlist-item"
              onClick={() => navigate(`/playlists/${pl.id}`)}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "6px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  flexShrink: 0,
                }}
              >
                {pl.emoji || "🎵"}
              </div>
              <span className="playlist-name">{pl.name}</span>
              <span className="playlist-count">{pl.song_count}</span>
            </div>
          ))}
        </div>
      </div>{" "}
      {/* closes overflowY: auto div */}
      <div className="user-profile">
        <div className="user-avatar">K</div>
        <div className="user-info">
          <div className="user-name">Kalon</div>
          <div className="user-plan">Pro Plan</div>
        </div>
        <div className="user-settings" onClick={() => navigate("/settings")}>
          <SettingsIcon />
        </div>
      </div>
      {/* Create Playlist Modal */}
      {showCreateModal && (
        <>
          <div
            onClick={() => setShowCreateModal(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(10px)",
              zIndex: 9998,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 9999,
              width: "460px",
              maxWidth: "90vw",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              fontFamily: "'Syne', sans-serif",
              boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
              animation: "modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
            onKeyDown={handleKeyDown}
          >
            <style>{`
              @keyframes modalIn {
                from { opacity: 0; transform: translate(-50%, calc(-50% + 12px)) scale(0.93); }
                to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
              }
            `}</style>

            {/* Top section */}
            <div style={{ padding: "28px 28px 0" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "12px",
                    background: "var(--surface2)",
                    border: "1px dashed var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: "28px", lineHeight: 1 }}>
                    {newEmoji}
                  </span>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      color: "var(--text3)",
                      marginTop: "4px",
                      letterSpacing: "0.05em",
                    }}
                  >
                    cover
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "22px",
                          fontWeight: 800,
                          color: "var(--text)",
                          letterSpacing: "-0.03em",
                          lineHeight: 1,
                        }}
                      >
                        New Playlist
                      </div>
                      <div
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "11px",
                          color: "var(--text3)",
                          marginTop: "5px",
                          letterSpacing: "0.03em",
                        }}
                      >
                        Curate your perfect collection
                      </div>
                    </div>
                    <div
                      onClick={() => setShowCreateModal(false)}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "8px",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "var(--text3)",
                        flexShrink: 0,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--surface3)";
                        (e.currentTarget as HTMLElement).style.color =
                          "var(--text)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--surface2)";
                        (e.currentTarget as HTMLElement).style.color =
                          "var(--text3)";
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        width="14"
                        height="14"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </div>
                  </div>

                  <div
                    style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
                  >
                    {EMOJIS.map((e) => (
                      <div
                        key={e}
                        onClick={() => setNewEmoji(e)}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background:
                            newEmoji === e
                              ? "rgba(124,106,245,0.15)"
                              : "var(--surface2)",
                          border:
                            newEmoji === e
                              ? "1px solid var(--accent)"
                              : "1px solid var(--border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "16px",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {e}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div
                style={{
                  height: "1px",
                  background: "var(--border)",
                  margin: "20px 0 0",
                }}
              />
            </div>

            {/* Body */}
            <div
              style={{
                padding: "20px 28px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: "7px" }}
              >
                <label
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--text3)",
                  }}
                >
                  Name
                </label>
                <input
                  onKeyDown={(e) => e.stopPropagation()}
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="My Awesome Playlist"
                  maxLength={60}
                  style={{
                    width: "100%",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text)",
                    fontFamily: "'Syne', sans-serif",
                    fontSize: "14px",
                    fontWeight: 500,
                    padding: "12px 14px",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--accent)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border)";
                  }}
                />
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: "7px" }}
              >
                <label
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--text3)",
                  }}
                >
                  Description <span style={{ opacity: 0.5 }}>(optional)</span>
                </label>
                <textarea
                  onKeyDown={(e) => e.stopPropagation()}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What's the vibe?"
                  rows={3}
                  style={{
                    width: "100%",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text)",
                    fontFamily: "'Syne', sans-serif",
                    fontSize: "14px",
                    padding: "12px 14px",
                    outline: "none",
                    resize: "none",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--accent)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border)";
                  }}
                />
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: "7px" }}
              >
                <label
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--text3)",
                  }}
                >
                  Mood
                </label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {MOODS.map((m) => {
                    const isActive = newMood === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setNewMood(isActive ? null : m.id)}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          letterSpacing: "0.05em",
                          padding: "5px 12px",
                          borderRadius: "20px",
                          border: isActive
                            ? `1px solid ${m.color}`
                            : "1px solid var(--border)",
                          background: isActive ? m.color : "var(--surface2)",
                          color: isActive
                            ? m.textColor || "#fff"
                            : "var(--text3)",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          userSelect: "none",
                        }}
                      >
                        {m.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ height: "1px", background: "var(--border)" }} />

            {/* Footer */}
            <div
              style={{
                padding: "16px 28px 24px",
                display: "flex",
                gap: "10px",
              }}
            >
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  flex: 1,
                  padding: "13px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text2)",
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--surface2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!canCreate || isCreating}
                style={{
                  flex: 2,
                  padding: "13px",
                  background: canCreate
                    ? "linear-gradient(135deg, var(--accent), var(--accent2))"
                    : "var(--surface3)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  color: canCreate ? "#fff" : "var(--text3)",
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: canCreate ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  letterSpacing: "-0.01em",
                  transition: "all 0.2s",
                  opacity: canCreate ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (canCreate)
                    (e.currentTarget as HTMLElement).style.transform =
                      "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  if (canCreate)
                    (e.currentTarget as HTMLElement).style.transform =
                      "translateY(0)";
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  width="14"
                  height="14"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Playlist
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
};

export default Sidebar;
