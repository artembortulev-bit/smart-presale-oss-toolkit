import { PlacementTruthProduct } from "@/application/placement-foundation/types";
import {
  SelectionRecommendation,
  SelectionRecommendationItem,
} from "@/application/selection/types";

import {
  BuildPlacementSceneOptions,
  PlacementSceneBounds,
  PlacementSceneEvaluation,
  PlacementSceneEvaluationItem,
  PlacementSceneItem,
  PlacementScenePlan,
  PlacementSceneWarning,
} from "@/application/placement-scene/types";

const DEFAULT_PLOT_WIDTH_M = 10;
const DEFAULT_PLOT_LENGTH_M = 14;
const PLOT_PADDING_M = 0.45;
const ROW_GAP_M = 0.55;
const ITEM_GAP_M = 0.45;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getOrientationAwareSize(item: PlacementSceneItem) {
  const swap = item.rotationDeg === 90 || item.rotationDeg === 270;

  return {
    widthM: swap ? item.lengthM : item.widthM,
    lengthM: swap ? item.widthM : item.lengthM,
    safetyWidthM: swap ? item.safetyLengthM : item.safetyWidthM,
    safetyLengthM: swap ? item.safetyWidthM : item.safetyLengthM,
  };
}

function getPlotBounds(
  recommendation: SelectionRecommendation,
  sceneItems: PlacementSceneItem[],
): PlacementSceneBounds {
  const widthM = recommendation.constraints.widthM;
  const lengthM = recommendation.constraints.lengthM;

  if (widthM && lengthM) {
    return {
      widthM,
      lengthM,
      areaM2: round(widthM * lengthM, 2),
      source:
        recommendation.constraints.dimensionsSource === "text" ? "TEXT" : "FORM",
    };
  }

  const sortedWidths = sceneItems
    .map((item) => item.safetyWidthM)
    .sort((left, right) => left - right);
  const sortedLengths = sceneItems
    .map((item) => item.safetyLengthM)
    .sort((left, right) => left - right);
  const medianWidth =
    sortedWidths[Math.floor(sortedWidths.length / 2)] ?? DEFAULT_PLOT_WIDTH_M;
  const medianLength =
    sortedLengths[Math.floor(sortedLengths.length / 2)] ?? DEFAULT_PLOT_LENGTH_M;
  const fallbackWidth = medianWidth * 1.85;
  const fallbackLength = medianLength * 2.05;

  const derivedWidth = round(
    Math.max(DEFAULT_PLOT_WIDTH_M, Math.min(18, fallbackWidth || DEFAULT_PLOT_WIDTH_M)),
    2,
  );
  const derivedLength = round(
    Math.max(DEFAULT_PLOT_LENGTH_M, Math.min(24, fallbackLength || DEFAULT_PLOT_LENGTH_M)),
    2,
  );

  return {
    widthM: derivedWidth,
    lengthM: derivedLength,
    areaM2: round(derivedWidth * derivedLength, 2),
    source: "DERIVED",
  };
}

function rolePriority(item: PlacementSceneItem) {
  if (item.placementRole === "ANCHOR") {
    return 0;
  }

  if (item.placementRole === "FEATURE") {
    return 1;
  }

  if (item.placementRole === "SUPPORTING") {
    return 2;
  }

  return 3;
}

export function buildPlacementSceneItemFromRecommendation(
  recommendationItem: SelectionRecommendationItem,
  truthProduct?: PlacementTruthProduct,
): PlacementSceneItem {
  const fallbackWidth = recommendationItem.product.widthM ?? 1.4;
  const fallbackLength = recommendationItem.product.lengthM ?? 1.8;
  const safetyWidthM =
    truthProduct?.derived.safetyZone.widthM ?? round(fallbackWidth + 1.4, 2);
  const safetyLengthM =
    truthProduct?.derived.safetyZone.lengthM ?? round(fallbackLength + 1.8, 2);

  const rationale = [
    truthProduct?.inferred.placementRole === "ANCHOR"
      ? "Базовый якорь композиции"
      : "Включен в рекомендованную подборку",
    truthProduct?.derived.compactScore !== undefined &&
    truthProduct.derived.compactScore >= 0.72
      ? "Подходит для компактных участков"
      : null,
    truthProduct?.inferred.growthScore !== undefined &&
    truthProduct.inferred.growthScore >= 0.62
      ? "Работает как решение на вырост"
      : null,
  ].filter((value): value is string => Boolean(value));

  return {
    id: recommendationItem.product.id,
    productSlug: recommendationItem.product.slug,
    article: recommendationItem.product.article,
    name: recommendationItem.product.name,
    categoryName: recommendationItem.product.categoryName,
    imageUrl:
      recommendationItem.product.imageUrl ?? recommendationItem.product.gallery[0],
    basePriceRub: recommendationItem.product.basePriceRub,
    placementRole: truthProduct?.inferred.placementRole ?? "FEATURE",
    productKind: truthProduct?.inferred.productKind ?? "PLAYGROUND_ELEMENT",
    widthM: truthProduct?.derived.footprintWidthM ?? fallbackWidth,
    lengthM: truthProduct?.derived.footprintLengthM ?? fallbackLength,
    safetyWidthM,
    safetyLengthM,
    positionXM: 0,
    positionYM: 0,
    rotationDeg:
      truthProduct?.inferred.productKind === "SLIDE" ||
      truthProduct?.inferred.productKind === "SWING"
        ? 90
        : 0,
    colorToken:
      truthProduct?.inferred.placementRole === "ANCHOR"
        ? "accent"
        : truthProduct?.inferred.productKind === "SMALL_ARCH_FORM"
          ? "sand"
          : truthProduct?.inferred.productKind === "PLAYGROUND_COMPLEX"
            ? "copper"
            : truthProduct?.inferred.productKind === "SKATE_MODULE"
              ? "graphite"
              : "sage",
    threeDStatus: truthProduct?.assets.threeDStatus,
    hasRenderableViewerAsset: truthProduct?.assets.hasRenderableViewerAsset,
    hasDwg: truthProduct?.assets.hasDwg,
    rationale,
    qualityScore: truthProduct?.quality.score ?? 52,
    placementReady: truthProduct?.quality.placementReady ?? false,
    source: {
      recommendationScore: recommendationItem.score,
      reasoning: recommendationItem.reasoning,
      highlights: recommendationItem.highlights,
    },
  };
}

function estimateFitScore(item: PlacementSceneItem, bounds: PlacementSceneBounds) {
  const widthFit = bounds.widthM / Math.max(item.safetyWidthM, 0.1);
  const lengthFit = bounds.lengthM / Math.max(item.safetyLengthM, 0.1);
  const fit = Math.min(widthFit, lengthFit);

  if (fit >= 1) {
    return 100 + fit * 8;
  }

  return fit * 100 - 40;
}

function pickSceneCandidates(
  recommendation: SelectionRecommendation,
  options?: BuildPlacementSceneOptions,
) {
  const truthMap = new Map(
    (options?.truthProducts ?? []).map((product) => [product.articleNormalized, product]),
  );

  const draftItems = recommendation.items
    .slice(0, 10)
    .map((item) =>
      buildPlacementSceneItemFromRecommendation(
        item,
        truthMap.get(item.product.articleNormalized),
      ),
    );

  const provisionalBounds = getPlotBounds(recommendation, draftItems);
  const targetCount = Math.min(
    options?.targetItems ?? 5,
    Math.max(3, recommendation.items.length),
  );

  return draftItems
    .map((item) => ({
      item,
      score:
        item.source.recommendationScore * 1.2 +
        item.qualityScore * 0.45 +
        estimateFitScore(item, provisionalBounds) +
        (item.placementRole === "ANCHOR" ? 12 : 0) -
        item.safetyWidthM * item.safetyLengthM * 0.25,
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, targetCount)
    .map((entry) => entry.item);
}

export function arrangePlacementSceneItems(
  rawItems: PlacementSceneItem[],
  bounds: PlacementSceneBounds,
) {
  const items = [...rawItems].sort((left, right) => {
    const roleDiff = rolePriority(left) - rolePriority(right);
    if (roleDiff !== 0) {
      return roleDiff;
    }

    return (
      right.safetyWidthM * right.safetyLengthM - left.safetyWidthM * left.safetyLengthM
    );
  });

  const arranged: PlacementSceneItem[] = [];
  const anchors = items.filter((item) => item.placementRole === "ANCHOR");
  const nonAnchors = items.filter((item) => item.placementRole !== "ANCHOR");

  if (anchors.length > 0) {
    const totalAnchorWidth =
      anchors.reduce((sum, item) => sum + item.safetyWidthM, 0) +
      Math.max(0, anchors.length - 1) * ITEM_GAP_M;
    let cursorX = clamp(
      (bounds.widthM - totalAnchorWidth) / 2,
      PLOT_PADDING_M,
      bounds.widthM - totalAnchorWidth - PLOT_PADDING_M,
    );
    const anchorDepth = Math.max(...anchors.map((item) => item.safetyLengthM));

    anchors.forEach((item) => {
      arranged.push({
        ...item,
        positionXM: round(cursorX + item.safetyWidthM / 2, 2),
        positionYM: round(PLOT_PADDING_M + item.safetyLengthM / 2, 2),
      });
      cursorX += item.safetyWidthM + ITEM_GAP_M;
    });

    let cursorY = PLOT_PADDING_M + anchorDepth + ROW_GAP_M;
    let rowHeight = 0;
    let rowX = PLOT_PADDING_M;

    nonAnchors.forEach((item) => {
      if (rowX + item.safetyWidthM > bounds.widthM - PLOT_PADDING_M) {
        rowX = PLOT_PADDING_M;
        cursorY += rowHeight + ROW_GAP_M;
        rowHeight = 0;
      }

      arranged.push({
        ...item,
        positionXM: round(rowX + item.safetyWidthM / 2, 2),
        positionYM: round(cursorY + item.safetyLengthM / 2, 2),
      });
      rowX += item.safetyWidthM + ITEM_GAP_M;
      rowHeight = Math.max(rowHeight, item.safetyLengthM);
    });

    return arranged;
  }

  let cursorY = PLOT_PADDING_M;
  let rowHeight = 0;
  let rowX = PLOT_PADDING_M;

  items.forEach((item) => {
    if (rowX + item.safetyWidthM > bounds.widthM - PLOT_PADDING_M) {
      rowX = PLOT_PADDING_M;
      cursorY += rowHeight + ROW_GAP_M;
      rowHeight = 0;
    }

    arranged.push({
      ...item,
      positionXM: round(rowX + item.safetyWidthM / 2, 2),
      positionYM: round(cursorY + item.safetyLengthM / 2, 2),
    });
    rowX += item.safetyWidthM + ITEM_GAP_M;
    rowHeight = Math.max(rowHeight, item.safetyLengthM);
  });

  return arranged;
}

function rectsOverlap(
  left: { left: number; top: number; width: number; height: number },
  right: { left: number; top: number; width: number; height: number },
) {
  return !(
    left.left + left.width <= right.left ||
    right.left + right.width <= left.left ||
    left.top + left.height <= right.top ||
    right.top + right.height <= left.top
  );
}

export function evaluatePlacementScene(
  bounds: PlacementSceneBounds,
  items: PlacementSceneItem[],
): PlacementSceneEvaluation {
  const evaluationItems: PlacementSceneEvaluationItem[] = items.map((item) => {
    const size = getOrientationAwareSize(item);

    return {
      ...item,
      orientedWidthM: size.widthM,
      orientedLengthM: size.lengthM,
      footprintRect: {
        left: round(item.positionXM - size.widthM / 2, 2),
        top: round(item.positionYM - size.lengthM / 2, 2),
        width: size.widthM,
        height: size.lengthM,
      },
      safetyRect: {
        left: round(item.positionXM - size.safetyWidthM / 2, 2),
        top: round(item.positionYM - size.safetyLengthM / 2, 2),
        width: size.safetyWidthM,
        height: size.safetyLengthM,
      },
      warnings: [],
    };
  });

  const warnings: PlacementSceneWarning[] = [];

  evaluationItems.forEach((item) => {
    const exceedsBounds =
      item.safetyRect.left < 0 ||
      item.safetyRect.top < 0 ||
      item.safetyRect.left + item.safetyRect.width > bounds.widthM ||
      item.safetyRect.top + item.safetyRect.height > bounds.lengthM;

    if (exceedsBounds) {
      const warning: PlacementSceneWarning = {
        type: "OUT_OF_BOUNDS",
        severity: "danger",
        itemId: item.id,
        message: `${item.article} выходит за допустимые границы площадки с учетом зоны безопасности.`,
      };
      item.warnings.push(warning);
      warnings.push(warning);
    }
  });

  for (let index = 0; index < evaluationItems.length; index += 1) {
    const current = evaluationItems[index];
    if (!current) {
      continue;
    }

    for (let otherIndex = index + 1; otherIndex < evaluationItems.length; otherIndex += 1) {
      const other = evaluationItems[otherIndex];
      if (!other) {
        continue;
      }

      if (rectsOverlap(current.safetyRect, other.safetyRect)) {
        const warning: PlacementSceneWarning = {
          type: "SAFETY_OVERLAP",
          severity: "warning",
          itemId: current.id,
          relatedItemId: other.id,
          message: `Зоны безопасности ${current.article} и ${other.article} пересекаются.`,
        };
        current.warnings.push(warning);
        other.warnings.push(warning);
        warnings.push(warning);
      }
    }
  }

  const safetyArea = evaluationItems.reduce(
    (sum, item) => sum + item.safetyRect.width * item.safetyRect.height,
    0,
  );
  const footprintArea = evaluationItems.reduce(
    (sum, item) => sum + item.footprintRect.width * item.footprintRect.height,
    0,
  );
  const plotArea = bounds.areaM2 || bounds.widthM * bounds.lengthM;

  if (safetyArea / plotArea > 0.92) {
    warnings.push({
      type: "PLOT_IS_TIGHT",
      severity: "warning",
      message:
        "Площадка получилась слишком плотной. Стоит либо ослабить состав, либо увеличить габариты участка.",
    });
  }

  if (!bounds.widthM || !bounds.lengthM) {
    warnings.push({
      type: "NO_DIMENSIONS",
      severity: "warning",
      message:
        "Размеры участка не заданы явно, поэтому сцена собрана по производным допущениям.",
    });
  }

  return {
    items: evaluationItems,
    warnings,
    summary: {
      itemsCount: evaluationItems.length,
      anchorCount: evaluationItems.filter((item) => item.placementRole === "ANCHOR").length,
      safetyCoverageRatio: round(safetyArea / plotArea, 2),
      footprintCoverageRatio: round(footprintArea / plotArea, 2),
      outOfBoundsCount: warnings.filter((warning) => warning.type === "OUT_OF_BOUNDS").length,
      collisionCount: warnings.filter((warning) => warning.type === "SAFETY_OVERLAP").length,
      estimatedTotalRub: evaluationItems.reduce(
        (sum, item) => sum + (item.basePriceRub ?? 0),
        0,
      ),
    },
  };
}

export function buildPlacementScenePlan(
  recommendation: SelectionRecommendation,
  options?: BuildPlacementSceneOptions,
): PlacementScenePlan {
  const sceneItems = pickSceneCandidates(recommendation, options);
  const bounds = getPlotBounds(recommendation, sceneItems);
  const arrangedItems = arrangePlacementSceneItems(sceneItems, bounds);
  const evaluation = evaluatePlacementScene(bounds, arrangedItems);

  const explainability = [
    `Сцена построена для участка ${bounds.widthM}×${bounds.lengthM} м.`,
    `В план вошло ${evaluation.summary.itemsCount} позиций, включая ${evaluation.summary.anchorCount} якорных элементов.`,
    evaluation.summary.collisionCount > 0
      ? `Система заметила ${evaluation.summary.collisionCount} пересечений зон безопасности и подсветила их для ручной коррекции.`
      : "Автопостановка не выявила критичных пересечений зон безопасности.",
  ];

  const rationale = [
    recommendation.rationale,
    bounds.source === "DERIVED"
      ? "Размеры площадки были выведены автоматически по составу решения."
      : "План использует размеры участка из формы или текстового запроса как жесткий контур постановки.",
    "Якорные позиции ставятся первыми, вторичные элементы раскладываются рядами с учетом безопасного контура.",
  ];

  return {
    recommendation: {
      solutionName: recommendation.solutionName,
      rationale: recommendation.rationale,
      estimatedTotalRub: recommendation.estimatedTotalRub,
    },
    bounds,
    items: arrangedItems,
    evaluation,
    rationale,
    explainability,
  };
}
