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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface YtSong {
  id: string;
  title: string;
  artist: string;
  duration_secs: number;
  duration_str: string;
  thumbnail: string;
  source: "youtube";
}

// ── Commands ──────────────────────────────────────────────────────────────────

export const tauriCommands = {
  // Library commands
  scanFolder: (path: string): Promise<Song[]> =>
    handleInvoke("scan_folder", { path }),

  getSongs: (): Promise<Song[]> => handleInvoke("get_songs"),

  searchSongs: (query: string): Promise<Song[]> =>
    handleInvoke("search_songs", { query }),

  getMetadata: (path: string): Promise<Partial<Song>> =>
    handleInvoke("get_metadata", { path }),

  // Player commands
  playTrack: (song: Song): Promise<void> => {
    const { artwork, ...rest } = song as any;
    return handleInvoke("play_track", { song: rest });
  },

  pausePlayback: (): Promise<void> => handleInvoke("pause_playback"),

  resumePlayback: (): Promise<void> => handleInvoke("resume_playback"),

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

  // YouTube / yt-dlp commands
  searchYoutube: (query: string): Promise<YtSong[]> =>
    handleInvoke("search_youtube", { query }),

  getStreamUrl: (videoId: string): Promise<string> =>
    handleInvoke("get_stream_url", { videoId }),

  downloadYoutubeSong: (videoId: string, outputDir: string): Promise<string> =>
    handleInvoke("download_youtube_song", { videoId, outputDir }),

  checkYtdlp: (): Promise<string> => handleInvoke("check_ytdlp"),
};

// ── Events ────────────────────────────────────────────────────────────────────

export const tauriEvents = {
  onPlaybackUpdate: (
    callback: (data: { position: number; duration: number }) => void,
  ) => {
    return listen<{ position: number; duration: number }>(
      "playback-update",
      (event) => {
        callback(event.payload);
      },
    );
  },

  onTrackChange: (callback: (song: Song) => void) => {
    return listen<Song>("track-change", (event) => {
      callback(event.payload);
    });
  },

  onVolumeChange: (callback: (volume: number) => void) => {
    return listen<number>("volume-change", (event) => {
      callback(event.payload);
    });
  },
};
