import Link from "next/link";

export default function RequestWorkspaceNotFound() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
      <section className="surface-shell rounded-[42px] p-6">
        <div className="glass-panel rounded-[34px] p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--foreground-soft)]">
            Request workspace
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">
            Заявка не найдена
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--foreground-muted)]">
            Такой заявки нет в operational database. Очередь продолжает
            работать, а архивные заявки открываются только по реальному id.
          </p>
          <Link
            href="/admin/manager"
            className="mt-6 inline-flex rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
          >
            Вернуться в очередь
          </Link>
        </div>
      </section>
    </main>
  );
}
