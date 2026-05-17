import { IPlayerRepository } from "../core/repositories/IPlayerRepository";
import { Song } from "../core/entities/Song";
import { tauriCommands } from "../services/tauriBridge";

export class TauriPlayerRepository implements IPlayerRepository {
  private volumeCache = 70;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  async play(song: Song): Promise<void> {
    await tauriCommands.playTrack(song);
  }

  async pause(): Promise<void> {
    await tauriCommands.pausePlayback();
  }

  async resume(): Promise<void> {
    await tauriCommands.resumePlayback();
  }

  async seek(position: number): Promise<void> {
    await tauriCommands.seekTo(position);
  }

  async setVolume(volume: number): Promise<void> {
    this.volumeCache = volume;
    await tauriCommands.setVolume(volume / 100);
  }

  async getVolume(): Promise<number> {
    const volume = await tauriCommands.getVolume();
    this.volumeCache = volume * 100;
    return this.volumeCache;
  }

  async getCurrentPosition(): Promise<number> {
    const state = await tauriCommands.getPlaybackState();
    return state.position;
  }

  async getDuration(): Promise<number> {
    const state = await tauriCommands.getPlaybackState();
    return state.duration;
  }

  reset(): void {
    // no-op — usePlayer handles resetting
  }

  onPlaybackUpdate(
    callback: (position: number, duration: number) => void,
  ): () => void {
    if (this.pollInterval) clearInterval(this.pollInterval);

    this.pollInterval = setInterval(async () => {
      try {
        const state = await tauriCommands.getPlaybackState();
        callback(state.position, state.duration);
      } catch {
        // ignore
      }
    }, 200);

    return () => {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    };
  }
}
