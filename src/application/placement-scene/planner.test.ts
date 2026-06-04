import { describe, expect, it } from "vitest";

import { buildPlacementScenePlan, evaluatePlacementScene } from "@/application/placement-scene/planner";
import { PlacementTruthProduct } from "@/application/placement-foundation/types";
import { SelectionRecommendation } from "@/application/selection/types";

function createTruthProduct(overrides: Partial<PlacementTruthProduct>): PlacementTruthProduct {
  return {
    id: overrides.id ?? "product-1",
    article: overrides.article ?? "ИК.ТЕСТ01",
    articleNormalized: overrides.articleNormalized ?? "ИК.ТЕСТ01",
    slug: overrides.slug ?? "ik-test01",
    name: overrides.name ?? "Тестовый игровой комплекс",
    segmentKey: overrides.segmentKey,
    source: overrides.source ?? {
      sourceCount: 1,
      sourceSystems: ["TEST"],
      categoryName: "Игровые комплексы",
      materials: ["HPL"],
      basePriceRub: 550000,
    },
    derived: overrides.derived ?? {
      footprintWidthM: 3.2,
      footprintLengthM: 4.6,
      footprintAreaM2: 14.72,
      compactScore: 0.72,
      safetyZone: {
        source: "DERIVED_RULE",
        ruleId: "playground-complex-envelope",
        widthM: 6.2,
        lengthM: 8.1,
        areaM2: 50.22,
        sideClearanceM: 1.5,
        frontClearanceM: 1.7,
        rearClearanceM: 1.5,
      },
      placementContexts: ["play-cluster"],
      compatibilityTags: ["core-scene-anchor"],
      familyRelevance: {
        private: 1,
        residential: 0.6,
        municipal: 0.4,
        kindergarten: 0.2,
      },
    },
    inferred: overrides.inferred ?? {
      objectTypes: ["playground"],
      productKind: "PLAYGROUND_COMPLEX",
      placementRole: "ANCHOR",
      usageTags: ["private_family"],
      childDevelopmentStages: ["preschool"],
      materialTags: ["eco", "hpl"],
      ecoScore: 0.7,
      growthScore: 0.82,
      antiVandalScore: 0.52,
    },
    assets: overrides.assets ?? {
      galleryImages: 1,
      previewImages: 1,
      hasPreview: true,
      threeDStatus: "SOURCE_READY",
      hasRenderableViewerAsset: false,
      hasDwg: true,
      source3dFiles: 1,
    },
    commercial: overrides.commercial ?? {
      basePriceRub: 550000,
      costingAvailability: "DIRECT",
      costingConfidence: 0.92,
      defaultCostRub: 312000,
      defaultMarginPercent: 43,
    },
    quality: overrides.quality ?? {
      score: 88,
      status: "FOUNDATION_READY",
      flags: [],
      notes: [],
      placementReady: true,
    },
  };
}

function createRecommendation(): SelectionRecommendation {
  return {
    input: {
      objectType: "playground",
      widthM: 8,
      lengthM: 12,
      segment: "OPTIMUM",
      needsDelivery: true,
      needsInstallation: true,
      wishes: "Для дачи",
    },
    constraints: {
      formInput: {
        objectType: "playground",
        widthM: 8,
        lengthM: 12,
        segment: "OPTIMUM",
        needsDelivery: true,
        needsInstallation: true,
      },
      parsedQuery: {
        originalText: "Для дачи",
        normalizedText: "для дачи",
        materialPreferences: [],
        usageContexts: ["dacha"],
        growthPreference: false,
        compactPreference: false,
        safetyPreference: false,
        antiVandalPreference: false,
        excludeCategories: [],
        excludeKeywords: [],
        parseNotes: [],
      },
      resolvedObjectType: "playground",
      widthM: 8,
      lengthM: 12,
      areaM2: 96,
      dimensionsSource: "form",
      budgetSource: "none",
      textQuery: "Для дачи",
      materialPreferences: [],
      usageContexts: ["dacha"],
      excludedTags: [],
      excludedKeywords: [],
      growthPreference: false,
      compactPreference: false,
      safetyPreference: false,
      antiVandalPreference: false,
      targetCount: 4,
      chips: [],
      warnings: [],
      notes: [],
    },
    solutionName: "Игровой контур для частного участка",
    estimatedTotalRub: 970000,
    rationale: "Подбор сделан под частный участок с учетом размеров.",
    recognizedPreferences: [],
    filteredOutCount: 10,
    filtersApplied: ["Габариты участка", "Возраст"],
    items: [
      {
        product: {
          id: "product-1",
          slug: "ik-test01",
          article: "ИК.ТЕСТ01",
          articleNormalized: "ИК.ТЕСТ01",
          name: "Тестовый игровой комплекс",
          categorySlug: "igrovye-kompleksy",
          categoryName: "Игровые комплексы",
          materials: ["HPL"],
          lengthM: 4.6,
          widthM: 3.2,
          heightM: 2.8,
          basePriceRub: 550000,
          gallery: [],
          tags: [],
          metadata: {},
          prices: [],
          assets: [],
          variants: [],
          rawSources: [],
        },
        quantity: 1,
        score: 86,
        reasoning: "Подходит как основа композиции.",
        highlights: ["Компактный участок", "Для дачи"],
        breakdown: {
          total: 86,
          components: {
            objectType: 20,
            sizeFit: 15,
            age: 10,
            material: 10,
            usage: 10,
            budget: 8,
            growth: 5,
            confidence: 8,
            diversityPenalty: 0,
          },
          reasons: ["Подходит по типу"],
          penalties: [],
        },
        profile: {} as never,
      },
    ],
  };
}

describe("buildPlacementScenePlan", () => {
  it("строит план сцены по жестким размерам участка и данным foundation", () => {
    const recommendation = createRecommendation();
    const truth = [createTruthProduct({})];

    const plan = buildPlacementScenePlan(recommendation, { truthProducts: truth });

    expect(plan.bounds.widthM).toBe(8);
    expect(plan.bounds.lengthM).toBe(12);
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]?.placementRole).toBe("ANCHOR");
    expect(plan.evaluation.summary.itemsCount).toBe(1);
    expect(plan.rationale[0]).toContain("Подбор");
  });

  it("показывает пересечение и выход за границы при ручном конфликте", () => {
    const truth = createTruthProduct({});
    const evaluation = evaluatePlacementScene(
      {
        widthM: 6,
        lengthM: 6,
        areaM2: 36,
        source: "FORM",
      },
      [
        {
          id: "a",
          article: "ИК.А",
          name: "A",
          placementRole: "ANCHOR",
          productKind: "PLAYGROUND_COMPLEX",
          widthM: 3,
          lengthM: 3,
          safetyWidthM: 5,
          safetyLengthM: 5,
          positionXM: 2.5,
          positionYM: 2.5,
          rotationDeg: 0,
          colorToken: "accent",
          rationale: [],
          qualityScore: 80,
          placementReady: true,
          source: {
            recommendationScore: 80,
            reasoning: "A",
            highlights: [],
          },
        },
        {
          id: "b",
          article: "ИК.Б",
          name: "B",
          placementRole: truth.inferred.placementRole,
          productKind: truth.inferred.productKind,
          widthM: 3,
          lengthM: 3,
          safetyWidthM: 5,
          safetyLengthM: 5,
          positionXM: 4.2,
          positionYM: 3.1,
          rotationDeg: 0,
          colorToken: "sage",
          rationale: [],
          qualityScore: 80,
          placementReady: true,
          source: {
            recommendationScore: 76,
            reasoning: "B",
            highlights: [],
          },
        },
      ],
    );

    expect(evaluation.summary.outOfBoundsCount).toBeGreaterThan(0);
    expect(evaluation.summary.collisionCount).toBeGreaterThan(0);
  });
});
