"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  MoveDown,
  MoveLeft,
  MoveRight,
  MoveUp,
  RotateCw,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";

import {
  arrangePlacementSceneItems,
  evaluatePlacementScene,
} from "@/application/placement-scene/planner";
import { PlacementSceneItem, PlacementScenePlan } from "@/application/placement-scene/types";
import { cn } from "@/shared/utils/cn";
import { formatPriceRub } from "@/shared/utils/money";

type PlacementScenePlannerProps = {
  initialPlan: PlacementScenePlan;
  poolItems?: PlacementSceneItem[];
  proposalCustomerName?: string;
  proposalAddress?: string;
  objectTypeLabel?: string;
  segmentLabel?: string;
};

const SCENE_SCALE = 42;

function colorByToken(token: PlacementSceneItem["colorToken"]) {
  switch (token) {
    case "accent":
      return {
        fill: "rgba(239,100,29,0.88)",
        stroke: "rgba(210,85,12,1)",
        safety: "rgba(239,100,29,0.14)",
      };
    case "graphite":
      return {
        fill: "rgba(38,35,33,0.88)",
        stroke: "rgba(21,19,18,1)",
        safety: "rgba(38,35,33,0.12)",
      };
    case "sand":
      return {
        fill: "rgba(202,168,116,0.9)",
        stroke: "rgba(163,128,77,1)",
        safety: "rgba(202,168,116,0.15)",
      };
    case "sage":
      return {
        fill: "rgba(138,171,96,0.92)",
        stroke: "rgba(101,130,65,1)",
        safety: "rgba(138,171,96,0.15)",
      };
    default:
      return {
        fill: "rgba(174,118,88,0.9)",
        stroke: "rgba(136,86,59,1)",
        safety: "rgba(174,118,88,0.16)",
      };
  }
}

function encodeScenePayload(
  bounds: PlacementScenePlan["bounds"],
  items: PlacementSceneItem[],
  title: string,
  warningCount: number,
  collisionCount: number,
  notes: string[],
) {
  const payload = {
    title,
    bounds,
    items: items.map((item) => ({
      productSlug: item.productSlug,
      article: item.article,
      name: item.name,
      colorToken: item.colorToken,
      positionXM: item.positionXM,
      positionYM: item.positionYM,
      widthM: item.widthM,
      lengthM: item.lengthM,
      safetyWidthM: item.safetyWidthM,
      safetyLengthM: item.safetyLengthM,
      rotationDeg: item.rotationDeg,
    })),
    summary: { warningCount, collisionCount },
    notes,
  };

  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function buildProposalHref(
  plan: PlacementScenePlan,
  items: PlacementSceneItem[],
  customerName: string | undefined,
  customerAddress: string | undefined,
  warningCount: number,
  collisionCount: number,
  sceneProjectId?: string,
) {
  const params = new URLSearchParams();
  const productSlugs = items
    .map((item) => item.productSlug)
    .filter((value): value is string => Boolean(value));

  if (productSlugs.length > 0) {
    params.set("products", productSlugs.join(","));
  }
  params.set("customer", customerName?.trim() || "Клиент");
  if (customerAddress?.trim()) {
    params.set("address", customerAddress.trim());
  }
  params.set("sceneWidthM", String(plan.bounds.widthM));
  params.set("sceneLengthM", String(plan.bounds.lengthM));
  if (sceneProjectId) {
    params.set("sceneProjectId", sceneProjectId);
  } else {
    params.set(
      "scenePayload",
      encodeScenePayload(
        plan.bounds,
        items,
        plan.recommendation.solutionName,
        warningCount,
        collisionCount,
        plan.explainability,
      ),
    );
  }

  return `/proposals/new?${params.toString()}`;
}

function warningTone(count: number) {
  return count === 0 ? "text-[rgba(255,255,255,0.76)]" : "text-[rgb(248,176,140)]";
}

function statusLabel(status?: PlacementSceneItem["threeDStatus"]) {
  switch (status) {
    case "WEB_READY":
      return "GLB готов";
    case "SOURCE_READY":
      return "Исходник";
    case "PREVIEW_READY":
      return "Превью";
    case "NO_3D_DATA":
      return "Без 3D";
    default:
      return null;
  }
}

export function PlacementScenePlanner({
  initialPlan,
  poolItems = [],
  proposalCustomerName,
  proposalAddress,
  objectTypeLabel,
  segmentLabel,
}: PlacementScenePlannerProps) {
  const [items, setItems] = useState(initialPlan.items);
  const [selectedItemId, setSelectedItemId] = useState(initialPlan.items[0]?.id);
  const [showSafetyZones, setShowSafetyZones] = useState(true);
  const [queuedItemId, setQueuedItemId] = useState<string | undefined>(undefined);
  const [persistedSceneProjectId, setPersistedSceneProjectId] = useState<string | undefined>(
    undefined,
  );
  const [saveState, setSaveState] = useState<
    | { status: "idle" }
    | { status: "saving" }
    | { status: "saved"; projectId: string }
    | { status: "error"; message: string }
  >({ status: "idle" });

  const evaluation = useMemo(
    () => evaluatePlacementScene(initialPlan.bounds, items),
    [initialPlan.bounds, items],
  );
  const selectedItem =
    evaluation.items.find((item) => item.id === selectedItemId) ?? evaluation.items[0];
  const availableItems = useMemo(
    () => poolItems.filter((candidate) => !items.some((item) => item.id === candidate.id)),
    [items, poolItems],
  );

  function resetSaveState() {
    if (saveState.status !== "idle") {
      setSaveState({ status: "idle" });
    }
  }

  function commitItems(nextItems: PlacementSceneItem[]) {
    const arranged = arrangePlacementSceneItems(nextItems, initialPlan.bounds);
    setItems(arranged);
    setSelectedItemId(arranged[0]?.id);
    resetSaveState();
  }

  function updateSelectedItem(mutator: (item: PlacementSceneItem) => PlacementSceneItem) {
    if (!selectedItem) {
      return;
    }

    setItems((current) =>
      current.map((item) => (item.id === selectedItem.id ? mutator(item) : item)),
    );
    resetSaveState();
  }

  function nudgeSelected(dx: number, dy: number) {
    updateSelectedItem((item) => ({
      ...item,
      positionXM: Number((item.positionXM + dx).toFixed(2)),
      positionYM: Number((item.positionYM + dy).toFixed(2)),
    }));
  }

  function rotateSelected() {
    updateSelectedItem((item) => ({
      ...item,
      rotationDeg: (((item.rotationDeg + 90) % 360) || 0) as 0 | 90 | 180 | 270,
    }));
  }

  function addQueuedItem() {
    const nextItem = availableItems.find((item) => item.id === queuedItemId) ?? availableItems[0];
    if (!nextItem) {
      return;
    }

    const arranged = arrangePlacementSceneItems([...items, nextItem], initialPlan.bounds);
    setItems(arranged);
    setSelectedItemId(nextItem.id);
    setQueuedItemId(undefined);
    resetSaveState();
  }

  function removeSelectedItem() {
    if (!selectedItem || items.length <= 1) {
      return;
    }

    commitItems(items.filter((item) => item.id !== selectedItem.id));
  }

  async function saveSceneProject() {
    try {
      const existingSceneProjectId = persistedSceneProjectId;
      setSaveState({ status: "saving" });

      const response = await fetch("/api/scene-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${initialPlan.recommendation.solutionName} — ${initialPlan.bounds.widthM}×${initialPlan.bounds.lengthM} м`,
          id: existingSceneProjectId,
          customerName: proposalCustomerName,
          customerAddress: proposalAddress,
          solutionName: initialPlan.recommendation.solutionName,
          objectTypeLabel,
          segmentLabel,
          bounds: initialPlan.bounds,
          items: items.map((item) => ({
            id: item.id,
            productSlug: item.productSlug,
            article: item.article,
            name: item.name,
            colorToken: item.colorToken,
            placementRole: item.placementRole,
            productKind: item.productKind,
            positionXM: item.positionXM,
            positionYM: item.positionYM,
            rotationDeg: item.rotationDeg,
            widthM: item.widthM,
            lengthM: item.lengthM,
            safetyWidthM: item.safetyWidthM,
            safetyLengthM: item.safetyLengthM,
            basePriceRub: item.basePriceRub,
          })),
          summary: {
            estimatedTotalRub: evaluation.summary.estimatedTotalRub,
            collisionCount: evaluation.summary.collisionCount,
            outOfBoundsCount: evaluation.summary.outOfBoundsCount,
            warningCount: evaluation.warnings.length,
            itemsCount: evaluation.summary.itemsCount,
          },
          notes: initialPlan.explainability,
        }),
      });

      if (!response.ok) {
        throw new Error("Не удалось сохранить сцену");
      }

      const payload = (await response.json()) as { id: string };
      setPersistedSceneProjectId(payload.id);
      setSaveState({ status: "saved", projectId: payload.id });
    } catch (error) {
      setSaveState({
        status: "error",
        message: error instanceof Error ? error.message : "Не удалось сохранить сцену",
      });
    }
  }

  const sceneWidth = initialPlan.bounds.widthM * SCENE_SCALE;
  const sceneHeight = initialPlan.bounds.lengthM * SCENE_SCALE;
  const sceneStyle = {
    aspectRatio: `${Math.max(initialPlan.bounds.widthM, 1)} / ${Math.max(initialPlan.bounds.lengthM, 1)}`,
    maxHeight: "620px",
  };

  const proposalHref = buildProposalHref(
    initialPlan,
    items,
    proposalCustomerName,
    proposalAddress,
    evaluation.warnings.length,
    evaluation.summary.collisionCount,
    saveState.status === "saved" ? saveState.projectId : undefined,
  );

  const stageMetrics = [
    {
      label: "Контур",
      value: `${initialPlan.bounds.widthM} × ${initialPlan.bounds.lengthM} м`,
    },
    {
      label: "Позиции",
      value: `${evaluation.summary.itemsCount} шт.`,
    },
    {
      label: "Бюджет",
      value: formatPriceRub(evaluation.summary.estimatedTotalRub),
    },
    {
      label: "Внимание",
      value: evaluation.warnings.length === 0 ? "Чисто" : String(evaluation.warnings.length),
    },
  ];

  const sceneNotes = initialPlan.explainability.slice(0, 4);

  return (
    <section className="overflow-hidden rounded-[36px] border border-[rgba(20,18,16,0.08)] bg-white shadow-[0_36px_120px_rgba(20,18,16,0.08)]">
      <div className="border-b border-[rgba(20,18,16,0.08)] bg-[linear-gradient(180deg,rgba(253,248,243,0.98)_0%,rgba(248,244,238,0.94)_100%)] p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.34em] text-[var(--foreground-muted)]">
              Сцена
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[#181512] sm:text-4xl">
              План размещения
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[620px] xl:grid-cols-4">
            {stageMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[24px] border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.82)] px-4 py-3 shadow-[0_18px_40px_rgba(20,18,16,0.05)]"
              >
                <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--foreground-muted)]">
                  {metric.label}
                </div>
                <div className="mt-2 whitespace-nowrap text-lg font-semibold tracking-[-0.04em] text-[#181512] sm:text-xl">
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="bg-[linear-gradient(180deg,rgba(253,248,243,0.98)_0%,rgba(248,244,238,0.94)_100%)] p-6 sm:p-8 xl:border-r xl:border-[rgba(20,18,16,0.08)]">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.78)] px-3 py-2 text-xs uppercase tracking-[0.24em] text-[var(--foreground-muted)]">
                Источник:{" "}
                {initialPlan.bounds.source === "DERIVED"
                  ? "авто"
                  : initialPlan.bounds.source === "TEXT"
                    ? "текст"
                    : "форма"}
              </span>
              <span
                className={cn(
                  "rounded-full border px-3 py-2 text-xs uppercase tracking-[0.24em]",
                  evaluation.summary.collisionCount > 0 || evaluation.summary.outOfBoundsCount > 0
                    ? "border-[rgba(220,96,46,0.24)] bg-[rgba(220,96,46,0.12)] text-[rgb(172,68,28)]"
                    : "border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.78)] text-[var(--foreground-muted)]",
                )}
              >
                Коллизии: {evaluation.summary.collisionCount}
              </span>
              <span className="rounded-full border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.78)] px-3 py-2 text-xs uppercase tracking-[0.24em] text-[var(--foreground-muted)]">
                Заполнение: {Math.round(evaluation.summary.safetyCoverageRatio * 100)}%
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowSafetyZones((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.82)] px-4 py-2 text-sm font-medium text-[#181512] shadow-[0_12px_28px_rgba(20,18,16,0.06)] transition-transform hover:-translate-y-0.5"
            >
              <Shield size={16} />
              {showSafetyZones ? "Скрыть зоны" : "Показать зоны"}
            </button>
          </div>

          <div className="rounded-[28px] border border-[rgba(20,18,16,0.08)] bg-[linear-gradient(180deg,rgba(251,248,243,0.92)_0%,rgba(245,240,234,0.98)_100%)] p-4">
            <svg
              viewBox={`0 0 ${sceneWidth} ${sceneHeight}`}
              className="block h-auto w-full"
              style={sceneStyle}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <pattern
                  id="scene-grid"
                  width={SCENE_SCALE}
                  height={SCENE_SCALE}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${SCENE_SCALE} 0 L 0 0 0 ${SCENE_SCALE}`}
                    fill="none"
                    stroke="rgba(26,22,18,0.07)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>

              <rect x={0} y={0} width={sceneWidth} height={sceneHeight} fill="url(#scene-grid)" />
              <rect
                x={1}
                y={1}
                width={sceneWidth - 2}
                height={sceneHeight - 2}
                rx={24}
                fill="none"
                stroke="rgba(26,22,18,0.18)"
                strokeWidth="2"
              />

              {evaluation.items.map((item) => {
                const colors = colorByToken(item.colorToken);
                const isSelected = item.id === selectedItem?.id;

                return (
                  <g key={item.id} onClick={() => setSelectedItemId(item.id)} style={{ cursor: "pointer" }}>
                    {showSafetyZones ? (
                      <rect
                        x={item.safetyRect.left * SCENE_SCALE}
                        y={item.safetyRect.top * SCENE_SCALE}
                        width={item.safetyRect.width * SCENE_SCALE}
                        height={item.safetyRect.height * SCENE_SCALE}
                        rx={22}
                        fill={colors.safety}
                        stroke={isSelected ? colors.stroke : "rgba(20,18,16,0.1)"}
                        strokeWidth={isSelected ? 3 : 1.5}
                        strokeDasharray={isSelected ? "14 10" : "10 10"}
                      />
                    ) : null}

                    <rect
                      x={item.footprintRect.left * SCENE_SCALE}
                      y={item.footprintRect.top * SCENE_SCALE}
                      width={item.footprintRect.width * SCENE_SCALE}
                      height={item.footprintRect.height * SCENE_SCALE}
                      rx={18}
                      fill={colors.fill}
                      stroke={isSelected ? "#181512" : colors.stroke}
                      strokeWidth={isSelected ? 3.5 : 2}
                    />

                    <text
                      x={(item.footprintRect.left + item.footprintRect.width / 2) * SCENE_SCALE}
                      y={(item.footprintRect.top + item.footprintRect.height / 2) * SCENE_SCALE - 6}
                      fontSize={18}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.92)"
                      fontWeight={700}
                    >
                      {item.article}
                    </text>

                    <text
                      x={(item.footprintRect.left + item.footprintRect.width / 2) * SCENE_SCALE}
                      y={(item.footprintRect.top + item.footprintRect.height / 2) * SCENE_SCALE + 18}
                      fontSize={12}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.86)"
                    >
                      {item.placementRole === "ANCHOR" ? "якорь" : "элемент"}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {sceneNotes.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2.5">
              {sceneNotes.map((line) => (
                <span
                  key={line}
                  className="rounded-full border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.74)] px-4 py-2 text-sm text-[var(--foreground-muted)] shadow-[0_12px_24px_rgba(20,18,16,0.03)]"
                >
                  {line}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="bg-[linear-gradient(180deg,#171412_0%,#231d19_100%)] p-6 text-white sm:p-8">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.34em] text-[rgba(255,255,255,0.56)]">
              Инспектор
            </p>
            <h3 className="text-3xl font-semibold tracking-[-0.05em]">Ручная доводка</h3>
          </div>

          {selectedItem ? (
            <div className="mt-8 rounded-[28px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.24em] text-[rgba(255,255,255,0.48)]">
                    Элемент
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.05em]">
                    {selectedItem.article}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-[rgba(255,255,255,0.7)]">
                    {selectedItem.name}
                  </div>
                </div>

                <div className="rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1 text-xs uppercase tracking-[0.22em] text-[rgba(255,255,255,0.72)]">
                  {selectedItem.placementRole === "ANCHOR" ? "якорь" : "слой"}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {statusLabel(selectedItem.threeDStatus) ? (
                  <span className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[rgba(255,255,255,0.76)]">
                    {statusLabel(selectedItem.threeDStatus)}
                  </span>
                ) : null}
                {selectedItem.hasDwg ? (
                  <span className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[rgba(255,255,255,0.76)]">
                    DWG
                  </span>
                ) : null}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[20px] bg-[rgba(255,255,255,0.04)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[rgba(255,255,255,0.48)]">
                    Размер
                  </div>
                  <div className="mt-2 text-lg font-semibold">
                    {selectedItem.orientedWidthM} × {selectedItem.orientedLengthM} м
                  </div>
                </div>

                <div className="rounded-[20px] bg-[rgba(255,255,255,0.04)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[rgba(255,255,255,0.48)]">
                    Safety zone
                  </div>
                  <div className="mt-2 text-lg font-semibold">
                    {selectedItem.safetyRect.width} × {selectedItem.safetyRect.height} м
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => nudgeSelected(0, -0.25)}
                  className="inline-flex items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] p-3 transition-colors hover:bg-[rgba(255,255,255,0.08)]"
                >
                  <MoveUp size={18} />
                </button>
                <button
                  type="button"
                  onClick={rotateSelected}
                  className="inline-flex items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] p-3 transition-colors hover:bg-[rgba(255,255,255,0.08)]"
                >
                  <RotateCw size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => nudgeSelected(0, 0.25)}
                  className="inline-flex items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] p-3 transition-colors hover:bg-[rgba(255,255,255,0.08)]"
                >
                  <MoveDown size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => nudgeSelected(-0.25, 0)}
                  className="inline-flex items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] p-3 transition-colors hover:bg-[rgba(255,255,255,0.08)]"
                >
                  <MoveLeft size={18} />
                </button>
                <div className="inline-flex items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] p-3 text-sm text-[rgba(255,255,255,0.75)]">
                  {selectedItem.rotationDeg}°
                </div>
                <button
                  type="button"
                  onClick={() => nudgeSelected(0.25, 0)}
                  className="inline-flex items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] p-3 transition-colors hover:bg-[rgba(255,255,255,0.08)]"
                >
                  <MoveRight size={18} />
                </button>
              </div>

              <div className="mt-5 space-y-2 text-sm leading-6 text-[rgba(255,255,255,0.72)]">
                {selectedItem.rationale.map((line) => (
                  <div key={line} className="rounded-2xl bg-[rgba(255,255,255,0.04)] px-4 py-3">
                    {line}
                  </div>
                ))}
              </div>

              {selectedItem.warnings.length > 0 ? (
                <div className="mt-5 space-y-2">
                  {selectedItem.warnings.map((warning, index) => (
                    <div
                      key={`${warning.type}-${warning.relatedItemId ?? "single"}-${index}`}
                      className="rounded-2xl border border-[rgba(239,100,29,0.18)] bg-[rgba(239,100,29,0.1)] px-4 py-3 text-sm leading-6 text-[rgba(255,236,222,0.92)]"
                    >
                      {warning.message}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[rgba(255,255,255,0.48)]">
              <Sparkles size={14} />
              Статус
            </div>
            <div className={cn("mt-3 text-sm leading-7", warningTone(evaluation.warnings.length))}>
              {evaluation.warnings.length === 0
                ? "Сцену можно отправлять в КП."
                : `Есть ${evaluation.warnings.length} точек внимания.`}
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-[rgba(255,255,255,0.48)]">
              Операции
            </div>

            <div className="mt-4 space-y-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <select
                  value={queuedItemId ?? ""}
                  onChange={(event) => setQueuedItemId(event.target.value || undefined)}
                  className="h-12 rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white outline-none"
                >
                  <option value="">Добавить позицию</option>
                  {availableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.article} — {item.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={addQueuedItem}
                  disabled={availableItems.length === 0}
                  className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--accent)_0%,#ff7a29_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(239,100,29,0.25)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Добавить
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={removeSelectedItem}
                  disabled={!selectedItem || items.length <= 1}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[rgba(255,255,255,0.08)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={16} />
                  Удалить
                </button>

                <Link
                  href={proposalHref}
                  className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--accent)_0%,#ff7a29_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(239,100,29,0.25)] transition-transform hover:-translate-y-0.5"
                >
                  В КП
                </Link>
              </div>

              <button
                type="button"
                onClick={saveSceneProject}
                disabled={saveState.status === "saving"}
                className="inline-flex items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[rgba(255,255,255,0.08)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveState.status === "saving" ? "Сохраняем..." : "Сохранить"}
              </button>

              {saveState.status === "saved" ? (
                <div className="rounded-2xl border border-[rgba(72,168,111,0.28)] bg-[rgba(72,168,111,0.12)] px-4 py-3 text-sm text-[rgba(227,255,236,0.92)]">
                  Сцена сохранена.{" "}
                  <Link
                    href={`/admin/projects/${saveState.projectId}`}
                    className="underline underline-offset-4"
                  >
                    Открыть проект
                  </Link>
                </div>
              ) : null}

              {saveState.status === "error" ? (
                <div className="rounded-2xl border border-[rgba(239,100,29,0.18)] bg-[rgba(239,100,29,0.1)] px-4 py-3 text-sm text-[rgba(255,236,222,0.92)]">
                  {saveState.message}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {evaluation.items.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={cn(
                  "flex w-full items-start justify-between gap-3 rounded-[24px] border px-4 py-4 text-left transition-colors",
                  item.id === selectedItem?.id
                    ? "border-[rgba(239,100,29,0.45)] bg-[rgba(239,100,29,0.12)]"
                    : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.05)]",
                )}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{item.article}</div>
                  <div className="mt-1 text-xs leading-5 text-[rgba(255,255,255,0.64)]">
                    {item.name}
                  </div>
                  {statusLabel(item.threeDStatus) ? (
                    <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.42)]">
                      {statusLabel(item.threeDStatus)}
                    </div>
                  ) : null}
                </div>
                <div className="text-right text-xs text-[rgba(255,255,255,0.56)]">
                  <div>{item.positionXM.toFixed(2)} м</div>
                  <div>{item.positionYM.toFixed(2)} м</div>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
