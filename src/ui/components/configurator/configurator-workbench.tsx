"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  PlacementSceneItem,
  PlacementScenePlan,
} from "@/application/placement-scene/types";
import {
  SelectionConstraintChip,
  SelectionRecommendation,
} from "@/application/selection/types";
import { cn } from "@/shared/utils/cn";
import { formatPriceRub } from "@/shared/utils/money";
import { ButtonLink } from "@/ui/components/common/button-link";
import { PlacementScenePlanner } from "@/ui/components/configurator/placement-scene-planner";

type ConfiguratorWorkbenchProps = {
  recommendation: SelectionRecommendation;
  compactPlan: PlacementScenePlan;
  balancedPlan: PlacementScenePlan;
  extendedPlan: PlacementScenePlan;
  scenePool: PlacementSceneItem[];
  resolvedObjectTypeLabel: string;
  segmentLabel: string;
  customerName?: string;
  customerAddress?: string;
};

type ScenePresetKey = "compact" | "balanced" | "extended";

function chipClassName(chip: SelectionConstraintChip) {
  if (chip.tone === "danger") {
    return "border-[rgba(217,83,79,0.28)] bg-[rgba(217,83,79,0.08)] text-[rgb(138,34,31)]";
  }

  if (chip.tone === "warning") {
    return "border-[rgba(181,137,0,0.28)] bg-[rgba(181,137,0,0.08)] text-[rgb(117,84,0)]";
  }

  if (chip.tone === "accent") {
    return "border-[rgba(236,107,32,0.28)] bg-[rgba(236,107,32,0.08)] text-[rgb(111,52,15)]";
  }

  return "border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.74)] text-[var(--foreground-muted)]";
}

function formatCompactRub(amount?: number) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return "—";
  }

  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: millions >= 10 ? 0 : 1,
    }).format(millions)} млн ₽`;
  }

  return formatPriceRub(amount);
}

const scenePresetMeta: Record<
  ScenePresetKey,
  { title: string; caption: string }
> = {
  compact: { title: "Компактный", caption: "3 позиции" },
  balanced: { title: "Сбалансированный", caption: "5 позиций" },
  extended: { title: "Расширенный", caption: "7 позиций" },
};

export function ConfiguratorWorkbench({
  recommendation,
  compactPlan,
  balancedPlan,
  extendedPlan,
  scenePool,
  resolvedObjectTypeLabel,
  segmentLabel,
  customerName,
  customerAddress,
}: ConfiguratorWorkbenchProps) {
  const [preset, setPreset] = useState<ScenePresetKey>("balanced");

  const activePlan = useMemo(() => {
    switch (preset) {
      case "compact":
        return compactPlan;
      case "extended":
        return extendedPlan;
      default:
        return balancedPlan;
    }
  }, [balancedPlan, compactPlan, extendedPlan, preset]);

  const staticProposalQuery = new URLSearchParams();
  staticProposalQuery.set(
    "products",
    recommendation.items.map((item) => item.product.slug).join(","),
  );
  staticProposalQuery.set("customer", customerName?.trim() || "Клиент");
  if (customerAddress?.trim()) {
    staticProposalQuery.set("address", customerAddress.trim());
  }

  const metrics = [
    {
      label: "Состав",
      value: formatCompactRub(recommendation.estimatedTotalRub),
    },
    {
      label: "Позиции",
      value: String(recommendation.items.length),
    },
    {
      label: "Отсечено",
      value: String(recommendation.filteredOutCount),
    },
    {
      label: "Участок",
      value: `${activePlan.bounds.widthM} × ${activePlan.bounds.lengthM} м`,
    },
  ];

  const compactNotes = [
    recommendation.rationale,
    ...recommendation.filtersApplied.slice(0, 2),
  ].filter(Boolean);

  const logicItems = [
    { label: "Тип", value: resolvedObjectTypeLabel },
    { label: "Сегмент", value: segmentLabel },
    {
      label: "Источник",
      value:
        activePlan.bounds.source === "FORM"
          ? "Поля формы"
          : activePlan.bounds.source === "TEXT"
            ? "Комментарий"
            : "Авторасчет",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-shell rounded-[34px] p-5 sm:p-6 lg:p-7">
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.34em] text-[var(--foreground-muted)]">
                Подбор
              </p>
              <h2 className="max-w-4xl text-3xl font-semibold tracking-[-0.06em] text-[#181512] sm:text-4xl">
                {recommendation.solutionName}
              </h2>

              {compactNotes.length > 0 ? (
                <div className="flex flex-wrap gap-2.5 pt-2">
                  {compactNotes.map((line: string) => (
                    <span
                      key={line}
                      className="rounded-full border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.72)] px-4 py-2 text-sm text-[var(--foreground-muted)]"
                    >
                      {line}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-[26px] border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.72)] px-5 py-4"
                >
                  <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--foreground-muted)]">
                    {metric.label}
                  </div>
                  <div className="mt-2 whitespace-nowrap text-[clamp(1.45rem,2vw,1.95rem)] font-semibold tracking-[-0.06em] text-[#181512]">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {recommendation.recognizedPreferences.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recommendation.recognizedPreferences.map((chip) => (
                <span
                  key={chip.id}
                  className={`rounded-full border px-3 py-1.5 text-sm ${chipClassName(chip)}`}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="surface-shell rounded-[34px] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-[var(--foreground-muted)]">
                Сцена
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#181512]">
                Режим раскладки
              </h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["compact", "balanced", "extended"] as const).map((key) => {
                const meta = scenePresetMeta[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPreset(key)}
                    className={cn(
                      "rounded-[24px] border px-4 py-3 text-left transition-all",
                      preset === key
                        ? "border-[rgba(239,100,29,0.35)] bg-[rgba(239,100,29,0.12)] shadow-[0_18px_40px_rgba(239,100,29,0.12)]"
                        : "border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.72)] hover:bg-[rgba(255,255,255,0.88)]",
                    )}
                  >
                    <div className="text-sm font-semibold text-[#181512]">{meta.title}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
                      {meta.caption}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="dark-panel rounded-[34px] p-5 text-white sm:p-6">
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-[0.32em] text-[rgba(255,255,255,0.52)]">
              Параметры
            </div>

            <div className="space-y-3">
              {logicItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] px-4 py-4"
                >
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[rgba(255,255,255,0.46)]">
                    {item.label}
                  </div>
                  <div className="mt-2 text-lg font-semibold tracking-[-0.03em]">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-3 pt-2">
              <ButtonLink href={`/proposals/new?${staticProposalQuery.toString()}`}>
                КП
              </ButtonLink>
              <ButtonLink
                href="/catalog"
                variant="secondary"
                className="bg-white/92 !text-[#181613] hover:!text-[#181613]"
              >
                Каталог
              </ButtonLink>
            </div>
          </div>
        </aside>
      </section>

      <PlacementScenePlanner
        key={preset}
        initialPlan={activePlan}
        poolItems={scenePool}
        proposalCustomerName={customerName}
        proposalAddress={customerAddress}
        objectTypeLabel={resolvedObjectTypeLabel}
        segmentLabel={segmentLabel}
      />

      <section className="grid gap-5 xl:grid-cols-2">
        {recommendation.items.map(({ product, highlights, score }) => (
          <article
            key={product.id}
            className="rounded-[32px] border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.86)] p-6 shadow-[0_24px_80px_rgba(20,18,16,0.05)]"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.24em] text-[var(--foreground-muted)]">
                  {product.article}
                </div>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#181512]">
                  {product.name}
                </h3>
              </div>

              <div className="rounded-[24px] border border-[rgba(20,18,16,0.08)] bg-[rgba(248,244,238,0.88)] px-5 py-4 text-right">
                <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--foreground-muted)]">
                  Score
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#181512]">
                  {score.toFixed(1)}
                </div>
                <div className="mt-1 text-sm text-[var(--foreground-muted)]">
                  {formatPriceRub(product.basePriceRub)}
                </div>
              </div>
            </div>

            {highlights.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {highlights.map((highlight) => (
                  <span
                    key={`${product.id}-${highlight}`}
                    className="rounded-full border border-[rgba(236,107,32,0.22)] bg-[rgba(236,107,32,0.08)] px-3 py-1.5 text-sm text-[rgb(111,52,15)]"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/catalog/${product.categorySlug}/${product.slug}`}
                className="rounded-full border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.72)] px-4 py-2 text-sm font-medium text-[#181512] transition-transform hover:-translate-y-0.5"
              >
                Карточка
              </Link>
              <span className="rounded-full border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.72)] px-4 py-2 text-sm text-[var(--foreground-muted)]">
                {product.sizeLabel ?? "Размер по каталогу"}
              </span>
              {product.ageLabel ? (
                <span className="rounded-full border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.72)] px-4 py-2 text-sm text-[var(--foreground-muted)]">
                  {product.ageLabel}
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
