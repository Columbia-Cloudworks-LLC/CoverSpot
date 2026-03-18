import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlaylistCardProps {
  id: string;
  name: string;
  totalTracks: number;
  imageUrl: string | null;
  lastSyncedAt: string;
  isCollaborative: boolean;
}

export function PlaylistCard({
  id,
  name,
  totalTracks,
  imageUrl,
  lastSyncedAt,
  isCollaborative,
}: PlaylistCardProps) {
  const syncedAgo = getRelativeTime(lastSyncedAt);

  return (
    <Link href={`/playlist/${id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
        <CardHeader className="flex flex-row items-start gap-4 p-4">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="h-16 w-16 rounded-md object-cover shrink-0"
            />
          ) : (
            <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center shrink-0">
              <span className="text-2xl text-muted-foreground">♫</span>
            </div>
          )}
          <div className="flex flex-col gap-1 min-w-0">
            <CardTitle className="text-base truncate">{name}</CardTitle>
            <CardDescription className="text-sm">
              {totalTracks} tracks
            </CardDescription>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                Synced {syncedAgo}
              </span>
              {isCollaborative && (
                <Badge variant="secondary" className="text-xs">
                  Collaborative
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;

  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}
