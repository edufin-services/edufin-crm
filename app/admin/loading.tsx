export default function AdminLoading() {
  return (
    <div className="space-y-6 pb-8 animate-pulse">
      {/* ── Admin Header Skeleton ────────────────────────────────────────── */}
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-rose-100" />
              <div className="h-6 w-44 rounded-lg bg-zinc-200" />
              <div className="h-5 w-16 rounded-full bg-rose-100" />
            </div>
            <div className="h-4 w-64 rounded bg-zinc-100" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-28 rounded-2xl bg-zinc-100" />
            <div className="h-10 w-32 rounded-2xl bg-rose-100/70" />
          </div>
        </div>
      </div>

      {/* ── Metric Cards Grid Skeleton ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl sm:rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-zinc-100" />
                <div className="h-3 w-20 rounded bg-zinc-100" />
              </div>
              <div className="h-4 w-10 rounded-full bg-zinc-100" />
            </div>
            <div className="h-7 w-20 rounded bg-zinc-200" />
            <div className="pt-2 border-t border-zinc-100">
              <div className="h-2 w-32 rounded bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Table/List Area Skeleton ────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="space-y-1">
            <div className="h-4 w-36 rounded bg-zinc-200" />
            <div className="h-3 w-48 rounded bg-zinc-100" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-24 rounded-xl bg-zinc-100" />
            <div className="h-8 w-28 rounded-xl bg-zinc-100" />
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <div className="space-y-2 pt-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-100 bg-zinc-50/50"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-zinc-200" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-36 rounded bg-zinc-200" />
                  <div className="h-2.5 w-24 rounded bg-zinc-100" />
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-6">
                <div className="h-3 w-20 rounded bg-zinc-100" />
                <div className="h-5 w-16 rounded-full bg-zinc-100" />
              </div>
              <div className="h-6 w-14 rounded-lg bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

