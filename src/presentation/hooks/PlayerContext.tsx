// Lauv_Frontend/src/presentation/hooks/PlayerContext.tsx
import React, { createContext, useContext } from "react";
import { usePlayer } from "./usePlayer";

type PlayerContextType = ReturnType<typeof usePlayer>;
const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const player = usePlayer();
  return (
    <PlayerContext.Provider value={player}>{children}</PlayerContext.Provider>
  );
}

export function usePlayerContext() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayerContext must be inside PlayerProvider");
  return ctx;
}
