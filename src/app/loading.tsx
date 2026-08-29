function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-black/[.06] dark:bg-white/[.08] ${className}`} />;
}

export default function Loading() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-6 w-24" />
          <SkeletonBlock className="h-8 w-20" />
        </div>

        <div>
          <SkeletonBlock className="h-5 w-28" />
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SkeletonBlock className="h-72 w-full" />
            <SkeletonBlock className="h-72 w-full" />
          </div>
        </div>

        <SkeletonBlock className="h-24 w-full" />

        <div className="flex flex-col gap-3">
          <SkeletonBlock className="h-16 w-full" />
          <SkeletonBlock className="h-16 w-full" />
          <SkeletonBlock className="h-16 w-full" />
          <SkeletonBlock className="h-16 w-full" />
        </div>
      </main>
    </div>
  );
}
