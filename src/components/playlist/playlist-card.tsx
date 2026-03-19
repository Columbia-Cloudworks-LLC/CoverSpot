import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlaylistCardProps {
  id: string;
  name: string;
  totalTracks: number;
  imageUrl: string | null;
  lastSyncedAt: string;
  isCollaborative: boolean;
  featured?: boolean;
}

export function PlaylistCard({
  id,
  name,
  totalTracks,
  imageUrl,
  lastSyncedAt,
  isCollaborative,
  featured = false,
}: PlaylistCardProps) {
  const syncedAgo = getRelativeTime(lastSyncedAt);

  return (
    <Link
      href={`/playlist/${id}`}
      className={cn(
        "group block transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        featured
          ? "rounded-2xl border border-border bg-card/80 hover:bg-accent/40"
          : "border-b border-border/70 py-3 hover:bg-accent/30 px-2 -mx-2 rounded-lg"
      )}
    >
      <div
        className={cn(
          "flex items-start gap-4 p-3",
          featured ? "sm:p-5" : "p-0"
        )}
      >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              width={featured ? 80 : 48}
              height={featured ? 80 : 48}
              sizes={featured ? "80px" : "48px"}
              loading={featured ? "eager" : "lazy"}
              className={cn(
                "rounded-md object-cover shrink-0",
                featured ? "h-20 w-20" : "h-12 w-12"
              )}
            />
          ) : (
            <div
              className={cn(
                "rounded-md bg-muted flex items-center justify-center shrink-0",
                featured ? "h-20 w-20" : "h-12 w-12"
              )}
            >
              <span className="text-2xl text-muted-foreground">♫</span>
            </div>
          )}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <h3
              className={cn(
                featured ? "text-subheading line-clamp-2" : "text-body line-clamp-1 sm:line-clamp-2"
              )}
            >
              {name}
            </h3>
            <p className="text-meta text-muted-foreground">
              {totalTracks} tracks
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-caption text-foreground/75 hidden sm:inline">
                Synced {syncedAgo}
              </span>
              {isCollaborative && (
                <Badge variant="secondary" className="text-caption">
                  Collaborative
                </Badge>
              )}
            </div>
          </div>
        </div>
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
