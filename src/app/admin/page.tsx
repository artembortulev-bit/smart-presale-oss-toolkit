import Link from "next/link";

import { requirePortalRole } from "@/application/auth/portal-access";
import { getGeneratedCatalogData } from "@/infrastructure/data/generated-catalog";
import {
  getGeneratedThreeDConversionQueue,
  getGeneratedThreeDProductionWorkflow,
  getGeneratedThreeDRegistry,
} from "@/infrastructure/data/generated-3d-workflow";
import { getGeneratedProductTruthFoundation } from "@/infrastructure/data/generated-product-truth";
import { listSceneProjectsFromStore } from "@/infrastructure/data/scene-project-store";
import { formatPriceRub } from "@/shared/utils/money";

export default async function AdminPage() {
  await requirePortalRole(["employee"], "/admin");

  const [data, productTruth, sceneProjects, threeDRegistry, conversionQueue, workflow] =
    await Promise.all([
      getGeneratedCatalogData(),
      getGeneratedProductTruthFoundation(),
      listSceneProjectsFromStore(),
      getGeneratedThreeDRegistry(),
      getGeneratedThreeDConversionQueue(),
      getGeneratedThreeDProductionWorkflow(),
    ]);

  const costing = data.summary.costing;
  const summaryCards = [
    ["Товары", String(data.summary.products)],
    ["Категории", String(data.summary.categories)],
    ["Placement-ready", String(productTruth?.summary.placementReadyProducts ?? 0)],
    ["3D source", String(threeDRegistry.summary.sourceReady)],
    ["Converted", String(threeDRegistry.summary.converted)],
    ["Annotated", String(threeDRegistry.summary.annotated)],
    ["Published", String(threeDRegistry.summary.published)],
    ["Presale-сцены", String(sceneProjects.length)],
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <section className="rounded-[36px] border border-[var(--border)] bg-white p-8 shadow-[var(--shadow-card)]">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--foreground-muted)]">
          Админка / Smart Presale
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-[var(--foreground)]">
          Импорт, 3D pipeline и менеджерский контур
        </h1>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(([label, value]) => (
            <div key={label} className="rounded-3xl bg-[var(--surface-muted)] p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                {label}
              </div>
              <div className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                {value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[28px] border border-[var(--border)] bg-[var(--foreground)] p-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">
                Wave 2C
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                Manager workspace
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
                Очередь заявок, owner, next action, proposal block и sales handoff
                поверх сохраненного process layer.
              </p>
            </div>
            <Link
              href="/admin/manager"
              className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white"
            >
              Открыть очередь
            </Link>
          </div>
        </div>

        {costing ? (
          <div className="mt-6 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-7 text-[var(--foreground-muted)]">
            Покрытие по матрице себестоимости:{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {(costing.coverageRatio * 100).toFixed(1)}%
            </span>
            . Прямая себестоимость найдена для {costing.directProducts} товаров, по
            benchmark-правилам дополнительно оценено {costing.inferredProducts}, без
            cost layer пока остается {costing.withoutCost}. Всего правил: {costing.rules}.
          </div>
        ) : null}
      </section>

      <section className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[32px] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--foreground-muted)]">
                3D production workflow
              </div>
              <h2 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                Реальные модели, аннотации и публикация
              </h2>
            </div>
            <div className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground-muted)]">
              Conversion backlog: {workflow.summary.conversionBacklog}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl bg-[var(--surface-muted)] p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                Source ready
              </div>
              <div className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                {workflow.summary.sourceReady}
              </div>
            </div>
            <div className="rounded-3xl bg-[var(--surface-muted)] p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                Converted
              </div>
              <div className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                {workflow.summary.converted}
              </div>
            </div>
            <div className="rounded-3xl bg-[var(--surface-muted)] p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                Annotated
              </div>
              <div className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                {workflow.summary.annotated}
              </div>
            </div>
            <div className="rounded-3xl bg-[var(--surface-muted)] p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                Published
              </div>
              <div className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                {workflow.summary.published}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[28px] bg-[var(--surface-muted)] p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                Live модели
              </div>
              <div className="mt-4 space-y-3">
                {workflow.liveItems.length === 0 ? (
                  <div className="rounded-2xl bg-white px-4 py-4 text-sm text-[var(--foreground-muted)]">
                    Live-публикаций пока нет.
                  </div>
                ) : (
                  workflow.liveItems.map((item) => (
                    <div key={item.articleNormalized} className="rounded-2xl bg-white px-4 py-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
                        {item.article}
                      </div>
                      <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {item.name}
                      </div>
                      <div className="mt-2 text-sm text-[var(--foreground-muted)]">
                        {item.modelFormat ?? "3D"} / annotations: {item.annotationCount}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[28px] bg-[var(--surface-muted)] p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                Первая production wave
              </div>
              <div className="mt-4 space-y-3">
                {workflow.firstWave.slice(0, 8).map((item) => (
                  <div key={item.articleNormalized} className="rounded-2xl bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
                        {item.article}
                      </div>
                      <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-muted)]">
                        {item.lifecycleStatus}
                      </span>
                    </div>
                    <div className="mt-2 text-base font-semibold text-[var(--foreground)]">
                      {item.name}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
                      {item.nextAction}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <section className="rounded-[32px] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                Presale-сцены
              </h2>
              <Link href="/configurator" className="text-sm font-medium text-[var(--accent)]">
                Открыть configurator
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {sceneProjects.length === 0 ? (
                <div className="rounded-2xl bg-[var(--surface-muted)] px-5 py-4 text-sm text-[var(--foreground-muted)]">
                  Сохраненных сцен пока нет.
                </div>
              ) : (
                sceneProjects.slice(0, 6).map((project) => (
                  <Link
                    key={project.id}
                    href={`/admin/projects/${project.id}`}
                    className="block rounded-2xl bg-[var(--surface-muted)] px-5 py-4 transition-transform hover:-translate-y-0.5"
                  >
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
                      {project.status}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {project.title}
                    </div>
                    <div className="mt-2 text-sm text-[var(--foreground-muted)]">
                      {project.items.length} позиций / {project.bounds.widthM} ×{" "}
                      {project.bounds.lengthM} м /{" "}
                      {formatPriceRub(project.summary.estimatedTotalRub)}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {productTruth ? (
            <section className="rounded-[32px] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)]">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--foreground-muted)]">
                Placement truth foundation
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                Первая волна под сцену и safety
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-[var(--surface-muted)] p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                    Placement-ready
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                    {productTruth.summary.placementReadyProducts}
                  </div>
                </div>
                <div className="rounded-3xl bg-[var(--surface-muted)] p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                    First wave
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                    {productTruth.firstWaveSummary.selectedCount}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-[32px] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)]">
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--foreground-muted)]">
              Conversion queue
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              Приоритет на ближайшую волну
            </h2>

            <div className="mt-6 space-y-3">
              {conversionQueue.items.slice(0, 8).map((item) => (
                <div key={item.articleNormalized} className="rounded-2xl bg-[var(--surface-muted)] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
                      {item.priorityTier} / {item.stage}
                    </div>
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {item.score}
                    </span>
                  </div>
                  <div className="mt-2 text-base font-semibold text-[var(--foreground)]">
                    {item.article}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
                    {item.recommendedAction}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
