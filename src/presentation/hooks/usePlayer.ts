import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useLibraryStore } from "../stores/libraryStore";
import { useQueueStore } from "../stores/queueStore";
import { getPlayerRepository } from "../../infrastructure/ServiceProvider";

const pendingPlayId = { current: null as string | null };

export const usePlayer = () => {
  const {
    currentSong,
    isPlaying,
    currentProgress,
    volume,
    isMuted,
    duration,
    isShuffle,
    repeatMode,
    setCurrentSong,
    togglePlay: togglePlayStore,
    setProgress,
    setPlaying,
    setVolume: setVolumeStore,
    toggleMute: toggleMuteStore,
    toggleShuffle: toggleShuffleStore,
    toggleRepeat: toggleRepeatStore,
  } = usePlayerStore();

  const { songs } = useLibraryStore();
  const { setQueue, getNextSong, getPrevSong } = useQueueStore();
  const playerRepo = useRef(getPlayerRepository());
  const isLoadingRef = useRef(false);
  const ignorePositionRef = useRef(false);
  const { isLoading, setIsLoading } = usePlayerStore();
  const ignoreDurationRef = useRef(false);

  const lastPlayedId = useRef<string | null>(null);
  const songEndHandled = useRef(false);
  const playToken = useRef(0);
  const streamingVideoId = useRef<string | null>(null);

  const playSong = useCallback(async (song: typeof currentSong) => {
    if (!song) return;
    if (song.id === lastPlayedId.current) return;
    if (song.id === pendingPlayId.current) return;
    if (song.videoId && streamingVideoId.current === song.videoId) return;

    playerRepo.current.reset();

    pendingPlayId.current = song.id;
    lastPlayedId.current = song.id;
    if (song.videoId) {
      streamingVideoId.current = song.videoId;
    }

    const token = ++playToken.current;
    songEndHandled.current = false;

    try {
      await playerRepo.current.pause();
    } catch {}

    setPlaying(false);
    setProgress(0);
    ignorePositionRef.current = true;
    const { setDuration } = usePlayerStore.getState();
    ignoreDurationRef.current = true;
    setDuration(0);
    if (song.duration && song.duration > 0) {
      setDuration(song.duration);
    }
    try {
      setIsLoading(true);
      isLoadingRef.current = true;

      if (song.source === "youtube" && song.videoId) {
        const { invoke } = await import("@tauri-apps/api/core");
        const streamPath: string = await invoke("stream_youtube", {
          videoId: song.videoId,
        });
        streamingVideoId.current = null;
        if (token !== playToken.current) return;
        if (streamPath.startsWith("/tmp/lauv_yt_")) {
          isLoadingRef.current = false;
          ignorePositionRef.current = false;
          usePlayerStore.getState().setIsLoading(false);
        }
        const streamSong = { ...song, path: streamPath };
        await playerRepo.current.play(streamSong);
      } else {
        if (token !== playToken.current) return;
        isLoadingRef.current = false;
        ignorePositionRef.current = false;
        usePlayerStore.getState().setIsLoading(false);
        await playerRepo.current.play(song);
      }

      if (token === playToken.current) {
        setPlaying(true);
      }
    } catch (err) {
      console.error("Failed to play song:", err);
      streamingVideoId.current = null;
      isLoadingRef.current = false;
      ignorePositionRef.current = false;
      usePlayerStore.getState().setError(String(err));
      usePlayerStore.getState().setIsLoading(false);
      if (token === playToken.current) {
        setPlaying(false);
      }
    } finally {
      pendingPlayId.current = null;
    }
  }, []);

  useEffect(() => {
    if (!currentSong) return;

    playSong(currentSong);
  }, [currentSong?.id]);

  // Rebuild the queue whenever the library loads or the current song changes.
  // Runs separately from playSong so we always have an up-to-date queue even
  // if songs weren't loaded yet when the song effect first fired.
  useEffect(() => {
    if (!currentSong || songs.length === 0) return;

    if (currentSong.source === "youtube") {
      // For YouTube songs put just the current song in the queue so
      // next/prev still work (prev goes back to whatever was before it).
      const queueState = useQueueStore.getState();
      const isInQueue = queueState.queue.some((s) => s.id === currentSong.id);
      if (!isInQueue) {
        setQueue([currentSong], currentSong, "search");
      }
      return;
    }

    const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
    if (currentIndex >= 0) {
      // Always update the queue with the full library so the index is correct.
      setQueue(songs, currentSong, "library");
    }
  }, [currentSong?.id, songs]);

  const handleNext = useCallback(() => {
    const state = usePlayerStore.getState();
    const nextSong = getNextSong(state.isShuffle, state.repeatMode);

    if (nextSong) {
      lastPlayedId.current = null;
      setCurrentSong(nextSong);
      setProgress(0);
      ignorePositionRef.current = true;
    }
  }, [getNextSong, setCurrentSong, setProgress]);

  const songsRef = useRef(songs);
  songsRef.current = songs;

  const handleNextRef = useRef(handleNext);
  handleNextRef.current = handleNext;

  useEffect(() => {
    // Add throttle timer ref
    let lastUpdate = 0;
    let pendingUpdate: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = playerRepo.current.onPlaybackUpdate(
      (position, duration) => {
        if (usePlayerStore.getState().isPlaying && isLoadingRef.current) {
          isLoadingRef.current = false;
          ignorePositionRef.current = false;
          usePlayerStore.getState().setIsLoading(false);
        }

        // THROTTLE: Only update every 100ms
        const now = Date.now();
        if (usePlayerStore.getState().isPlaying && !ignorePositionRef.current) {
          if (now - lastUpdate >= 100) {
            // Update immediately
            lastUpdate = now;
            setProgress(isNaN(position) ? 0 : position);

            // Clear any pending update
            if (pendingUpdate) {
              clearTimeout(pendingUpdate);
              pendingUpdate = null;
            }
          } else if (!pendingUpdate) {
            // Schedule the last update
            pendingUpdate = setTimeout(() => {
              setProgress(isNaN(position) ? 0 : position);
              lastUpdate = Date.now();
              pendingUpdate = null;
            }, 100);
          }
        }

        if (
          duration > 1 &&
          position >= duration - 1 &&
          !songEndHandled.current
        ) {
          songEndHandled.current = true;
          const state = usePlayerStore.getState();
          if (state.repeatMode === 2) {
            songEndHandled.current = false;
            playerRepo.current.seek(0);
            playerRepo.current.resume();
            setProgress(0);
          } else {
            handleNextRef.current();
          }
        }
      },
    );
    return () => {
      if (pendingUpdate) clearTimeout(pendingUpdate);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const syncVolume = async () => {
      const effectiveVolume = isMuted ? 0 : volume;
      await playerRepo.current.setVolume(effectiveVolume);
    };
    syncVolume();
  }, [volume, isMuted]);

  const togglePlay = async () => {
    try {
      if (isPlaying) {
        await playerRepo.current.pause();
      } else {
        await playerRepo.current.resume();
      }
      togglePlayStore();
    } catch (err) {
      console.error("Failed to toggle playback:", err);
    }
  };

  const setVolume = async (newVolume: number) => {
    setVolumeStore(newVolume);
  };

  const toggleMute = async () => {
    toggleMuteStore();
  };

  const nextSong = () => {
    lastPlayedId.current = null;
    handleNext();
  };

  const prevSong = () => {
    const prev = getPrevSong();
    if (prev) {
      lastPlayedId.current = null;
      setCurrentSong(prev);
      setProgress(0);
      ignorePositionRef.current = true;
    }
  };

  const seek = async (position: number) => {
    await playerRepo.current.seek(position);
    setProgress(position);
  };

  return {
    currentSong,
    isPlaying,
    currentProgress,
    duration,
    volume: isMuted ? 0 : volume,
    repeatMode,
    isShuffle,
    isLoading,
    togglePlay,
    setProgress: seek,
    setVolume,
    toggleMute,
    toggleShuffle: toggleShuffleStore,
    toggleRepeat: toggleRepeatStore,
    nextSong,
    prevSong,
  };
};
