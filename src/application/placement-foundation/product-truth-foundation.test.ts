import { describe, expect, it } from "vitest";

import { buildProductTruthFoundation } from "@/application/placement-foundation/product-truth-foundation";
import { GeneratedProduct } from "@/import/catalog/types";

function createProduct(overrides: Partial<GeneratedProduct>): GeneratedProduct {
  return {
    id: overrides.id ?? overrides.article ?? "product-id",
    slug: overrides.slug ?? (overrides.article ?? "product-id").toLowerCase(),
    article: overrides.article ?? "ART-001",
    articleNormalized:
      overrides.articleNormalized ?? (overrides.article ?? "ART-001"),
    name: overrides.name ?? "Тестовый товар",
    classLabel: overrides.classLabel,
    categorySlug: overrides.categorySlug ?? "test-category",
    categoryName: overrides.categoryName ?? "Игровые комплексы",
    subcategoryLabel: overrides.subcategoryLabel ?? "Тестовая подкатегория",
    seriesName: overrides.seriesName ?? "Neo-Eco",
    description: overrides.description,
    materials: overrides.materials ?? ["Дерево", "HDPE"],
    ageLabel: overrides.ageLabel ?? "3-10 лет",
    ageMinYears: overrides.ageMinYears,
    ageMaxYears: overrides.ageMaxYears,
    lengthM: overrides.lengthM,
    widthM: overrides.widthM,
    heightM: overrides.heightM,
    sizeLabel: overrides.sizeLabel,
    weightKg: overrides.weightKg,
    volumeM3: overrides.volumeM3,
    basePriceRub: "basePriceRub" in overrides ? overrides.basePriceRub : 640_000,
    imageUrl: overrides.imageUrl ?? "/test-image.png",
    gallery: overrides.gallery ?? [],
    tags: overrides.tags ?? ["Премиум", "Эко"],
    costing:
      "costing" in overrides
        ? overrides.costing
        : {
            availability: "DIRECT",
            confidence: 0.84,
            confidenceLabel: "direct",
            basis: ["direct article match"],
            defaultMaterial: "STANDARD",
            defaultClientPriceRub:
              "basePriceRub" in overrides ? overrides.basePriceRub : 640_000,
            defaultCostRub: 310_000,
            defaultMarginRub: 330_000,
            defaultMarginPercent: 51.5,
            variants: [],
          },
    metadata: overrides.metadata ?? {},
    prices: overrides.prices ?? [],
    assets: overrides.assets ?? [],
    variants: overrides.variants ?? [],
    rawSources:
      overrides.rawSources ??
      [
        { source: "BITRIX", sourceRecordId: "1" },
        { source: "PRICE_PREMIUM", sourceSheet: "Игровые комплексы", sourceRow: 12 },
      ],
    externalCode: overrides.externalCode,
  };
}

describe("buildProductTruthFoundation", () => {
  it("derives placement footprint, safety envelope and quality status", () => {
    const foundation = buildProductTruthFoundation([
      createProduct({
        article: "ИК.ТЕСТ01",
        name: 'Игровой комплекс "Тест"',
        categoryName: "Игровые комплексы",
        widthM: 4.2,
        lengthM: 5.6,
        heightM: 3.1,
        metadata: {
          threeD: {
            status: "PENDING_CONVERSION",
            sourceMaxFiles: ["model.max"],
            sourceDwgFiles: ["plan.dwg"],
            previewImages: ["/preview.png"],
          },
        },
      }),
    ]);

    const product = foundation.products[0]!;

    expect(product.derived.footprintWidthM).toBe(4.2);
    expect(product.derived.safetyZone.ruleId).toBe("playground-complex-envelope");
    expect(product.derived.safetyZone.widthM).toBeGreaterThan(4.2);
    expect(product.assets.threeDStatus).toBe("SOURCE_READY");
    expect(product.assets.hasDwg).toBe(true);
    expect(product.quality.score).toBeGreaterThanOrEqual(80);
    expect(product.quality.placementReady).toBe(true);
  });

  it("flags products with missing dimensions and missing commercial layer", () => {
    const foundation = buildProductTruthFoundation([
      createProduct({
        article: "МАФ.ТЕСТ02",
        name: "Скамья без габаритов",
        categoryName: "МАФ",
        widthM: undefined,
        lengthM: undefined,
        basePriceRub: undefined,
        imageUrl: undefined,
        materials: [],
        ageLabel: undefined,
        costing: undefined,
        rawSources: [{ source: "BITRIX", sourceRecordId: "2" }],
      }),
    ]);

    const product = foundation.products[0]!;

    expect(product.quality.flags).toContain("missing_dimensions");
    expect(product.quality.flags).toContain("missing_base_price");
    expect(product.quality.flags).toContain("missing_costing");
    expect(product.quality.status).toBe("NEEDS_DATA");
    expect(product.quality.placementReady).toBe(false);
  });

  it("builds a first-wave selection with priority items from key categories", () => {
    const products = [
      createProduct({
        article: "ИК.001",
        name: "Игровой комплекс 1",
        categoryName: "Игровые комплексы",
        widthM: 5,
        lengthM: 6,
        heightM: 3,
      }),
      createProduct({
        article: "ИЭ.001",
        name: "Горка 1",
        categoryName: "Игровые элементы",
        widthM: 1.2,
        lengthM: 3.2,
        heightM: 2.4,
      }),
      createProduct({
        article: "КК.001",
        name: "Канатный комплекс 1",
        categoryName: "Канатные комплексы",
        widthM: 4.8,
        lengthM: 4.6,
        heightM: 3.3,
      }),
    ];

    const foundation = buildProductTruthFoundation(products, 3);

    expect(foundation.firstWave).toHaveLength(3);
    expect(foundation.firstWave.some((item) => item.categoryName === "Игровые комплексы")).toBe(true);
    expect(foundation.firstWave.some((item) => item.categoryName === "Игровые элементы")).toBe(true);
    expect(foundation.firstWaveSummary.selectedCount).toBe(3);
  });
});
