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
  source: "youtube";
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

  checkDownloadExists: (videoId: string): Promise<boolean> =>
    handleInvoke("check_download_exists", { videoId }),

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
    // Ensure source field is included for YouTube detection
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

  resetVisualizer: (): Promise<void> => handleInvoke("reset_visualizer"),

  // YouTube — FIXED command names
  searchYoutube: (query: string): Promise<YtSong[]> =>
    handleInvoke("youtube_search", { query }),

  streamYoutube: (videoId: string): Promise<string> =>
    handleInvoke("stream_youtube", { videoId }),

  downloadYoutube: (videoId: string, title: string): Promise<string> =>
    handleInvoke("youtube_download", { videoId, title }),

  resolveYoutubeUrl: (videoId: string): Promise<string> =>
    handleInvoke("resolve_youtube_url", { videoId }),

  checkYtdlp: (): Promise<string> => handleInvoke("check_ytdlp"),
};

// ── Events ─────────────────────────────────────────────────────────────────

export const tauriEvents = {
  onPlaybackUpdate: (
    callback: (data: {
      position: number;
      duration: number;
      is_playing: boolean;
    }) => void,
  ): (() => void) => {
    const unlisten = listen<{
      position: number;
      duration: number;
      is_playing: boolean;
    }>("playback-update", (event) => callback(event.payload));
    // Return cleanup function
    let done = false;
    const cleanup = () => {
      if (!done) {
        done = true;
        unlisten.then((fn) => fn());
      }
    };
    return cleanup;
  },

  onTrackEnded: (callback: () => void): (() => void) => {
    const unlisten = listen<boolean>("track-ended", () => callback());
    let done = false;
    const cleanup = () => {
      if (!done) {
        done = true;
        unlisten.then((fn) => fn());
      }
    };
    return cleanup;
  },

  onAudioFrequencies: (
    callback: (frequencies: number[]) => void,
  ): (() => void) => {
    const unlisten = listen<number[]>("audio-frequencies", (event) =>
      callback(event.payload),
    );
    let done = false;
    const cleanup = () => {
      if (!done) {
        done = true;
        unlisten.then((fn) => fn());
      }
    };
    return cleanup;
  },
};
