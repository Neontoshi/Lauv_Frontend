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
  const currentTrackIdRef = useRef(0);

  const lastPlayedId = useRef<string | null>(null);
  const songEndHandled = useRef(false);
  const streamingVideoId = useRef<string | null>(null);
  const scrobbledRef = useRef(false);
  const urlCache = useRef<Map<string, { url: string; expires: number }>>(
    new Map(),
  );

  const playSong = useCallback(async (song: typeof currentSong) => {
    currentTrackIdRef.current += 1;
    if (!song) return;
    if (song.id === lastPlayedId.current) return;
    if (song.id === pendingPlayId.current) return;
    if (song.videoId && streamingVideoId.current === song.videoId) return;

    playerRepo.current.reset();
    scrobbledRef.current = false;

    const wasPaused = !usePlayerStore.getState().isPlaying;

    pendingPlayId.current = song.id;
    lastPlayedId.current = song.id;

    if (song.videoId) {
      streamingVideoId.current = song.videoId;
    }

    songEndHandled.current = false;

    const { setDuration } = usePlayerStore.getState();

    setProgress(0);
    setDuration(0);
    songEndHandled.current = false;
    streamingVideoId.current = song.videoId ?? null;

    try {
      await playerRepo.current.stop();
    } catch {}

    ignorePositionUntil.current = Date.now() + 500;

    if (song.duration && song.duration > 0) {
      setDuration(song.duration);
    }
    try {
      isLoadingRef.current = true;
      usePlayerStore.getState().setIsLoading(true);

      if (
        (song.source === "youtube" ||
          (song.source as string) === "soundcloud") &&
        song.videoId
      ) {
        let directUrl: string;
        const cached = urlCache.current.get(song.videoId);

        if (cached && Date.now() < cached.expires) {
          directUrl = cached.url;
        } else {
          if (song.source === "youtube") {
            directUrl = await tauriCommands.resolveYoutubeUrl(song.videoId);
          } else if ((song.source as string) === "soundcloud") {
            directUrl = await tauriCommands.resolveSoundcloudUrl(song.videoId);
          } else {
            directUrl = song.videoId; // fallback
          }
          urlCache.current.set(song.videoId, {
            url: directUrl,
            expires: Date.now() + 5 * 60 * 60 * 1000,
          });
        }
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
    const { setDuration } = usePlayerStore.getState();

    if (nextSong) {
      lastPlayedId.current = null;
      setCurrentSong(nextSong);
      setProgress(0);
      setDuration(0);
      ignorePositionUntil.current = Date.now() + 500;
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

        if (Date.now() < ignorePositionUntil.current) {
          if (position > 0 || duration > 0) {
            ignorePositionUntil.current = 0;
          } else {
            return;
          }
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
            position >= Math.min(duration / 2, 240)
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
      ignorePositionUntil.current = Number.MAX_SAFE_INTEGER;
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
