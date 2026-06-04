import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { requirePortalRole } from "@/application/auth/portal-access";
import { getClientPortalSummary } from "@/application/client-intake/service";
import { ClientRequestCard } from "@/ui/components/client-portal/client-request-card";
import { ClientRequestForm } from "@/ui/components/client-portal/client-request-form";

export const dynamic = "force-dynamic";

export default async function ClientPortalPage() {
  noStore();
  const role = await requirePortalRole(["client", "employee"], "/client");
  const summary = await getClientPortalSummary();

  return (
    <main className="mx-auto max-w-[1620px] px-4 py-8 sm:px-6 lg:px-8">
      <section className="surface-shell rounded-[40px] p-4 sm:p-5 lg:p-6">
        <div className="relative z-10 space-y-6">
          <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.04fr)_380px]">
            <div className="glass-panel rounded-[34px] p-7 lg:p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--foreground-soft)]">
                Клиентский кабинет
              </p>
              <h1 className="mt-4 text-[clamp(2.1rem,3.8vw,4rem)] font-semibold leading-[0.94] tracking-[-0.06em] text-[var(--foreground)]">
                Фото-заявки
              </h1>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/catalog"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent)_0%,#ff7a29_100%)] px-6 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(239,100,29,0.26)]"
                >
                  Каталог
                </Link>
                <Link
                  href={role === "employee" ? "/configurator" : "/solutions"}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-[rgba(23,20,18,0.08)] bg-[rgba(255,255,255,0.74)] px-6 text-sm font-semibold text-[var(--foreground)]"
                >
                  {role === "employee" ? "Подбор" : "Решения"}
                </Link>
              </div>
            </div>

            <div className="dark-panel rounded-[34px] p-6 text-white">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(255,255,255,0.52)]">
                Срез
              </div>
              <div className="mt-5 grid gap-3">
                <div className="rounded-[24px] bg-[rgba(255,255,255,0.07)] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[rgba(255,255,255,0.52)]">
                    Заявки
                  </div>
                  <div className="mt-2 text-[2rem] font-semibold">{summary.total}</div>
                </div>
                <div className="rounded-[24px] bg-[rgba(255,255,255,0.07)] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[rgba(255,255,255,0.52)]">
                    Ждут матрицу
                  </div>
                  <div className="mt-2 text-[2rem] font-semibold">
                    {summary.waitingForMaterialCosts}
                  </div>
                </div>
                <div className="rounded-[24px] bg-[rgba(255,255,255,0.07)] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-[rgba(255,255,255,0.52)]">
                    Точность
                  </div>
                  <div className="mt-2 text-[2rem] font-semibold">{summary.averageConfidence}%</div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 2xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <ClientRequestForm />

            <section className="glass-panel rounded-[34px] p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--foreground-soft)]">
                    Очередь
                  </p>
                  <h2 className="mt-3 text-[1.9rem] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                    Последние заявки
                  </h2>
                </div>
                <div className="muted-chip rounded-full px-4 py-2 text-sm">
                  {summary.latestRequests.length} активных
                </div>
              </div>

              {summary.latestRequests.length === 0 ? (
                <div className="mt-6 rounded-[28px] border border-dashed border-[rgba(17,17,17,0.12)] bg-[rgba(255,255,255,0.52)] px-6 py-12 text-center">
                  <div className="text-xl font-semibold text-[var(--foreground)]">Пока пусто</div>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {summary.latestRequests.map((request) => (
                    <ClientRequestCard key={request.id} request={request} />
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}
