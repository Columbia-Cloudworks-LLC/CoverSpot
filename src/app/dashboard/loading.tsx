import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="hidden lg:grid h-full" style={{ gridTemplateColumns: "16rem 1fr 20rem" }}>
      {/* Left: Sidebar skeleton */}
      <div className="flex flex-col border-r border-border bg-sidebar h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex-1 overflow-hidden py-1 space-y-1 px-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-10 w-10 rounded shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center: Track panel skeleton */}
      <div className="flex flex-col h-full overflow-hidden">
        {/* Playlist header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-accent/60 to-background shrink-0">
          <div className="flex items-end gap-4">
            <Skeleton className="h-20 w-20 rounded-lg shrink-0" />
            <div className="space-y-2 min-w-0">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>

        {/* Column headers */}
        <div className="px-6 py-2 border-b border-border shrink-0 grid grid-cols-[2rem_2fr_1.5fr_1fr_4rem] gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3" />
          ))}
        </div>

        {/* Track rows */}
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[2rem_2fr_1.5fr_1fr_4rem] items-center gap-3 px-6 py-2">
              <Skeleton className="h-3 w-4 ml-auto" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded shrink-0" />
                <div className="space-y-1.5 min-w-0">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-8 ml-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Right: Discovery panel placeholder skeleton */}
      <div className="flex flex-col items-center justify-center h-full border-l border-border gap-4 px-8">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2 text-center">
          <Skeleton className="h-5 w-40 mx-auto" />
          <Skeleton className="h-3.5 w-56 mx-auto" />
          <Skeleton className="h-3.5 w-48 mx-auto" />
        </div>
      </div>
    </div>
  );
}
