import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { getPlayerRepository } from "../../infrastructure/ServiceProvider";
import { tauriCommands } from "../../services/tauriBridge";

const pendingPlayId = { current: null as string | null };

export const usePlayer = () => {
  const {
    currentSong,
    isPlaying,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    setCurrentSong,
    setProgress,
    setPlaying,
    setVolume: setVolumeStore,
    toggleMute: toggleMuteStore,
    toggleShuffle: toggleShuffleStore,
    toggleRepeat: toggleRepeatStore,
  } = usePlayerStore();

  const { getNextSong, getPrevSong } = useQueueStore();
  const playerRepo = useRef(getPlayerRepository());

  const isLoadingRef = useRef(false);
  const isSeekingRef = useRef(false);
  const ignorePositionUntil = useRef(0);

  const lastPlayedId = useRef<string | null>(null);
  const songEndHandled = useRef(false);
  const streamingVideoId = useRef<string | null>(null);

  const playSong = useCallback(async (song: typeof currentSong) => {
    if (!song) return;
    if (song.id === lastPlayedId.current) return;
    if (song.id === pendingPlayId.current) return;
    if (song.videoId && streamingVideoId.current === song.videoId) return;

    playerRepo.current.reset();

    const wasPaused = !usePlayerStore.getState().isPlaying;

    pendingPlayId.current = song.id;
    lastPlayedId.current = song.id;

    if (song.videoId) {
      streamingVideoId.current = song.videoId;
    }

    songEndHandled.current = false;

    setProgress(0);
    try {
      await playerRepo.current.stop();
    } catch {}
    ignorePositionUntil.current = Date.now() + 500;

    const { setDuration } = usePlayerStore.getState();
    setDuration(song.duration || 0);

    try {
      isLoadingRef.current = true;
      usePlayerStore.getState().setIsLoading(true);

      if (song.source === "youtube" && song.videoId) {
        const directUrl = await tauriCommands.resolveYoutubeUrl(song.videoId);
        await playerRepo.current.play({
          ...song,
          path: directUrl,
          source: "local",
        });
      } else {
        await playerRepo.current.play(song);
      }

      if (wasPaused) {
        await playerRepo.current.pause();
      }
      ignorePositionUntil.current = 0;
    } catch (err) {
      console.error("Failed to play song:", err);
      streamingVideoId.current = null;
      usePlayerStore.getState().setError(String(err));
    } finally {
      pendingPlayId.current = null;
      isLoadingRef.current = false;
      usePlayerStore.getState().setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentSong) return;
    playSong(currentSong);
  }, [currentSong?.id]);

  const handleNext = useCallback(() => {
    const state = usePlayerStore.getState();
    const nextSong = getNextSong(state.isShuffle, state.repeatMode);

    if (nextSong) {
      lastPlayedId.current = null;
      setCurrentSong(nextSong);
      setProgress(0);
      ignorePositionUntil.current = Date.now() + 500;
    }
  }, [getNextSong, setCurrentSong, setProgress]);

  useEffect(() => {
    let lastUpdate = 0;

    const unsubscribe = playerRepo.current.onPlaybackUpdate(
      (position, duration, backendIsPlaying) => {
        const store = usePlayerStore.getState();

        // sync play state
        if (store.isPlaying !== backendIsPlaying) {
          store.setPlaying(backendIsPlaying);
        }

        if (Date.now() < ignorePositionUntil.current || isSeekingRef.current) {
          return;
        }
        const now = Date.now();
        if (now - lastUpdate > 80) {
          lastUpdate = now;
          setProgress(isNaN(position) ? 0 : position);
        }

        // song end detection
        if (
          duration > 1 &&
          position >= duration - 1 &&
          !songEndHandled.current
        ) {
          songEndHandled.current = true;

          if (store.repeatMode === 2) {
            playerRepo.current.seek(0);
            playerRepo.current.resume();
            setProgress(0);
            songEndHandled.current = false;
          } else {
            handleNext();
          }
        }
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const effectiveVolume = isMuted ? 0 : volume;
    playerRepo.current.setVolume(effectiveVolume);
  }, [volume, isMuted]);

  const togglePlay = async () => {
    const current = usePlayerStore.getState().isPlaying;
    const next = !current;

    setPlaying(next);

    try {
      if (current) {
        await playerRepo.current.pause();
      } else {
        await playerRepo.current.resume();
      }
    } catch (err) {
      setPlaying(current);
      console.error(err);
    }
  };

  const seek = async (position: number) => {
    isSeekingRef.current = true;

    // instant UI update
    setProgress(position);

    try {
      await playerRepo.current.seek(position);
    } catch (err) {
      console.error("Seek failed:", err);
    }

    // allow MPV sync again after it settles
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 250);
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
      ignorePositionUntil.current = Date.now() + 500;
      try {
        playerRepo.current.stop();
      } catch {}
    }
  };
  const setVolume = (v: number) => setVolumeStore(v);
  const toggleMute = () => toggleMuteStore();

  return {
    currentSong,
    isPlaying,
    currentProgress: usePlayerStore.getState().currentProgress,
    volume: isMuted ? 0 : volume,
    isShuffle,
    repeatMode,
    isLoading: isLoadingRef.current,
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
