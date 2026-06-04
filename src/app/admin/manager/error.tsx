"use client";

import Link from "next/link";

export default function ManagerQueueError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
      <section className="surface-shell rounded-[42px] p-6">
        <div className="glass-panel rounded-[34px] p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-red-600">
            Operational state
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">
            Очередь менеджера сейчас недоступна
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--foreground-muted)]">
            Не удалось прочитать operational database или рабочую проекцию.
            Проверьте PostgreSQL, `DATABASE_URL` и примененные Prisma migrations.
          </p>
          <div className="mt-5 rounded-[22px] bg-red-50 px-4 py-3 text-sm text-red-800">
            {error.message}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
            >
              Повторить
            </button>
            <Link
              href="/admin"
              className="rounded-full border border-[var(--border)] bg-white/80 px-5 py-3 text-sm font-semibold"
            >
              В админ-контур
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
