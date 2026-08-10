export function TableSkeleton({ cols = 5, rows = 5 }) {
  return (
    <div className="animate-pulse p-4 space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-8 flex-1 rounded bg-slate-100" />
          ))}
        </div>
      ))}
    </div>
  );
}
