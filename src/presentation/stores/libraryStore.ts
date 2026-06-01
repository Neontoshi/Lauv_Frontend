import { create } from "zustand";
import { Song } from "../../core/entities/Song";
import { useYouTubeStore } from "./youtubeStore";

interface LibraryStore {
  songs: Song[];
  filteredSongs: Song[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  activeGenre: string;
  activeSort: string;
  triggerReload: number;
  setSongs: (songs: Song[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setActiveGenre: (genre: string) => void;
  setActiveSort: (sort: string) => void;
  toggleLike: (songId: string, songData?: Song) => void;
  setTriggerReload: () => void;
  filterAndSort: () => void;
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  songs: [],
  filteredSongs: [],
  loading: true,
  error: null,
  searchQuery: "",
  activeGenre: "All",
  activeSort: "default",
  triggerReload: 0,

  setSongs: (songs) => set({ songs }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveGenre: (activeGenre) => set({ activeGenre }),
  setActiveSort: (activeSort) => set({ activeSort }),
  setTriggerReload: () => set((s) => ({ triggerReload: s.triggerReload + 1 })),

  toggleLike: (songId, songData) => {
    console.log("[LIKE] toggling:", songId);

    set((state) => {
      const exists = state.songs.find((s) => s.id === songId);

      if (!exists && songData) {
        return {
          songs: [...state.songs, { ...songData, liked: true }],
        };
      }

      if (!exists) {
        const ytStore = useYouTubeStore.getState();
        const ytSong = ytStore.results.find((s: Song) => s.id === songId);
        if (ytSong) {
          return {
            songs: [...state.songs, { ...ytSong, liked: true }],
          };
        }
        return state;
      }

      return {
        songs: state.songs.map((song) =>
          song.id === songId ? { ...song, liked: !song.liked } : song,
        ),
      };
    });

    // Re-sync filteredSongs so the UI reflects the like change
    get().filterAndSort();

    import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke("toggle_like", { trackId: songId }).catch((err) => {
        console.error("[LIKE] backend error:", err);
      });
    });
  },
  filterAndSort: () => {
    const { songs, searchQuery, activeGenre, activeSort } = get();
    let result = [...songs].filter(
      (s) => s.source !== "youtube" && s.source !== "soundcloud",
    );
    console.log(
      "filterAndSort: songs=",
      songs.length,
      "filtered=",
      result.length,
    );
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.album.toLowerCase().includes(q),
      );
    }

    if (activeGenre && activeGenre !== "All") {
      result = result.filter((s) => s.genre === activeGenre);
    }

    switch (activeSort) {
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "artist":
        result.sort((a, b) => a.artist.localeCompare(b.artist));
        break;
      case "album":
        result.sort((a, b) => a.album.localeCompare(b.album));
        break;
      case "duration":
        result.sort((a, b) => a.duration - b.duration);
        break;
    }

    set({ filteredSongs: result });
  },
}));
