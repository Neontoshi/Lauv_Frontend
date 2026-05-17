import { create } from "zustand";
import { Song } from "../../core/entities/Song";

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
  toggleLike: (songId: string) => void;
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

  toggleLike: (songId) =>
    set((state) => ({
      songs: state.songs.map((song) =>
        song.id === songId ? { ...song, liked: !song.liked } : song,
      ),
    })),

  filterAndSort: () => {
    const { songs, searchQuery, activeGenre, activeSort } = get();
    let result = [...songs];

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
