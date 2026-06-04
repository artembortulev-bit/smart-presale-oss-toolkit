import { ButtonLink } from "@/ui/components/common/button-link";
import { getProposalScenarioOptions } from "@/application/proposals/build-proposal";

export default async function ProjectsPage() {
  const scenarios = await getProposalScenarioOptions();

  return (
    <main className="mx-auto max-w-[1580px] px-6 py-8 lg:px-8">
      <section className="surface-shell rounded-[42px] p-5 lg:p-6">
        <div className="relative z-10">
          <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="glass-panel rounded-[34px] p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--foreground-muted)]">
                Проекты
              </p>
              <h1 className="mt-4 max-w-3xl font-sans text-[clamp(2.2rem,4vw,3.7rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-[var(--foreground)]">
                Сценарии КП и пресейла
              </h1>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/proposals/new">Собрать КП</ButtonLink>
                <ButtonLink href="/catalog" variant="secondary">
                  Каталог
                </ButtonLink>
              </div>
            </div>

            <div className="dark-panel rounded-[34px] p-8 text-white">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[rgba(255,255,255,0.58)]">
                Сценарии
              </div>
              <div className="mt-4 text-[3.2rem] font-semibold leading-none">{scenarios.length}</div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  "Шаблоны КП",
                  "Типовые составы",
                  "Быстрый старт менеджера",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] px-4 py-3 text-sm text-[rgba(255,255,255,0.84)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {scenarios.map((scenario) => (
              <article key={scenario.id} className="glass-panel rounded-[30px] p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                  {scenario.issueDate ?? "Без даты"}
                </div>
                <h2 className="mt-3 text-[1.7rem] font-semibold leading-tight text-[var(--foreground)]">
                  {scenario.customerName}
                </h2>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{scenario.title}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.62)] px-3 py-1.5 text-xs text-[var(--foreground-muted)]">
                    {scenario.lines.length} позиций
                  </span>
                  {scenario.address ? (
                    <span className="rounded-full border border-[rgba(17,17,17,0.08)] bg-[rgba(255,255,255,0.62)] px-3 py-1.5 text-xs text-[var(--foreground-muted)]">
                      {scenario.address}
                    </span>
                  ) : null}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <ButtonLink href={`/proposals/new?scenario=${scenario.id}`}>Открыть</ButtonLink>
                  <ButtonLink href="/catalog" variant="secondary">
                    Каталог
                  </ButtonLink>
                </div>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
