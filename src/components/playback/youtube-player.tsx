"use client";

import { useState } from "react";
import { ExternalLink, VideoOff } from "lucide-react";

interface YouTubePlayerProps {
  videoId: string;
}

export function YouTubePlayer({ videoId }: YouTubePlayerProps) {
  const [failed, setFailed] = useState(false);

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <div className="space-y-2">
      {failed ? (
        <div className="flex flex-col items-center justify-center gap-2 w-full aspect-video rounded-md bg-muted text-muted-foreground">
          <VideoOff className="size-6" />
          <p className="text-caption text-center">Video unavailable</p>
        </div>
      ) : (
        <div className="relative w-full aspect-video rounded-md overflow-hidden bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=0&modestbranding=1&rel=0`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
            onError={() => setFailed(true)}
          />
        </div>
      )}
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-caption text-muted-foreground hover:text-foreground transition-colors"
      >
        Watch on YouTube
        <ExternalLink className="size-3" />
      </a>
    </div>
  );
}
