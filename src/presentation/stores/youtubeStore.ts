import { create } from "zustand";
import { Song } from "../../core/entities/Song";

interface YouTubeSearchResult {
  id: string;
  title: string;
  artist: string;
  duration_secs: number;
  duration_str: string;
  thumbnail: string;
}

interface YouTubeStore {
  results: Song[];
  isSearching: boolean;
  isLoadingMore: boolean;
  error: string | null;
  lastQuery: string;
  offset: number;

  search: (query: string) => Promise<void>;
  loadMore: () => Promise<void>;
  clearResults: () => void;
  downloadAudio: (videoId: string, title: string) => Promise<string | null>;
}

function randomGradient(): string {
  const hues = [280, 200, 340, 40, 160, 100, 10, 260];
  const h = hues[Math.floor(Math.random() * hues.length)];
  return `linear-gradient(135deg, hsl(${h}, 70%, 45%), hsl(${h + 30}, 70%, 30%))`;
}

function randomEmoji(): string {
  const emojis = ["🎵", "🎶", "🎧", "🎤", "🎼", "🎹", "🎸", "🥁", "🎺", "🎷"];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

function toSong(r: YouTubeSearchResult): Song {
  return {
    id: `yt-${r.id}`,
    path: "",
    title: r.title,
    artist: r.artist || "YouTube",
    album: "YouTube",
    duration: r.duration_secs,
    genre: null,
    year: null,
    track_number: null,
    artwork: null,
    source: "youtube" as const,
    videoId: r.id,
    dur: r.duration_str,
    emoji: randomEmoji(),
    grad: randomGradient(),
    bpm: 0,
    key: "—",
    plays: 0,
    liked: false,
  };
}

function buildMusicQuery(query: string): string {
  const hasIntent = /official|audio|video|lyrics|live|remix|ft\.|feat\./i.test(
    query,
  );
  const looksLikeArtist =
    query.trim().split(" ").length <= 2 && !/[-–]/.test(query);
  return hasIntent
    ? query
    : looksLikeArtist
      ? `${query} songs`
      : `${query} official audio`;
}

export const useYouTubeStore = create<YouTubeStore>((set, get) => ({
  results: [],
  isSearching: false,
  isLoadingMore: false,
  error: null,
  lastQuery: "",
  offset: 0,

  search: async (query: string) => {
    if (!query.trim()) {
      set({ results: [], isSearching: false });
      return;
    }
    set({ isSearching: true, error: null });
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const musicQuery = buildMusicQuery(query);
      const raw: YouTubeSearchResult[] = await invoke("youtube_search", {
        query: musicQuery,
        offset: 0,
      });
      set({
        results: raw.map(toSong),
        isSearching: false,
        lastQuery: musicQuery,
        offset: 15,
      });
    } catch (e) {
      set({ error: String(e), isSearching: false });
    }
  },

  loadMore: async () => {
    const { lastQuery, offset, results } = get();
    if (!lastQuery) return;
    set({ isLoadingMore: true });
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const raw: YouTubeSearchResult[] = await invoke("youtube_search", {
        query: lastQuery,
        offset,
      });
      set({
        results: [...results, ...raw.map(toSong)],
        isLoadingMore: false,
        offset: offset + 15,
      });
    } catch (e) {
      set({ error: String(e), isLoadingMore: false });
    }
  },

  clearResults: () =>
    set({ results: [], error: null, lastQuery: "", offset: 0 }),

  downloadAudio: async (
    videoId: string,
    title: string,
  ): Promise<string | null> => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const filePath: string = await invoke("youtube_download", {
        videoId,
        title,
      });
      return filePath;
    } catch (e) {
      console.error("Download failed:", e);
      return null;
    }
  },
}));
