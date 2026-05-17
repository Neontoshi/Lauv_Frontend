import { useEffect, useState } from "react";
import { useLibraryStore } from "../stores/libraryStore";
import { getSongRepository } from "../../infrastructure/ServiceProvider";

export const useLibrary = () => {
  const {
    songs,
    filteredSongs,
    searchQuery,
    activeGenre,
    activeSort,
    setSongs,
    setSearchQuery,
    setActiveGenre,
    setActiveSort,
    filterAndSort,
    toggleLike,
  } = useLibraryStore();

  const [loading, setLoading] = useState(songs.length === 0);
  const [error, setError] = useState<string | null>(null);
  const triggerReload = useLibraryStore((s) => s.triggerReload);

  useEffect(() => {
    if (songs.length === 0) {
      loadSongs();
    }
  }, []);

  useEffect(() => {
    if (triggerReload > 0) loadSongs(true);
  }, [triggerReload]);

  const loadSongs = async (forceRescan = false) => {
    try {
      if (!forceRescan) {
        setLoading(true);
      }
      setError(null);
      const songRepo = getSongRepository();
      const loadedSongs = forceRescan
        ? await (songRepo as any).rescanLibrary()
        : await songRepo.getAllSongs();
      setSongs(loadedSongs);
    } catch (err) {
      console.error("Failed to load songs:", err);
      setError(err instanceof Error ? err.message : "Failed to load songs");
    } finally {
      if (!forceRescan) {
        setLoading(false);
      }
    }
  };
  useEffect(() => {
    filterAndSort();
  }, [searchQuery, activeGenre, activeSort, songs]);

  return {
    songs: filteredSongs,
    allSongs: songs,
    searchQuery,
    activeGenre,
    activeSort,
    loading,
    error,
    setSearchQuery,
    setActiveGenre,
    setActiveSort,
    toggleLike,
    reloadSongs: loadSongs,
  };
};
