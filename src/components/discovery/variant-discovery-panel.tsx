"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, getAccessToken } from "@/lib/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { VariantCard } from "@/components/discovery/variant-card";
import { toast } from "sonner";
import { AlertTriangle, Loader2, RefreshCw, X } from "lucide-react";

const VARIANT_TYPES = ["cover", "live", "acoustic", "remix", "custom"] as const;

interface Track {
  id: string;
  title: string;
  artist_name: string;
  position: number;
}

interface Variant {
  id: string;
  platform: "spotify" | "youtube";
  platform_id: string;
  variant_type: string;
  title: string;
  artist_or_channel: string;
  thumbnail_url: string | null;
  duration_ms: number | null;
  embeddable: boolean;
  status: string;
  rejection_reason: string | null;
  relevance_score?: number | null;
  flag_count?: number;
}

type ConfidenceTier = "high" | "low" | "none";

interface DiscoveryError {
  message: string;
  needsReauth?: boolean;
  partial?: boolean;
}

interface VariantDiscoveryPanelProps {
  track: Track;
  playlistId: string;
  spotifyPlaylistId: string;
  snapshotId: string;
  onClose: () => void;
  onSearched?: (trackId: string) => void;
  showTrackHeader?: boolean;
}

export function VariantDiscoveryPanel({
  track,
  playlistId,
  spotifyPlaylistId,
  snapshotId,
  onClose,
  onSearched,
  showTrackHeader = true,
}: VariantDiscoveryPanelProps) {
  const [variantType, setVariantType] = useState<string>(VARIANT_TYPES[0]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [rejected, setRejected] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [showLowConfidence, setShowLowConfidence] = useState(false);
  const [customType, setCustomType] = useState("");
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [confidenceTier, setConfidenceTier] = useState<ConfidenceTier | null>(null);
  const [discoveryError, setDiscoveryError] = useState<DiscoveryError | null>(null);
  const requestIdRef = useRef(0);

  const discover = async (type?: string) => {
    const searchType =
      type ??
      (variantType === "custom" ? customType.trim() : variantType);
    if (!searchType) return;

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setSearched(true);
    setDiscoveryError(null);
    setShowLowConfidence(false);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke(
        "discover-variants",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          body: { track_id: track.id, variant_type: searchType },
        }
      );

      if (currentRequestId !== requestIdRef.current) return;

      if (error) {
        const errorData = data as Record<string, unknown> | null;
        const needsReauth = errorData?.needsReauth === true;
        setDiscoveryError({
          message: needsReauth
            ? "Your Spotify session has expired."
            : "Discovery failed. Please try again.",
          needsReauth,
        });
        return;
      }

      const found: Variant[] = data.variants ?? [];
      const foundRejected: Variant[] = data.rejected ?? [];
      const tier: ConfidenceTier = data.confidenceTier ?? "high";

      // Sort by relevance_score DESC within each platform group
      const sortByScore = (a: Variant, b: Variant) =>
        ((b.relevance_score ?? 0) - (a.relevance_score ?? 0));
      found.sort(sortByScore);
      foundRejected.sort(sortByScore);

      setVariants(found);
      setRejected(foundRejected);
      setConfidenceTier(tier);

      // Check if YouTube returned no results (partial failure)
      const hasYoutube = found.some((v) => v.platform === "youtube") ||
        foundRejected.some((v) => v.platform === "youtube");
      if (!hasYoutube && found.length > 0) {
        setDiscoveryError({
          message: "YouTube results unavailable — showing Spotify results only.",
          partial: true,
        });
      }

      setTypeCounts((prev) => ({ ...prev, [searchType]: found.length }));
      onSearched?.(track.id);
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return;
      setDiscoveryError({ message: "Discovery failed unexpectedly. Please try again." });
      console.error(err);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleTypeChange = (type: string) => {
    setVariantType(type);
    setVariants([]);
    setRejected([]);
    setSearched(false);
    setShowRejected(false);
    setShowLowConfidence(false);
    setConfidenceTier(null);
    setDiscoveryError(null);

    if (type !== "custom") {
      setCustomType("");
      discover(type);
    }
  };

  useEffect(() => {
    setVariantType(VARIANT_TYPES[0]);
    setCustomType("");
    setVariants([]);
    setRejected([]);
    setSearched(false);
    setShowRejected(false);
    setShowLowConfidence(false);
    setTypeCounts({});
    setConfidenceTier(null);
    setDiscoveryError(null);
    void discover(VARIANT_TYPES[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run default preset search only when track changes
  }, [track.id]);

  const rejectedLabel = `${rejected.length} rejected result${
    rejected.length === 1 ? "" : "s"
  }`;

  const renderVariantsByPlatform = (items: Variant[]) => {
    const spotifyVariants = items.filter((v) => v.platform === "spotify");
    const youtubeVariants = items.filter((v) => v.platform === "youtube");

    return (
      <>
        {spotifyVariants.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
                On Spotify
              </span>
              <Separator className="flex-1" />
            </div>
            {spotifyVariants.map((v) => (
              <VariantCard
                key={v.id}
                variant={v}
                playlistId={playlistId}
                spotifyPlaylistId={spotifyPlaylistId}
                snapshotId={snapshotId}
                originalTrackPosition={track.position}
              />
            ))}
          </div>
        )}
        {youtubeVariants.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
                On YouTube
              </span>
              <Separator className="flex-1" />
            </div>
            {youtubeVariants.map((v) => (
              <VariantCard
                key={v.id}
                variant={v}
                playlistId={playlistId}
                spotifyPlaylistId={spotifyPlaylistId}
                snapshotId={snapshotId}
                originalTrackPosition={track.position}
              />
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {showTrackHeader && (
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-body font-semibold truncate">{track.title}</span>
              <span className="text-caption text-muted-foreground shrink-0">·</span>
              <span className="text-caption text-muted-foreground truncate">{track.artist_name}</span>
              <span className="text-caption text-muted-foreground shrink-0">— Alternatives</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close discovery panel"
            className="shrink-0 cursor-pointer h-8 w-8 rounded-full"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      <Tabs value={variantType} onValueChange={handleTypeChange}>
        <TabsList variant="line" className="w-full h-auto min-h-9 flex p-0 gap-0 border-b border-border rounded-none bg-transparent">
          {VARIANT_TYPES.map((type) => (
            <TabsTrigger
              key={type}
              value={type}
              className="capitalize text-caption h-9 cursor-pointer flex-1 min-w-0 rounded-none border-b-2 border-transparent data-active:border-primary data-active:text-foreground data-active:font-semibold px-1"
            >
              <span className="truncate">{type}</span>
              {typeCounts[type] !== undefined && (
                <span className="ml-1 text-[10px] text-muted-foreground tabular-nums">
                  ({typeCounts[type]})
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {variantType === "custom" && (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              id="custom-variant-type"
              aria-label="Custom variant type, e.g. piano cover"
              placeholder="e.g. piano cover, orchestral"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customType.trim()) {
                  discover();
                }
              }}
              className="flex-1 rounded-md border border-input bg-transparent px-3 py-2.5 text-body placeholder:text-muted-foreground min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <Button
              onClick={() => discover()}
              disabled={loading || !customType.trim()}
              className="cursor-pointer min-h-11 sm:min-w-28 gap-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1.5 flex-1 overflow-y-auto min-h-0">
        {/* Optimistic loading skeletons with platform section structure */}
        {loading && (
          <>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
                  On Spotify
                </span>
                <Separator className="flex-1" />
              </div>
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={`sp-${i}`} className="h-14 rounded-md" />
              ))}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
                  On YouTube
                </span>
                <Separator className="flex-1" />
              </div>
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={`yt-${i}`} className="h-14 rounded-md" />
              ))}
            </div>
          </>
        )}

        {/* Error banner (non-blocking for partial failures) */}
        {!loading && discoveryError && (
          <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-body ${
            discoveryError.partial
              ? "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200"
              : "bg-destructive/10 text-destructive"
          }`}>
            <AlertTriangle className="size-4 shrink-0" />
            <span className="flex-1">{discoveryError.message}</span>
            {discoveryError.needsReauth ? (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 cursor-pointer"
                onClick={() => { window.location.href = "/"; }}
              >
                Reconnect Spotify
              </Button>
            ) : !discoveryError.partial ? (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 cursor-pointer gap-1"
                onClick={() => discover()}
              >
                <RefreshCw className="size-3" />
                Retry
              </Button>
            ) : null}
          </div>
        )}

        {/* Confidence tier banners */}
        {!loading && searched && variants.length > 0 && confidenceTier === "low" && (
          <div className="flex items-center gap-2 rounded-md px-3 py-2 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-body">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Results may not be exact matches — review before using.</span>
          </div>
        )}

        {!loading && searched && variants.length > 0 && confidenceTier === "none" && !showLowConfidence && (
          <div className="flex flex-col items-center gap-2 rounded-md px-3 py-4 bg-muted/50 text-muted-foreground text-body text-center">
            <p>No strong matches found for this track.</p>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setShowLowConfidence(true)}
            >
              Show low-confidence results
            </Button>
          </div>
        )}

        {!loading && searched && variants.length === 0 && !discoveryError && (
          <p className="text-body text-muted-foreground text-center py-6">
            No variants found for this type.
          </p>
        )}

        {!loading && !searched && variantType !== "custom" && (
          <p className="text-body text-muted-foreground text-center py-6">
            Select a type above to discover alternatives.
          </p>
        )}

        {!loading && !searched && variantType === "custom" && (
          <p className="text-body text-muted-foreground text-center py-6">
            Enter a custom type and search to discover alternatives.
          </p>
        )}

        {/* Variant list (gated by confidence for "none" tier) */}
        {!loading &&
          variants.length > 0 &&
          (confidenceTier !== "none" || showLowConfidence) &&
          renderVariantsByPlatform(variants)}

        {/* Rejected results toggle */}
        {!loading && rejected.length > 0 && (
          <div className="pt-2 border-t border-border space-y-1.5">
            <button
              onClick={() => setShowRejected(!showRejected)}
              className="text-caption text-muted-foreground hover:text-foreground cursor-pointer min-h-11 inline-flex items-center"
            >
              {showRejected ? "Hide" : "Show"} {rejectedLabel}
            </button>
            {showRejected &&
              rejected.map((v) => (
                <VariantCard
                  key={v.id}
                  variant={v}
                  playlistId={playlistId}
                  spotifyPlaylistId={spotifyPlaylistId}
                  snapshotId={snapshotId}
                  originalTrackPosition={track.position}
                  isRejected
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
