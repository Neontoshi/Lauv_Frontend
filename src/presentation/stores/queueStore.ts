import { create } from "zustand";
import { Song } from "../../core/entities/Song";

export type QueueSource = "library" | "search" | "playlist" | "none";

interface QueueStore {
  queue: Song[];
  currentIndex: number;
  source: QueueSource;

  // Set a new queue from a list of songs, starting at the given song
  setQueue: (songs: Song[], startSong: Song, source: QueueSource) => void;

  // Get next song (respects repeat/shuffle from playerStore)
  getNextSong: (isShuffle: boolean, repeatMode: number) => Song | null;

  // Get previous song
  getPrevSong: () => Song | null;

  // Move to a specific index
  setIndex: (index: number) => void;

  // Clear queue
  clearQueue: () => void;
}

export const useQueueStore = create<QueueStore>((set, get) => ({
  queue: [],
  currentIndex: -1,
  source: "none",

  setQueue: (songs, startSong, source) => {
    const startIndex = songs.findIndex((s) => s.id === startSong.id);
    set({
      queue: songs,
      currentIndex: startIndex >= 0 ? startIndex : 0,
      source,
    });
  },

  getNextSong: (isShuffle, repeatMode) => {
    const { queue, currentIndex } = get();
    if (queue.length === 0) return null;

    if (isShuffle) {
      // Pick random song, not the current one
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * queue.length);
      } while (randomIndex === currentIndex && queue.length > 1);
      set({ currentIndex: randomIndex });
      return queue[randomIndex];
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      set({ currentIndex: nextIndex });
      return queue[nextIndex];
    }

    // End of queue
    if (repeatMode === 1) {
      // Loop the queue
      set({ currentIndex: 0 });
      return queue[0];
    }

    // repeatMode 0 or 2 — stop or repeat one (handled by caller)
    return null;
  },

  getPrevSong: () => {
    const { queue, currentIndex } = get();
    if (queue.length === 0) return null;

    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      set({ currentIndex: prevIndex });
      return queue[prevIndex];
    }

    // Wrap to end
    const lastIndex = queue.length - 1;
    set({ currentIndex: lastIndex });
    return queue[lastIndex];
  },

  setIndex: (index) => set({ currentIndex: index }),

  clearQueue: () => set({ queue: [], currentIndex: -1, source: "none" }),
}));
