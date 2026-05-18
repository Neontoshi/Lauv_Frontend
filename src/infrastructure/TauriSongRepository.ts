import { ISongRepository } from "../core/repositories/ISongRepository";
import { Song } from "../core/entities/Song";
import { tauriCommands } from "../services/tauriBridge";

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

export class TauriSongRepository implements ISongRepository {
  private cachedSongs: Song[] = [];
  private lastScanTime = 0;
  private readonly SCAN_COOLDOWN = 300000;

  async getAllSongs(): Promise<Song[]> {
    let raw = (await tauriCommands.getSongs()) as any[];
    if (raw.length === 0) {
      raw = (await tauriCommands.scanFolder("/home/dicey/Music")) as any[];
      this.lastScanTime = Date.now();
    }
    this.cachedSongs = raw.map(this.mapSong);
    return this.cachedSongs;
  }

  async rescanLibrary(): Promise<Song[]> {
    const now = Date.now();
    if (now - this.lastScanTime < this.SCAN_COOLDOWN) {
      const raw = (await tauriCommands.getSongs()) as any[];
      if (raw.length > 0) {
        this.cachedSongs = raw.map(this.mapSong);
        return this.cachedSongs;
      }
    }
    const raw = (await tauriCommands.scanFolder("/home/dicey/Music")) as any[];
    this.cachedSongs = raw.map(this.mapSong);
    this.lastScanTime = Date.now();
    return this.cachedSongs;
  }

  async getSongById(id: string): Promise<Song | null> {
    const songs = this.cachedSongs.length
      ? this.cachedSongs
      : await this.getAllSongs();
    return songs.find((s) => s.id === id) || null;
  }

  async searchSongs(query: string): Promise<Song[]> {
    const songs = this.cachedSongs.length
      ? this.cachedSongs
      : await this.getAllSongs();
    const q = query.toLowerCase();
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q),
    );
  }

  async getSongsByGenre(genre: string): Promise<Song[]> {
    const songs = await this.getAllSongs();
    return songs.filter((s) => s.genre === genre);
  }

  async getSongsByArtist(artist: string): Promise<Song[]> {
    const songs = await this.getAllSongs();
    return songs.filter((s) => s.artist === artist);
  }

  async getSongsByAlbum(album: string): Promise<Song[]> {
    const songs = await this.getAllSongs();
    return songs.filter((s) => s.album === album);
  }

  private mapSong = (raw: any): Song => {
    let artworkUrl: string | null = null;
    if (raw.artwork && raw.artwork.length > 0) {
      const bytes = new Uint8Array(raw.artwork);
      const blob = new Blob([bytes], { type: "image/*" });
      artworkUrl = URL.createObjectURL(blob);
    }

    return {
      id: raw.id,
      path: raw.path,
      title: raw.title || "Unknown",
      artist: raw.artist || "Unknown",
      album: raw.album || "Unknown",
      duration: raw.duration || 0,
      genre: raw.genre || null,
      year: raw.year || null,
      track_number: raw.track_number || null,
      artwork: artworkUrl,
      dur: formatDuration(raw.duration || 0),
      emoji: "🎵",
      grad: "linear-gradient(135deg,#2d1f6e,#0f172a)",
      bpm: 0,
      key: "",
      plays: 0,
      liked: false,
    };
  };
}
