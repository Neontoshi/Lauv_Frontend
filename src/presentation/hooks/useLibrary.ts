import { useEffect, useState } from "react";
import { useLibraryStore } from "../stores/libraryStore";
import { getSongRepository } from "../../infrastructure/ServiceProvider";
import { tauriCommands } from "../../services/tauriBridge";

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
      const currentSongs = useLibraryStore.getState().songs;
      if (!forceRescan && currentSongs.length > 0) {
        const likedIds = new Set<string>(await tauriCommands.getLikedSongs());
        const likedFull: any[] = await tauriCommands.getLikedSongsFull();
        const existingPaths = new Set(currentSongs.map((s: any) => s.path));
        const newSongs = likedFull
          .filter((s: any) => !existingPaths.has(s.path))
          .map((s: any) => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            album: s.album,
            duration: s.duration_secs,
            artwork: s.thumbnail,
            videoId: s.video_id,
            source: s.source,
            path: s.path,
            liked: likedIds.has(s.id),
            dur: "",
            emoji: "🎵",
            grad: "linear-gradient(135deg, #7c6af5, #4a3fd4)",
            bpm: 0,
            key: "—",
            plays: 0,
          }));
        const updated = currentSongs.map((s: any) => ({
          ...s,
          liked: likedIds.has(s.id),
        }));
        setSongs([...updated, ...newSongs]);
        return;
      }
      if (!forceRescan) {
        setLoading(true);
      }
      setError(null);
      const songRepo = getSongRepository();
      const loadedSongs = forceRescan
        ? await (songRepo as any).rescanLibrary()
        : await songRepo.getAllSongs();
      const likedIds = new Set<string>(await tauriCommands.getLikedSongs());
      const likedFull: any[] = await tauriCommands.getLikedSongsFull();

      let updated = loadedSongs.map((s: any) => ({
        ...s,
        liked: likedIds.has(s.id),
      }));

      const existingPaths = new Set(updated.map((s: any) => s.path));
      const newSongs = likedFull
        .filter((s: any) => !existingPaths.has(s.path))
        .map((s: any) => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          album: s.album,
          duration: s.duration_secs,
          artwork: s.thumbnail,
          videoId: s.video_id,
          source: s.source,
          path: s.path,
          liked: likedIds.has(s.id),
          dur: "",
          emoji: "🎵",
          grad: "linear-gradient(135deg, #7c6af5, #4a3fd4)",
          bpm: 0,
          key: "—",
          plays: 0,
        }));

      setSongs([...updated, ...newSongs]);
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
