import Link from "next/link";

import {
  ClientRequestRecord,
  clientObjectTypeLabels,
  clientRequestStatusLabels,
  clientRequestStatusTone,
  clientSegmentLabels,
} from "@/application/client-intake/types";
import { cn } from "@/shared/utils/cn";
import { formatPriceRub } from "@/shared/utils/money";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

export function ClientRequestCard({
  request,
}: {
  request: ClientRequestRecord;
}) {
  const statusTone = clientRequestStatusTone[request.status];
  const resolvedObjectType = request.estimate.resolvedObjectType ?? request.objectType;
  const resolvedObjectLabel = clientObjectTypeLabels[resolvedObjectType];
  const wasRefined = resolvedObjectType !== request.objectType;

  return (
    <Link
      href={`/client/${request.id}` as never}
      className="group block rounded-[30px] border border-[rgba(255,255,255,0.56)] bg-[rgba(255,255,255,0.52)] p-5 shadow-[0_20px_40px_rgba(17,17,17,0.06)] backdrop-blur-xl transition-transform hover:-translate-y-1"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--foreground-muted)]">
            {request.reference}
          </div>
          <h3 className="mt-3 text-[1.55rem] font-semibold leading-tight text-[var(--foreground)]">
            {request.projectName ?? resolvedObjectLabel}
          </h3>
          <p className="mt-2 text-sm text-[var(--foreground-muted)]">
            {request.companyName ?? request.customerName}
          </p>
        </div>

        <span
          className={cn(
            "rounded-full px-3 py-2 text-xs font-semibold",
            statusTone === "success" && "bg-[rgba(31,122,83,0.12)] text-[var(--success)]",
            statusTone === "accent" && "bg-[rgba(239,100,29,0.12)] text-[var(--accent)]",
            statusTone === "default" && "bg-[rgba(17,17,17,0.06)] text-[var(--foreground-muted)]",
          )}
        >
          {clientRequestStatusLabels[request.status]}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-[rgba(239,100,29,0.1)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)]">
          {resolvedObjectLabel}
        </span>
        <span className="rounded-full bg-[rgba(17,17,17,0.06)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground-muted)]">
          {clientSegmentLabels[request.segment]}
        </span>
        {wasRefined ? (
          <span className="rounded-full bg-[rgba(24,60,115,0.08)] px-3 py-1.5 text-xs font-semibold text-[#23477d]">
            Уточнено по фото
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[24px] bg-[rgba(255,255,255,0.48)] px-4 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
            Оценка
          </div>
          <div className="mt-2 text-[1.5rem] font-semibold leading-tight text-[var(--foreground)]">
            {formatPriceRub(request.estimate.estimatedMinRub)} -{" "}
            {formatPriceRub(request.estimate.estimatedMaxRub)}
          </div>
          <div className="mt-2 text-sm text-[var(--foreground-muted)]">
            Основа: {getEstimateMethodLabel(request.estimate.method)}
          </div>
          <div className="mt-1 text-sm text-[var(--foreground-muted)]">
            {request.estimate.benchmarkSourceCount > 0
              ? `${request.estimate.benchmarkSourceCount} опорных позиций`
              : "Без опорных позиций"}
          </div>
        </div>

        <div className="rounded-[24px] bg-[rgba(255,255,255,0.48)] px-4 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
            Фото и точность
          </div>
          <div className="mt-2 text-[1.5rem] font-semibold leading-tight text-[var(--foreground)]">
            {request.photos.length} фото / {Math.round(request.estimate.confidence * 100)}%
          </div>
          <div className="mt-2 text-sm text-[var(--foreground-muted)]">
            Обновлено {formatDateTime(request.updatedAt)}
          </div>
          <div className="mt-1 text-sm text-[var(--foreground-muted)]">
            {wasRefined
              ? `${clientObjectTypeLabels[request.objectType]} → ${resolvedObjectLabel}`
              : resolvedObjectLabel}
          </div>
        </div>
      </div>
    </Link>
  );
}
