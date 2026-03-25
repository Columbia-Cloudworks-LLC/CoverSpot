"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export interface PlayableVariant {
  id: string;
  platform: "spotify" | "youtube";
  platform_id: string;
  title: string;
  artist_or_channel: string;
  thumbnail_url: string | null;
  duration_ms: number | null;
  embeddable: boolean;
}

interface PlayerContextValue {
  currentVariant: PlayableVariant | null;
  play: (variant: PlayableVariant) => void;
  stop: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentVariant, setCurrentVariant] = useState<PlayableVariant | null>(null);

  return (
    <PlayerContext.Provider
      value={{
        currentVariant,
        play: setCurrentVariant,
        stop: () => setCurrentVariant(null),
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
