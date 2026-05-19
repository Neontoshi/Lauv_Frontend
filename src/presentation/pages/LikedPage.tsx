import React, { useMemo } from "react";
import SongRow from "../components/Library/SongRow";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { useQueueStore } from "../stores/queueStore";
import { Song } from "../../core/entities/Song";

const LikedPage: React.FC = () => {
  const { songs } = useLibraryStore();
  const { currentSong, setCurrentSong, setProgress } = usePlayerStore();
  const { setQueue } = useQueueStore();

  const likedSongs = useMemo(() => songs.filter((s) => s.liked), [songs]);

  const handlePlay = (song: Song) => {
    setQueue(likedSongs, song, "library");
    setCurrentSong(song);
    setProgress(0);
  };

  return (
    <div className="song-list-pane">
      <div className="section-header">
        <div>
          <div className="section-title">❤️ Liked Songs</div>
          <div className="section-sub">{likedSongs.length} songs</div>
        </div>
      </div>

      {likedSongs.length === 0 ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "var(--text3)",
          }}
        >
          No liked songs yet. Click the heart on any song to add it here.
        </div>
      ) : (
        likedSongs.map((song, idx) => (
          <SongRow
            key={song.id}
            song={song}
            index={idx}
            isCurrent={currentSong?.id === song.id}
            onPlay={() => handlePlay(song)}
          />
        ))
      )}
    </div>
  );
};

export default LikedPage;
