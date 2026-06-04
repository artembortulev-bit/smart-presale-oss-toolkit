/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePortalRole } from "@/application/auth/portal-access";
import { buildSceneDiagramDataUri } from "@/application/scene-projects/scene-diagram";
import { getSceneProject } from "@/application/scene-projects/service";
import { SceneProjectRecord } from "@/application/scene-projects/types";
import { formatPriceRub } from "@/shared/utils/money";
import { ButtonLink } from "@/ui/components/common/button-link";

type SceneProjectReviewPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

function statusLabel(status: SceneProjectRecord["status"]) {
  switch (status) {
    case "READY_FOR_PROPOSAL":
      return "Готово к КП";
    case "IN_REVIEW":
      return "Нужна проверка";
    default:
      return "Черновик";
  }
}

export default async function SceneProjectReviewPage({
  params,
}: SceneProjectReviewPageProps) {
  const { projectId } = await params;
  await requirePortalRole(["employee"], `/admin/projects/${projectId}`);
  const project = await getSceneProject(projectId);

  if (!project) {
    notFound();
  }

  const diagramUrl = buildSceneDiagramDataUri(project.bounds, project.items);
  const proposalHref = `/proposals/new?sceneProjectId=${project.id}&products=${project.items
    .map((item) => item.productSlug)
    .filter(Boolean)
    .join(",")}&customer=${encodeURIComponent(
    project.customerName ?? "Клиент",
  )}&address=${encodeURIComponent(project.customerAddress ?? "")}`;

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <section className="surface-shell rounded-[36px] p-5 sm:p-6 lg:p-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-[var(--foreground-muted)]">
              Manager review
            </p>
            <h1 className="mt-4 text-[2.5rem] font-semibold leading-[0.96] tracking-[-0.07em] text-[#181512]">
              {project.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--foreground-muted)]">
              Сцена сохранена из configurator и готова для ручной проверки,
              доводки состава и выпуска коммерческого предложения.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <div className="rounded-[26px] border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.72)] px-5 py-4">
                <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--foreground-muted)]">
                  Контур
                </div>
                <div className="mt-2 text-xl font-semibold tracking-[-0.05em] text-[#181512]">
                  {project.bounds.widthM} × {project.bounds.lengthM} м
                </div>
              </div>
              <div className="rounded-[26px] border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.72)] px-5 py-4">
                <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--foreground-muted)]">
                  Позиции
                </div>
                <div className="mt-2 text-xl font-semibold tracking-[-0.05em] text-[#181512]">
                  {project.items.length}
                </div>
              </div>
              <div className="rounded-[26px] border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.72)] px-5 py-4">
                <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--foreground-muted)]">
                  Бюджет сцены
                </div>
                <div className="mt-2 text-xl font-semibold tracking-[-0.05em] text-[#181512]">
                  {formatPriceRub(project.summary.estimatedTotalRub)}
                </div>
              </div>
              <div className="rounded-[26px] border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.72)] px-5 py-4">
                <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--foreground-muted)]">
                  Статус
                </div>
                <div className="mt-2 text-xl font-semibold tracking-[-0.05em] text-[#181512]">
                  {statusLabel(project.status)}
                </div>
              </div>
            </div>
          </div>

          <aside className="dark-panel rounded-[30px] p-6 text-white">
            <div className="text-xs uppercase tracking-[0.32em] text-[rgba(255,255,255,0.5)]">
              Действия
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-[rgba(255,255,255,0.72)]">
              <p>Коллизии: {project.summary.collisionCount}</p>
              <p>Предупреждения: {project.summary.warningCount}</p>
              <p>Создано: {new Date(project.createdAt).toLocaleString("ru-RU")}</p>
              <p>Обновлено: {new Date(project.updatedAt).toLocaleString("ru-RU")}</p>
            </div>

            <div className="mt-6 grid gap-3">
              <ButtonLink href={proposalHref}>Сформировать КП по сцене</ButtonLink>
              <ButtonLink href="/configurator" variant="secondary">
                Вернуться в configurator
              </ButtonLink>
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="surface-shell rounded-[34px] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-[var(--foreground-muted)]">
                Scene diagram
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#181512]">
                План размещения
              </h2>
            </div>
            <div className="rounded-full border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.72)] px-4 py-2 text-sm text-[var(--foreground-muted)]">
              {project.bounds.areaM2} м²
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[28px] border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.84)] p-4">
            <img
              src={diagramUrl}
              alt="План размещения"
              className="block h-auto w-full rounded-[22px]"
            />
          </div>

          {project.notes.length > 0 ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {project.notes.map((note) => (
                <div
                  key={note}
                  className="rounded-[22px] border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.72)] px-4 py-3 text-sm leading-6 text-[var(--foreground-muted)]"
                >
                  {note}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="surface-shell rounded-[34px] p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.34em] text-[var(--foreground-muted)]">
            Состав сцены
          </p>
          <div className="mt-4 space-y-3">
            {project.items.map((item) => (
              <div
                key={item.id}
                className="rounded-[22px] border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.72)] px-4 py-4"
              >
                <div className="text-sm font-semibold text-[#181512]">{item.article}</div>
                <div className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
                  {item.name}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--foreground-muted)]">
                  <span className="rounded-full border border-[rgba(20,18,16,0.08)] px-3 py-1.5">
                    {item.widthM} × {item.lengthM} м
                  </span>
                  <span className="rounded-full border border-[rgba(20,18,16,0.08)] px-3 py-1.5">
                    safety {item.safetyWidthM} × {item.safetyLengthM} м
                  </span>
                  <span className="rounded-full border border-[rgba(20,18,16,0.08)] px-3 py-1.5">
                    {item.positionXM.toFixed(2)} / {item.positionYM.toFixed(2)} м
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 text-sm text-[var(--foreground-muted)]">
            <Link href="/admin" className="underline underline-offset-4">
              Вернуться в менеджерский контур
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
