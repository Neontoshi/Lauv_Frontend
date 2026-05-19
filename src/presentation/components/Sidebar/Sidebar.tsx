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

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { songs } = useLibraryStore();
  const navigate = useNavigate();
  const location = useLocation();

  const albumCount = songs ? new Set(songs.map((s: any) => s.album)).size : 0;

  const navItems = [
    { path: "/", label: "Home", icon: HomeIcon },
    { path: "/nowplaying", label: "Now Playing", icon: NowPlayingIcon },
    { path: "/songs", label: "Songs", icon: SongsIcon, badge: songs?.length },
    { path: "/albums", label: "Albums", icon: AlbumsIcon, badge: albumCount },
    { path: "/artists", label: "Artists", icon: ArtistsIcon },
    { path: "/liked", label: "Liked", icon: LikedIcon },
  ];

  const playlists = [
    { id: "1", name: "Late Night Vibes", color: "#7c6af5", count: 24 },
    { id: "2", name: "Morning Run", color: "#38bdf8", count: 18 },
    { id: "3", name: "Focus Mode", color: "#4ade80", count: 31 },
    { id: "4", name: "Throwbacks", color: "#fbbf24", count: 45 },
    { id: "5", name: "Sad Hours", color: "#f87171", count: 12 },
    { id: "6", name: "Road Trip", color: "#c084fc", count: 29 },
  ];

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
          <div className="nav-label">Playlists</div>
        </div>

        <div className="playlist-list">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="playlist-item"
              onClick={() => navigate(`/playlists/${playlist.id}`)}
            >
              <div
                className="playlist-dot"
                style={{ background: playlist.color }}
              />
              <span className="playlist-name">{playlist.name}</span>
              <span className="playlist-count">{playlist.count}</span>
            </div>
          ))}
        </div>
      </div>

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
    </aside>
  );
};

export default Sidebar;
