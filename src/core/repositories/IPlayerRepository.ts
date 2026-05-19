import { Song } from "../entities/Song";

export interface IPlayerRepository {
  play(song: Song): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  seek(position: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  getVolume(): Promise<number>;
  getCurrentPosition(): Promise<number>;
  getDuration(): Promise<number>;
  reset(): void;
  onPlaybackUpdate(
    callback: (
      position: number,
      duration: number,
      isPlaying: boolean,
      trackId: number,
    ) => void,
  ): () => void;
}
