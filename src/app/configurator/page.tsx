import { requireInternalUser } from "@/application/auth/portal-access";
import {
  buildPlacementSceneItemFromRecommendation,
  buildPlacementScenePlan,
} from "@/application/placement-scene/planner";
import {
  objectTypeLabels,
  selectionSegmentLabels,
} from "@/application/selection/config";
import {
  buildSelectionRecommendation,
  ObjectType,
} from "@/application/selection/recommendation-engine";
import { getGeneratedProductTruthFoundation } from "@/infrastructure/data/generated-product-truth";
import { ConfiguratorWorkbench } from "@/ui/components/configurator/configurator-workbench";

type ConfiguratorPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getOptionalStringParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function getOptionalNumberParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const raw = getOptionalStringParam(params, key);
  if (!raw) {
    return undefined;
  }

  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

export default async function ConfiguratorPage({
  searchParams,
}: ConfiguratorPageProps) {
  await requireInternalUser(["ADMIN", "MANAGER"], "/configurator");

  const params = (await searchParams) ?? {};
  const objectType = (getOptionalStringParam(params, "objectType") ??
    "playground") as ObjectType;
  const widthM = getOptionalNumberParam(params, "widthM");
  const lengthM = getOptionalNumberParam(params, "lengthM");
  const segment = getOptionalStringParam(params, "segment") ?? "OPTIMUM";
  const budgetRub = getOptionalNumberParam(params, "budgetRub");
  const clientType = getOptionalStringParam(params, "clientType") ?? "";
  const wishes = getOptionalStringParam(params, "wishes") ?? "";
  const needsDelivery =
    typeof params.needsDelivery === "string" ? params.needsDelivery === "true" : true;
  const needsInstallation =
    typeof params.needsInstallation === "string"
      ? params.needsInstallation === "true"
      : true;

  const recommendation = await buildSelectionRecommendation({
    objectType,
    widthM,
    lengthM,
    segment: segment as "ECONOMY" | "OPTIMUM" | "PREMIUM",
    budgetRub,
    clientType,
    wishes,
    needsDelivery,
    needsInstallation,
  });

  const foundation = await getGeneratedProductTruthFoundation();
  const truthProducts = foundation?.products ?? [];
  const truthByArticle = new Map(
    truthProducts.map((product) => [product.articleNormalized, product] as const),
  );

  const compactPlan = buildPlacementScenePlan(recommendation, {
    truthProducts,
    targetItems: 3,
  });
  const balancedPlan = buildPlacementScenePlan(recommendation, {
    truthProducts,
    targetItems: 5,
  });
  const extendedPlan = buildPlacementScenePlan(recommendation, {
    truthProducts,
    targetItems: 7,
  });

  const scenePool = recommendation.items
    .slice(0, 10)
    .map((item) =>
      buildPlacementSceneItemFromRecommendation(
        item,
        truthByArticle.get(item.product.articleNormalized),
      ),
    );

  const resolvedObjectTypeLabel =
    objectTypeLabels[recommendation.constraints.resolvedObjectType] ??
    recommendation.constraints.resolvedObjectType;
  const segmentLabel =
    selectionSegmentLabels[
      recommendation.input.segment as keyof typeof selectionSegmentLabels
    ] ?? recommendation.input.segment;

  return (
    <main className="mx-auto max-w-[1560px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="surface-shell rounded-[32px] p-5 sm:p-6 xl:sticky xl:top-28 xl:h-fit">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-[var(--foreground-muted)]">
                Подбор
              </p>
              <h1 className="mt-4 text-[2.2rem] font-semibold leading-[0.92] tracking-[-0.07em] text-[#181512] sm:text-[2.7rem]">
                Подбор объекта
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              {["Сцена", "Состав", "КП"].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.78)] px-3 py-1.5 text-sm text-[var(--foreground-muted)]"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <form className="mt-8 space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--foreground-muted)]">
                Тип объекта
              </span>
              <select
                name="objectType"
                defaultValue={objectType}
                className="h-12 w-full rounded-2xl border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.84)] px-4 text-[#181512]"
              >
                {Object.entries(objectTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--foreground-muted)]">
                  Ширина, м
                </span>
                <input
                  type="number"
                  step="0.1"
                  name="widthM"
                  defaultValue={widthM}
                  placeholder="4"
                  className="h-12 w-full rounded-2xl border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.84)] px-4 text-[#181512]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--foreground-muted)]">
                  Длина, м
                </span>
                <input
                  type="number"
                  step="0.1"
                  name="lengthM"
                  defaultValue={lengthM}
                  placeholder="5"
                  className="h-12 w-full rounded-2xl border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.84)] px-4 text-[#181512]"
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--foreground-muted)]">
                Сегмент
              </span>
              <select
                name="segment"
                defaultValue={segment}
                className="h-12 w-full rounded-2xl border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.84)] px-4 text-[#181512]"
              >
                {Object.entries(selectionSegmentLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--foreground-muted)]">
                Бюджет, ₽
              </span>
              <input
                type="number"
                name="budgetRub"
                defaultValue={budgetRub}
                placeholder="2000000"
                className="h-12 w-full rounded-2xl border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.84)] px-4 text-[#181512]"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--foreground-muted)]">
                Клиент
              </span>
              <input
                name="clientType"
                defaultValue={clientType}
                placeholder="Частный дом, ЖК, детский сад"
                className="h-12 w-full rounded-2xl border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.84)] px-4 text-[#181512]"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--foreground-muted)]">
                Комментарий
              </span>
              <textarea
                name="wishes"
                defaultValue={wishes}
                rows={6}
                placeholder="Размеры, материалы, исключения"
                className="w-full rounded-[24px] border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.84)] px-4 py-3 text-[#181512] leading-7"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.78)] px-4 py-3 text-sm text-[#181512]">
                <input
                  type="checkbox"
                  name="needsDelivery"
                  value="true"
                  defaultChecked={needsDelivery}
                />
                <span>Доставка</span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.78)] px-4 py-3 text-sm text-[#181512]">
                <input
                  type="checkbox"
                  name="needsInstallation"
                  value="true"
                  defaultChecked={needsInstallation}
                />
                <span>Монтаж</span>
              </label>
            </div>

            <button
              type="submit"
              className="h-12 w-full rounded-full bg-[linear-gradient(135deg,var(--accent)_0%,#ff7a29_100%)] text-sm font-semibold text-white shadow-[0_18px_48px_rgba(239,100,29,0.22)] transition-transform hover:-translate-y-0.5"
            >
              Пересчитать
            </button>
          </form>
        </section>

        <ConfiguratorWorkbench
          recommendation={recommendation}
          compactPlan={compactPlan}
          balancedPlan={balancedPlan}
          extendedPlan={extendedPlan}
          scenePool={scenePool}
          resolvedObjectTypeLabel={resolvedObjectTypeLabel}
          segmentLabel={segmentLabel}
        />
      </div>
    </main>
  );
}
