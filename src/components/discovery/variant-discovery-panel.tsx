"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VariantCard } from "@/components/discovery/variant-card";
import { toast } from "sonner";

const VARIANT_TYPES = ["cover", "live", "acoustic", "remix"] as const;

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
}

interface VariantDiscoveryPanelProps {
  track: Track;
  playlistId: string;
  spotifyPlaylistId: string;
  snapshotId: string;
  onClose: () => void;
}

export function VariantDiscoveryPanel({
  track,
  playlistId,
  spotifyPlaylistId,
  snapshotId,
  onClose,
}: VariantDiscoveryPanelProps) {
  const [variantType, setVariantType] = useState<string>(VARIANT_TYPES[0]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [rejected, setRejected] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [customType, setCustomType] = useState("");

  const discover = async (type?: string) => {
    const searchType = type ?? variantType;
    setLoading(true);
    setSearched(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke(
        "discover-variants",
        {
          body: { track_id: track.id, variant_type: searchType },
        }
      );

      if (error) {
        toast.error("Discovery failed");
        console.error("Discovery error:", error);
        return;
      }

      setVariants(data.variants ?? []);
      setRejected(data.rejected ?? []);
    } catch (err) {
      toast.error("Discovery failed unexpectedly");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: string) => {
    setVariantType(type);
    setVariants([]);
    setRejected([]);
    setSearched(false);
    setShowRejected(false);
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-4 sticky top-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate">{track.title}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {track.artist_name}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="shrink-0 cursor-pointer"
        >
          &times;
        </Button>
      </div>

      <Tabs value={variantType} onValueChange={handleTypeChange}>
        <TabsList className="w-full">
          {VARIANT_TYPES.map((type) => (
            <TabsTrigger key={type} value={type} className="capitalize text-xs cursor-pointer">
              {type}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Custom type..."
          value={customType}
          onChange={(e) => setCustomType(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && customType.trim()) {
              setVariantType(customType.trim());
              discover(customType.trim());
            }
          }}
          className="flex-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground"
        />
        <Button
          size="sm"
          onClick={() => discover()}
          disabled={loading}
          className="cursor-pointer"
        >
          {loading ? "Searching..." : "Search"}
        </Button>
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))}

        {!loading && searched && variants.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No variants found for this type.
          </p>
        )}

        {!loading &&
          variants.map((v) => (
            <VariantCard
              key={v.id}
              variant={v}
              playlistId={playlistId}
              spotifyPlaylistId={spotifyPlaylistId}
              snapshotId={snapshotId}
              originalTrackPosition={track.position}
            />
          ))}

        {!loading && rejected.length > 0 && (
          <div className="pt-2 border-t border-border">
            <button
              onClick={() => setShowRejected(!showRejected)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {showRejected ? "Hide" : "Show"} {rejected.length} rejected
              result{rejected.length > 1 ? "s" : ""}
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
