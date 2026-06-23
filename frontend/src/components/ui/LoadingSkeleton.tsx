export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function MatchCardSkeleton() {
  return (
    <div className="card space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-12 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-12 w-24" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 flex-1" />)}
      </div>
    </div>
  );
}

export function LeagueTableSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function HeroSkeleton({ className = '' }: { className?: string }) {
  return <Skeleton className={`h-48 w-full rounded-2xl ${className}`} />;
}
