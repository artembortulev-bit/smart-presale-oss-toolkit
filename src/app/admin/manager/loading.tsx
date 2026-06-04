export default function ManagerQueueLoading() {
  return (
    <main className="mx-auto max-w-[1540px] px-4 py-8 sm:px-6 lg:px-8">
      <section className="surface-shell rounded-[42px] p-4 sm:p-6">
        <div className="relative z-10 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="glass-panel rounded-[34px] p-6">
            <div className="h-3 w-40 rounded-full bg-black/10" />
            <div className="mt-5 h-20 rounded-[26px] bg-black/10" />
            <div className="mt-7 grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 rounded-[24px] bg-white/60" />
              ))}
            </div>
          </aside>
          <section className="glass-panel rounded-[34px] p-5">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-28 rounded-[28px] bg-white/70" />
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
