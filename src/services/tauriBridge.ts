import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Song } from "../core/entities/Song";

export class TauriError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "TauriError";
  }
}

const handleInvoke = async <T>(command: string, args?: any): Promise<T> => {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    console.error(`Failed to invoke ${command}:`, error);
    throw new TauriError(
      typeof error === "string" ? error : "Unknown error occurred",
      "INVOKE_ERROR",
    );
  }
};

// ── Types ──────────────────────────────────────────────────────────────────

export interface YtSong {
  id: string;
  title: string;
  artist: string;
  duration_secs: number;
  duration_str: string;
  thumbnail: string;
  source: "youtube" | "soundcloud";
}

// ── Commands ───────────────────────────────────────────────────────────────

export const tauriCommands = {
  // Library
  scanFolder: (path: string): Promise<Song[]> =>
    handleInvoke("scan_folder", { path }),

  getSongs: (): Promise<Song[]> => handleInvoke("get_songs"),

  searchSongs: (query: string): Promise<Song[]> =>
    handleInvoke("search_songs", { query }),

  getMetadata: (path: string): Promise<Partial<Song>> =>
    handleInvoke("get_metadata", { path }),

  // Player
  playTrack: (song: Song): Promise<void> => {
    const {
      artwork,
      dur,
      emoji,
      grad,
      bpm,
      key,
      plays,
      liked,
      videoId,
      source,
      ...rest
    } = song as any;
    const payload = source ? { ...rest, source } : rest;
    return handleInvoke("play_track", { song: payload });
  },

  pausePlayback: (): Promise<void> => handleInvoke("pause_playback"),

  resumePlayback: (): Promise<void> => handleInvoke("resume_playback"),

  stopPlayback: (): Promise<void> => handleInvoke("stop_playback"),

  seekTo: (position: number): Promise<void> =>
    handleInvoke("seek_to", { position }),

  setVolume: (level: number): Promise<void> =>
    handleInvoke("set_volume", { level }),

  getVolume: (): Promise<number> => handleInvoke("get_volume"),

  getPlaybackState: (): Promise<{
    position: number;
    duration: number;
    is_playing: boolean;
  }> => handleInvoke("get_playback_state"),

  nextTrack: (): Promise<void> => handleInvoke("next_track"),

  previousTrack: (): Promise<void> => handleInvoke("prev_track"),

  // YouTube
  searchYoutube: (query: string): Promise<YtSong[]> =>
    handleInvoke("youtube_search", { query }),

  streamYoutube: (videoId: string): Promise<string> =>
    handleInvoke("stream_youtube", { videoId }),

  downloadYoutube: (videoId: string, title: string): Promise<string> =>
    handleInvoke("youtube_download", { videoId, title }),

  resolveYoutubeUrl: (videoId: string): Promise<string> =>
    handleInvoke("resolve_youtube_url", { videoId }),

  checkDownloadExists: (videoId: string): Promise<boolean> =>
    handleInvoke("check_download_exists", { videoId }),

  // SoundCloud
  searchSoundcloud: (query: string): Promise<YtSong[]> =>
    handleInvoke("soundcloud_search", { query }),

  resolveSoundcloudUrl: (videoId: string): Promise<string> =>
    handleInvoke("resolve_soundcloud_url", { videoId }),

  streamSoundcloud: (videoId: string): Promise<string> =>
    handleInvoke("stream_soundcloud", { videoId }),

  downloadSoundcloud: (videoId: string, title: string): Promise<string> =>
    handleInvoke("soundcloud_download", { videoId, title }),

  checkSoundcloudDownloadExists: (videoId: string): Promise<boolean> =>
    handleInvoke("check_soundcloud_download_exists", { videoId }),

  // Settings
  getSetting: (key: string): Promise<string | null> =>
    handleInvoke("get_setting", { key }),

  setSetting: (key: string, value: string): Promise<void> =>
    handleInvoke("set_setting", { key, value }),

  fetchListenbrainzStats: (user: string): Promise<string> =>
    handleInvoke("fetch_listenbrainz_stats", { user }),

  // Play history
  savePlayHistory: (params: {
    songId: string;
    title: string;
    artist: string;
    album: string;
    durationSecs: number;
    thumbnail: string;
    videoId?: string;
    source: string;
    path?: string;
  }) => handleInvoke("save_play_history", params),

  getRecentlyPlayed: (limit?: number) =>
    handleInvoke("get_recently_played", { limit }),

  // Liked songs
  getLikedSongs: (): Promise<string[]> => handleInvoke("get_liked_songs"),

  toggleLike: (trackId: string): Promise<boolean> =>
    handleInvoke("toggle_like", { trackId }),

  saveLikedSong: (params: {
    id: string;
    title: string;
    artist: string;
    album: string;
    durationSecs: number;
    thumbnail: string;
    videoId?: string;
    source: string;
    path: string;
  }) => handleInvoke("save_liked_song", params),

  toggleLikeSoundcloud: (params: {
    trackId: string;
    title: string;
    artist: string;
    album: string;
    durationSecs: number;
    thumbnail: string;
    videoId?: string;
    path: string;
  }): Promise<boolean> => handleInvoke("toggle_like_soundcloud", params),

  getLikedSongsFull: (): Promise<any[]> => handleInvoke("get_liked_songs_full"),

  // Playlists
  createPlaylist: (
    name: string,
    description?: string,
    emoji?: string,
    mood?: string,
    privacy?: string,
  ): Promise<string> =>
    handleInvoke("create_playlist", {
      name,
      description,
      emoji,
      mood,
      privacy,
    }),

  getPlaylists: (): Promise<any[]> => handleInvoke("get_playlists"),

  addToPlaylist: (
    playlistId: string,
    songId: string,
    title: string,
    artist: string,
    album: string,
    durationSecs: number,
    thumbnail: string,
    source: string,
    path: string,
    videoId?: string,
  ): Promise<void> =>
    handleInvoke("add_to_playlist", {
      playlistId,
      songId,
      title,
      artist,
      album,
      durationSecs,
      thumbnail,
      source,
      path,
      videoId,
    }),

  getPlaylistSongs: (playlistId: string): Promise<any[]> =>
    handleInvoke("get_playlist_songs", { playlistId }),

  removeFromPlaylist: (playlistId: string, songId: string): Promise<void> =>
    handleInvoke("remove_from_playlist", { playlistId, songId }),

  // Utilities
  checkYtdlp: (): Promise<string> => handleInvoke("check_ytdlp"),
};

// ── Events ─────────────────────────────────────────────────────────────────

export const tauriEvents = {
  onPlaybackUpdate: (
    callback: (data: {
      position: number;
      duration: number;
      track_id: number;
      is_playing: boolean;
    }) => void,
  ): (() => void) => {
    const unlisten = listen<{
      position: number;
      duration: number;
      track_id: number;
      is_playing: boolean;
    }>("playback-update", (event) => callback(event.payload));
    let done = false;
    return () => {
      if (!done) {
        done = true;
        unlisten.then((fn) => fn());
      }
    };
  },

  onTrackEnded: (callback: () => void): (() => void) => {
    const unlisten = listen<boolean>("track-ended", () => callback());
    let done = false;
    return () => {
      if (!done) {
        done = true;
        unlisten.then((fn) => fn());
      }
    };
  },
};
