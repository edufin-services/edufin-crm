export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-8 animate-pulse">
      {/* ── Top Header Skeleton ────────────────────────────────────────── */}
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-zinc-200" />
              <div className="h-6 w-48 rounded-lg bg-zinc-200" />
            </div>
            <div className="h-4 w-72 rounded bg-zinc-100" />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block h-10 w-36 rounded-2xl bg-zinc-100" />
            <div className="h-10 w-32 rounded-2xl bg-emerald-100/60" />
          </div>
        </div>
      </div>

      {/* ── Stat Cards Grid Skeleton ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl sm:rounded-2xl border border-zinc-200/80 bg-white p-3.5 sm:p-4 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7.5 w-7.5 rounded-lg bg-zinc-100" />
                <div className="h-3 w-24 rounded bg-zinc-100" />
              </div>
              <div className="h-4 w-12 rounded-full bg-zinc-100" />
            </div>
            <div className="flex items-baseline justify-between">
              <div className="h-7 w-16 rounded-md bg-zinc-200" />
              <div className="h-4 w-8 rounded bg-zinc-100" />
            </div>
            <div className="pt-2 border-t border-zinc-100 space-y-1.5">
              <div className="flex justify-between">
                <div className="h-2.5 w-16 rounded bg-zinc-100" />
                <div className="h-2.5 w-10 rounded bg-zinc-100" />
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Performance & Overview Skeleton ────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left Funnel Section (2/3) */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="space-y-1">
              <div className="h-4 w-40 rounded bg-zinc-200" />
              <div className="h-3 w-56 rounded bg-zinc-100" />
            </div>
            <div className="h-7 w-24 rounded-xl bg-zinc-100" />
          </div>

          <div className="h-3 w-full rounded-full bg-zinc-100" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-zinc-200" />
                    <div className="h-3 w-20 rounded bg-zinc-200" />
                  </div>
                  <div className="h-4 w-8 rounded bg-zinc-100" />
                </div>
                <div className="h-5 w-12 rounded bg-zinc-200" />
                <div className="h-1.5 w-full rounded-full bg-zinc-200/60" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Daily Focus Section (1/3) */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="h-4 w-28 rounded bg-zinc-200" />
            <div className="h-3 w-16 rounded bg-zinc-100" />
          </div>
          <div className="h-20 w-full rounded-xl bg-zinc-100/70" />
          <div className="space-y-2 pt-2">
            <div className="h-3 w-20 rounded bg-zinc-100" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-16 rounded-xl bg-zinc-50 border border-zinc-100" />
              <div className="h-16 rounded-xl bg-zinc-50 border border-zinc-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

