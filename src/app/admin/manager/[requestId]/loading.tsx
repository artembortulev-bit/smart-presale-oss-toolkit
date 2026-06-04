export default function RequestWorkspaceLoading() {
  return (
    <main className="mx-auto max-w-[1540px] px-4 py-8 sm:px-6 lg:px-8">
      <section className="surface-shell rounded-[42px] p-4 sm:p-6">
        <div className="relative z-10 space-y-6">
          <div className="h-10 w-44 rounded-full bg-white/70" />
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="glass-panel rounded-[34px] p-7">
              <div className="h-3 w-40 rounded-full bg-black/10" />
              <div className="mt-5 h-28 rounded-[28px] bg-black/10" />
              <div className="mt-6 grid gap-3 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 rounded-[24px] bg-white/70" />
                ))}
              </div>
            </div>
            <aside className="dark-panel rounded-[34px] p-6">
              <div className="h-4 w-32 rounded-full bg-white/10" />
              <div className="mt-5 space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-20 rounded-[22px] bg-white/10" />
                ))}
              </div>
            </aside>
          </section>
        </div>
      </section>
    </main>
  );
}
