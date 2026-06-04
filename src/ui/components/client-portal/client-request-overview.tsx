import Link from "next/link";

import { ProposalDraft } from "@/application/proposals/build-proposal";
import {
  ClientObjectType,
  ClientRequestRecord,
  clientObjectTypeLabels,
  clientRequestStatusLabels,
  clientSegmentLabels,
} from "@/application/client-intake/types";
import { ProposalDocumentPreview } from "@/ui/components/proposals/proposal-document-preview";
import { ProductCard } from "@/ui/components/catalog/product-card";
import { CatalogMediaImage } from "@/ui/components/catalog/catalog-media-image";
import { GeneratedProduct } from "@/import/catalog/types";
import { cn } from "@/shared/utils/cn";
import { formatPriceRub } from "@/shared/utils/money";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function getObjectTypeBadgeTone(objectType: ClientObjectType) {
  switch (objectType) {
    case "PLAYGROUND_COMPLEX":
      return "bg-[rgba(239,100,29,0.12)] text-[var(--accent)]";
    case "WORKOUT":
      return "bg-[rgba(24,60,115,0.08)] text-[#23477d]";
    case "PARK_EQUIPMENT":
      return "bg-[rgba(31,122,83,0.12)] text-[var(--success)]";
    default:
      return "bg-[rgba(17,17,17,0.06)] text-[var(--foreground-muted)]";
  }
}

function getEstimateMethodLabel(method: ClientRequestRecord["estimate"]["method"]) {
  switch (method) {
    case "CATALOG_BENCHMARK":
      return "Каталожный benchmark";
    case "HYBRID":
      return "Гибрид";
    default:
      return "Эвристика";
  }
}

export function ClientRequestOverview({
  request,
  pipeline,
  proposalDraft,
  similarProducts,
}: {
  request: ClientRequestRecord;
  pipeline: Array<{
    id: string;
    label: string;
    state: "done" | "current" | "todo";
    note: string;
  }>;
  proposalDraft: ProposalDraft;
  similarProducts: GeneratedProduct[];
}) {
  const resolvedObjectType = request.estimate.resolvedObjectType ?? request.objectType;
  const resolvedObjectLabel = clientObjectTypeLabels[resolvedObjectType];
  const wasRefined = resolvedObjectType !== request.objectType;
  const visibleEstimateNotes = request.estimate.notes.filter((note) => {
    if (!wasRefined) {
      return true;
    }

    return !note.includes(clientObjectTypeLabels[request.objectType]);
  });
  const totalPreview =
    request.estimate.equipmentRub +
    request.estimate.deliveryRub +
    request.estimate.installationRub;

  return (
    <main className="mx-auto max-w-[1620px] px-6 py-8 lg:px-8">
      <section className="surface-shell rounded-[42px] p-5 lg:p-6">
        <div className="space-y-6">
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.04fr)_420px]">
            <div className="glass-panel rounded-[34px] p-7 lg:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--foreground-muted)]">
                    Фото-заявка {request.reference}
                  </p>
                  <h1 className="mt-4 text-[clamp(2rem,3.7vw,3.65rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[var(--foreground)]">
                    {request.projectName ?? resolvedObjectLabel}
                  </h1>
                </div>

                <div className="flex flex-wrap gap-3">
                  <span
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold",
                      getObjectTypeBadgeTone(resolvedObjectType),
                    )}
                  >
                    {resolvedObjectLabel}
                  </span>
                  <span className="rounded-full bg-[rgba(17,17,17,0.06)] px-4 py-2 text-sm font-semibold text-[var(--foreground-muted)]">
                    {clientSegmentLabels[request.segment]}
                  </span>
                  {wasRefined ? (
                    <span className="rounded-full bg-[rgba(24,60,115,0.08)] px-4 py-2 text-sm font-semibold text-[#23477d]">
                      Уточнено по фото
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[24px] bg-[rgba(255,255,255,0.46)] px-4 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                    Вилка оценки
                  </div>
                  <div className="mt-2 text-[1.45rem] font-semibold leading-tight text-[var(--foreground)]">
                    {formatPriceRub(request.estimate.estimatedMinRub)} -{" "}
                    {formatPriceRub(request.estimate.estimatedMaxRub)}
                  </div>
                </div>
                <div className="rounded-[24px] bg-[rgba(255,255,255,0.46)] px-4 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                    Точность
                  </div>
                  <div className="mt-2 text-[1.6rem] font-semibold text-[var(--foreground)]">
                    {Math.round(request.estimate.confidence * 100)}%
                  </div>
                </div>
                <div className="rounded-[24px] bg-[rgba(255,255,255,0.46)] px-4 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                    Фото
                  </div>
                  <div className="mt-2 text-[1.6rem] font-semibold text-[var(--foreground)]">
                    {request.photos.length}
                  </div>
                </div>
                <div className="rounded-[24px] bg-[rgba(255,255,255,0.46)] px-4 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                    Основа
                  </div>
                  <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    {getEstimateMethodLabel(request.estimate.method)}
                  </div>
                  <div className="mt-1 text-sm text-[var(--foreground-muted)]">
                    {request.estimate.benchmarkSourceCount > 0
                      ? `${request.estimate.benchmarkSourceCount} аналогов`
                      : "Без аналогов"}
                  </div>
                </div>
              </div>
            </div>

            <div className="dark-panel rounded-[34px] p-6 text-white">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(255,255,255,0.52)]">
                Pipeline
              </div>
              <div className="mt-5 space-y-3">
                {pipeline.map((step) => (
                  <div
                    key={step.id}
                    className={cn(
                      "rounded-[24px] border px-4 py-4",
                      step.state === "done" &&
                        "border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)]",
                      step.state === "current" &&
                        "border-[rgba(239,100,29,0.42)] bg-[rgba(239,100,29,0.12)]",
                      step.state === "todo" &&
                        "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)]",
                    )}
                  >
                    <div className="text-sm font-semibold">{step.label}</div>
                    <div className="mt-2 text-sm leading-7 text-[rgba(255,255,255,0.74)]">
                      {step.note}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[24px] bg-[rgba(255,255,255,0.07)] px-4 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[rgba(255,255,255,0.52)]">
                  Сводка
                </div>
                <div className="mt-3 space-y-2 text-sm leading-7 text-[rgba(255,255,255,0.78)]">
                  <div>Статус: {clientRequestStatusLabels[request.status]}</div>
                  <div>Создано: {formatDateTime(request.createdAt)}</div>
                  <div>
                    Сценарий:{" "}
                    {wasRefined
                      ? `${clientObjectTypeLabels[request.objectType]} → ${resolvedObjectLabel}`
                      : resolvedObjectLabel}
                  </div>
                  {request.targetBudgetRub ? (
                    <div>Бюджет: {formatPriceRub(request.targetBudgetRub)}</div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="space-y-5">
              <section className="glass-panel rounded-[34px] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[var(--foreground-muted)]">
                      Фото
                    </p>
                    <h2 className="mt-3 text-[1.7rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                      Референсы клиента
                    </h2>
                  </div>
                  <Link
                    href={`/api/client-requests/${request.id}/proposal-pdf`}
                    target="_blank"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent)_0%,#ff7a29_100%)] px-5 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(239,100,29,0.26)]"
                  >
                    PDF
                  </Link>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {request.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="overflow-hidden rounded-[26px] border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.44)]"
                    >
                      <div className="aspect-[4/3]">
                        <CatalogMediaImage
                          src={photo.url}
                          alt={photo.fileName}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="border-t border-[rgba(17,17,17,0.08)] px-4 py-3 text-sm text-[var(--foreground-muted)]">
                        {photo.fileName}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="glass-panel rounded-[34px] p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[var(--foreground-muted)]">
                  3D brief
                </p>
                <h2 className="mt-3 text-[1.7rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                  {request.modelBrief.title}
                </h2>

                <div className="mt-5 rounded-[24px] bg-[rgba(255,255,255,0.48)] px-4 py-4">
                  <div className="text-sm leading-7 text-[var(--foreground-muted)]">
                    {request.modelBrief.summary}
                  </div>
                  <div className="mt-3 text-sm font-medium text-[var(--foreground)]">
                    {request.modelBrief.interactionHint}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {request.modelBrief.hotspots.map((part) => (
                    <div
                      key={part.id}
                      className="rounded-[22px] border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.48)] px-4 py-4"
                    >
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                        Узел
                      </div>
                      <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {part.label}
                      </div>
                      <div className="mt-2 text-sm text-[var(--foreground)]">{part.material}</div>
                      <div className="mt-3 text-sm leading-7 text-[var(--foreground-muted)]">
                        {part.comment}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-[22px] border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.46)] px-4 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                    Нужны данные
                  </div>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--foreground-muted)]">
                    {request.modelBrief.nextInputs.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>

            <div className="space-y-5">
              <section className="glass-panel rounded-[34px] p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[var(--foreground-muted)]">
                  Оценка
                </p>
                <h2 className="mt-3 text-[1.7rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                  Предварительная стоимость
                </h2>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-[22px] bg-[rgba(255,255,255,0.46)] px-4 py-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                      Оборудование
                    </div>
                    <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                      {formatPriceRub(request.estimate.equipmentRub)}
                    </div>
                  </div>
                  <div className="rounded-[22px] bg-[rgba(255,255,255,0.46)] px-4 py-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                      Доставка
                    </div>
                    <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                      {formatPriceRub(request.estimate.deliveryRub)}
                    </div>
                  </div>
                  <div className="rounded-[22px] bg-[rgba(255,255,255,0.46)] px-4 py-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                      Монтаж
                    </div>
                    <div className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                      {formatPriceRub(request.estimate.installationRub)}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[28px] bg-[linear-gradient(155deg,#111111_0%,#2d2a26_58%,#5c3d20_100%)] px-5 py-5 text-white">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[rgba(255,255,255,0.54)]">
                    Ориентир
                  </div>
                  <div className="mt-3 text-[2rem] font-semibold">{formatPriceRub(totalPreview)}</div>
                </div>

                {request.estimate.benchmarkProducts.length > 0 ? (
                  <div className="mt-5 rounded-[22px] border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.46)] px-4 py-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                      Benchmark
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {request.estimate.benchmarkProducts.map((product) => (
                        <div
                          key={product.article}
                          className="rounded-[20px] bg-[rgba(255,255,255,0.58)] px-4 py-4"
                        >
                          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
                            {product.article}
                          </div>
                          <div className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                            {product.name}
                          </div>
                          <div className="mt-2 text-sm text-[var(--foreground-muted)]">
                            {product.categoryName ?? "Каталог Smart Presale"}
                          </div>
                          <div className="mt-3 text-sm font-medium text-[var(--foreground)]">
                            {formatPriceRub(product.basePriceRub)}
                          </div>
                          {product.reasons.length > 0 ? (
                            <div className="mt-3 text-xs leading-6 text-[var(--foreground-muted)]">
                              {product.reasons.join(" • ")}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 space-y-3">
                  {request.estimate.breakdown.map((line) => (
                    <div
                      key={line.code}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-[20px] border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.46)] px-4 py-4"
                    >
                      <div>
                        <div className="font-semibold text-[var(--foreground)]">{line.label}</div>
                        <div className="mt-2 max-w-xl text-sm leading-7 text-[var(--foreground-muted)]">
                          {line.comment}
                        </div>
                      </div>
                      <div className="text-right text-lg font-semibold text-[var(--foreground)]">
                        {formatPriceRub(line.amountRub)}
                      </div>
                    </div>
                  ))}
                </div>

                {visibleEstimateNotes.length > 0 ? (
                  <div className="mt-5 rounded-[22px] border border-[rgba(239,100,29,0.16)] bg-[rgba(239,100,29,0.08)] px-4 py-4">
                    <div className="text-sm font-semibold text-[var(--foreground)]">
                      Зафиксировано
                    </div>
                    <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--foreground-muted)]">
                      {visibleEstimateNotes.map((note) => (
                        <li key={note}>• {note}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>

              {similarProducts.length > 0 ? (
                <section className="glass-panel rounded-[34px] p-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[var(--foreground-muted)]">
                    Похожие позиции
                  </p>
                  <h2 className="mt-3 text-[1.7rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                    Ближайшие товары
                  </h2>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {similarProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </section>

          <section className="glass-panel overflow-hidden rounded-[34px] p-4 lg:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[24px] bg-[rgba(255,255,255,0.48)] px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--foreground-muted)]">
                  Черновик КП
                </p>
                <h2 className="mt-2 text-[1.5rem] font-semibold text-[var(--foreground)]">
                  Документ по фото-заявке
                </h2>
              </div>
              <Link
                href={`/api/client-requests/${request.id}/proposal-pdf`}
                target="_blank"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.56)] px-5 text-sm font-semibold text-[var(--foreground)]"
              >
                PDF
              </Link>
            </div>
            <div className="overflow-hidden rounded-[30px] bg-[#ddd8cf] shadow-[0_24px_60px_rgba(17,17,17,0.06)]">
              <ProposalDocumentPreview draft={proposalDraft} />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
