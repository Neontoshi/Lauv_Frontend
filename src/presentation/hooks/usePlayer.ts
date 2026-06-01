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
    isLoading,
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
  const currentTrackIdRef = useRef(0);

  const lastPlayedId = useRef<string | null>(null);
  const songEndHandled = useRef(false);
  const streamingVideoId = useRef<string | null>(null);
  const scrobbledRef = useRef(false);
  const playLockRef = useRef(false);
  const urlCache = useRef<Map<string, string>>(new Map());

  const playSong = useCallback(async (song: typeof currentSong) => {
    if (playLockRef.current) {
      console.debug("[usePlayer] Play locked, skipping duplicate call");
      return;
    }

    if (!song) return;
    if (song.id === lastPlayedId.current) return;
    if (song.id === pendingPlayId.current) return;
    if (song.videoId && streamingVideoId.current === song.videoId) return;

    playLockRef.current = true;
    let loadingStart = 0;

    try {
      playerRepo.current.reset();
      usePlayerStore.getState().setError(null);
      scrobbledRef.current = false;

      const wasPaused = !usePlayerStore.getState().isPlaying;

      pendingPlayId.current = song.id;
      lastPlayedId.current = song.id;

      if (song.videoId) {
        streamingVideoId.current = song.videoId;
      }

      currentTrackIdRef.current = Number.MAX_SAFE_INTEGER; // 👈 block stale events immediately
      songEndHandled.current = false;
      setProgress(0);
      usePlayerStore.getState().setDuration(0);
      songEndHandled.current = false;
      streamingVideoId.current = song.videoId ?? null;

      try {
        await playerRepo.current.stop();
      } catch {}

      ignorePositionUntil.current = Date.now() + 120;

      const isStream =
        song.source === "youtube" || song.source === "soundcloud";

      if (isStream) {
        isLoadingRef.current = true;
        usePlayerStore.getState().setIsLoading(true);
        loadingStart = Date.now();
      }

      if (
        (song.source === "youtube" ||
          (song.source as string) === "soundcloud") &&
        song.videoId
      ) {
        let resolvedUrl = urlCache.current.get(song.videoId);
        if (!resolvedUrl) {
          resolvedUrl =
            song.source === "youtube"
              ? await tauriCommands.resolveYoutubeUrl(song.videoId)
              : await tauriCommands.resolveSoundcloudUrl(song.videoId);
          urlCache.current.set(song.videoId, resolvedUrl);
        }
        currentTrackIdRef.current = Date.now();
        const trackId = await playerRepo.current.play({
          ...song,
          path: resolvedUrl,
          source: "local",
        });
        currentTrackIdRef.current = trackId;
      } else {
        currentTrackIdRef.current = Date.now();
        const trackId = await playerRepo.current.play(song);
        currentTrackIdRef.current = trackId;
      }

      if (wasPaused) {
        await playerRepo.current.pause();
      }

      tauriCommands
        .savePlayHistory({
          songId: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album || "",
          durationSecs: song.duration || 0,
          thumbnail:
            song.artwork ||
            (song.videoId
              ? `https://i.ytimg.com/vi/${song.videoId}/default.jpg`
              : ""),
          videoId: song.videoId || undefined,
          source: song.source || "local",
          path: song.path || "",
        })
        .catch(() => {});
    } catch (err) {
      currentTrackIdRef.current = Number.MAX_SAFE_INTEGER;
      lastPlayedId.current = null;
      streamingVideoId.current = null;
      isLoadingRef.current = false;
      usePlayerStore.getState().setIsLoading(false);
      usePlayerStore.getState().setError(String(err));
      usePlayerStore.getState().setPlaying(false);
      usePlayerStore.getState().setProgress(0);
      usePlayerStore.getState().setDuration(0);
    } finally {
      if (loadingStart) {
        const elapsed = Date.now() - loadingStart;
        if (elapsed < 300) {
          await new Promise((r) => setTimeout(r, 300 - elapsed));
        }
      }
      pendingPlayId.current = null;
      playLockRef.current = false;
      isLoadingRef.current = false;
      usePlayerStore.getState().setIsLoading(false); // 👈 add back
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
      usePlayerStore.getState().setDuration(0);
      ignorePositionUntil.current = Date.now() + 120;
    }
  }, [getNextSong, setCurrentSong, setProgress]);

  useEffect(() => {
    let lastUpdate = 0;

    const unsubscribe = playerRepo.current.onPlaybackUpdate(
      (position, duration, backendIsPlaying, eventTrackId) => {
        if (eventTrackId !== currentTrackIdRef.current) {
          return;
        }
        const store = usePlayerStore.getState();

        if (store.isPlaying !== backendIsPlaying) {
          store.setPlaying(backendIsPlaying);
        }

        if (isLoadingRef.current) {
          isLoadingRef.current = false;
          store.setIsLoading(false);
        }

        if (Date.now() < ignorePositionUntil.current) {
          return;
        }

        if (store.duration === 0 && duration > 0) {
          store.setDuration(duration);
        }

        if (isSeekingRef.current) {
          return;
        }

        const now = Date.now();
        if (now - lastUpdate > 80) {
          lastUpdate = now;
          setProgress(isNaN(position) ? 0 : position);

          if (
            !scrobbledRef.current &&
            duration > 0 &&
            position >= Math.min(store.duration / 2, 240)
          ) {
            scrobbledRef.current = true;
            const song = usePlayerStore.getState().currentSong;
            if (song) {
              tauriCommands.getSetting("listenbrainz_token").then((token) => {
                if (token) {
                  fetch("https://api.listenbrainz.org/1/submit-listens", {
                    method: "POST",
                    headers: {
                      Authorization: `Token ${token}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      listen_type: "single",
                      payload: [
                        {
                          listened_at: Math.floor(Date.now() / 1000),
                          track_metadata: {
                            artist_name: song.artist,
                            track_name: song.title,
                            release_name: song.album || undefined,
                          },
                        },
                      ],
                    }),
                  }).catch(() => {});
                }
              });
            }
          }
        }

        if (
          duration > 2 &&
          position >= duration - 2 &&
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

  useEffect(() => {
    let unlisten1: (() => void) | null = null;
    let unlisten2: (() => void) | null = null;

    import("@tauri-apps/api/event").then(({ listen }) => {
      listen("tray-next", () => {
        lastPlayedId.current = null;
        handleNext();
      }).then((fn) => (unlisten1 = fn));

      listen("tray-prev", () => {
        const prev = getPrevSong();
        if (prev) {
          lastPlayedId.current = null;
          setCurrentSong(prev);
          setProgress(0);
          ignorePositionUntil.current = 120;
          try {
            playerRepo.current.stop();
          } catch {}
        }
      }).then((fn) => (unlisten2 = fn));
    });

    return () => {
      unlisten1?.();
      unlisten2?.();
    };
  }, []);

  const togglePlay = async () => {
    const current = usePlayerStore.getState().isPlaying;
    const next = !current;
    setPlaying(next);
    try {
      if (current) await playerRepo.current.pause();
      else await playerRepo.current.resume();
    } catch (err) {
      setPlaying(current);
      console.error(err);
    }
  };

  const seek = async (position: number) => {
    isSeekingRef.current = true;
    setProgress(position);
    try {
      await playerRepo.current.seek(position);
    } catch (err) {
      console.error("Seek failed:", err);
    }
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
      ignorePositionUntil.current = 120;
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
