/** Structural skeleton cards shown during async transitions (§5.1). */
export function SkeletonCard() {
  return (
    <div className="rounded-md border border-hairline bg-panel p-5" aria-hidden="true">
      <div className="h-4 w-2/3 animate-pulse rounded bg-hairline" />
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-hairline/70" />
      <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-hairline/70" />
      <div className="mt-4 flex gap-2">
        <div className="h-5 w-16 animate-pulse rounded bg-hairline/70" />
        <div className="h-5 w-20 animate-pulse rounded bg-hairline/70" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}
