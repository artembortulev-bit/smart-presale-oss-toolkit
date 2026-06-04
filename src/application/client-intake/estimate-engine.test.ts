import { describe, expect, it } from "vitest";

import {
  buildClientRequestEstimate,
  buildClientRequestModelBrief,
} from "@/application/client-intake/estimate-engine";
import { ClientRequestSubmission } from "@/application/client-intake/types";
import { GeneratedProduct } from "@/import/catalog/types";

function createProduct(overrides: Partial<GeneratedProduct>): GeneratedProduct {
  return {
    id: overrides.id ?? overrides.article ?? "product-id",
    slug: overrides.slug ?? (overrides.article ?? "product-id").toLowerCase(),
    article: overrides.article ?? "ART-001",
    articleNormalized: overrides.articleNormalized ?? (overrides.article ?? "ART-001"),
    name: overrides.name ?? "Тестовый товар",
    classLabel: overrides.classLabel,
    categorySlug: overrides.categorySlug ?? "test-category",
    categoryName: overrides.categoryName ?? "Игровые комплексы",
    subcategoryLabel: overrides.subcategoryLabel ?? "Тестовая подкатегория",
    seriesName: overrides.seriesName ?? "Neo-Eco",
    description: overrides.description,
    materials: overrides.materials ?? ["Дерево", "HDPE"],
    ageLabel: overrides.ageLabel,
    ageMinYears: overrides.ageMinYears,
    ageMaxYears: overrides.ageMaxYears,
    lengthM: overrides.lengthM,
    widthM: overrides.widthM,
    heightM: overrides.heightM,
    sizeLabel: overrides.sizeLabel,
    weightKg: overrides.weightKg,
    volumeM3: overrides.volumeM3,
    basePriceRub: overrides.basePriceRub ?? 420_000,
    imageUrl: overrides.imageUrl,
    gallery: overrides.gallery ?? [],
    tags: overrides.tags ?? ["Игровые комплексы", "Премиум"],
    costing: overrides.costing ?? {
      availability: "DIRECT",
      confidence: 0.84,
      confidenceLabel: "direct",
      basis: ["direct article match"],
      defaultMaterial: "STANDARD",
      defaultClientPriceRub: overrides.basePriceRub ?? 420_000,
      defaultCostRub: 188_000,
      defaultMarginRub: 232_000,
      defaultMarginPercent: 55,
      variants: [],
    },
    metadata: overrides.metadata ?? {},
    prices: overrides.prices ?? [],
    assets: overrides.assets ?? [],
    variants: overrides.variants ?? [],
    rawSources: overrides.rawSources ?? [],
    externalCode: overrides.externalCode,
  };
}

describe("buildClientRequestEstimate", () => {
  it("builds a preliminary estimate for a slide request", () => {
    const input: ClientRequestSubmission = {
      customerName: "Тестовый заказчик",
      companyName: "Тест Девелопмент",
      email: "test@example.com",
      phone: undefined,
      projectName: "Горка на склон",
      location: "Москва",
      objectType: "SLIDE",
      segment: "OPTIMUM",
      widthM: 1.4,
      lengthM: 4.2,
      heightM: 2.3,
      targetBudgetRub: 850_000,
      needsDelivery: true,
      needsInstallation: true,
      notes: "Нужно повторить форму ската и металлические опоры",
    };

    const estimate = buildClientRequestEstimate(input, 3);

    expect(estimate.equipmentRub).toBeGreaterThan(0);
    expect(estimate.deliveryRub).toBeGreaterThan(0);
    expect(estimate.installationRub).toBeGreaterThan(0);
    expect(estimate.estimatedMaxRub).toBeGreaterThan(estimate.estimatedMinRub);
    expect(estimate.notes.join(" ")).toContain("Черновой расчет");
    expect(estimate.waitingForMaterialMatrix).toBe(true);
  });

  it("builds a 3D brief for a custom request without exact dimensions", () => {
    const input: ClientRequestSubmission = {
      customerName: "Тестовый заказчик",
      companyName: undefined,
      email: undefined,
      phone: "+7 900 000-00-00",
      projectName: undefined,
      location: undefined,
      objectType: "CUSTOM",
      segment: "PREMIUM",
      widthM: undefined,
      lengthM: undefined,
      heightM: undefined,
      targetBudgetRub: undefined,
      needsDelivery: false,
      needsInstallation: false,
      notes: "Нестандартный объект с канатами и декоративными панелями",
    };

    const estimate = buildClientRequestEstimate(input, 4);
    const brief = buildClientRequestModelBrief(input, estimate, 4);

    expect(brief.sceneKind).toBe("PLAYGROUND");
    expect(brief.hotspots).toHaveLength(3);
    expect(brief.summary).toContain("proxy twin");
  });

  it("uses catalog benchmarks when similar products with costing are available", () => {
    const input: ClientRequestSubmission = {
      customerName: "Тестовый заказчик",
      companyName: "Тест Девелопмент",
      email: "test@example.com",
      phone: undefined,
      projectName: "Эко-комплекс для дачи",
      location: "Москва",
      objectType: "PLAYGROUND_COMPLEX",
      segment: "PREMIUM",
      widthM: 4.8,
      lengthM: 5.2,
      heightM: 2.9,
      targetBudgetRub: 950_000,
      needsDelivery: true,
      needsInstallation: true,
      notes: "Нужна площадка из экологичных материалов, желательно дерево и без песочницы",
    };

    const estimate = buildClientRequestEstimate(input, 4, [
      createProduct({
        article: "ЭКО.П001",
        name: "Эко игровой комплекс для дачи",
        categoryName: "Игровые комплексы",
        materials: ["Дерево", "HDPE"],
        lengthM: 4.4,
        widthM: 4.8,
        heightM: 3,
        basePriceRub: 640_000,
        tags: ["Игровые комплексы", "Премиум", "Эко", "Для дачи"],
      }),
      createProduct({
        article: "ЭКО.П002",
        name: "Игровой комплекс Neo-Eco",
        categoryName: "Игровые комплексы",
        materials: ["Робиния", "HDPE"],
        lengthM: 4.6,
        widthM: 5,
        heightM: 3.1,
        basePriceRub: 710_000,
        tags: ["Игровые комплексы", "Премиум", "Эко", "Для дачи"],
      }),
      createProduct({
        article: "ДГ.ПРМ17",
        name: "Игровой комплекс с домиком",
        categoryName: "Игровые комплексы",
        materials: ["Дерево", "HDPE"],
        lengthM: 4.5,
        widthM: 5.1,
        heightM: 3.2,
        basePriceRub: 760_000,
        tags: ["Игровые комплексы", "Премиум", "Домик"],
      }),
    ]);

    expect(estimate.method).not.toBe("HEURISTIC");
    expect(estimate.benchmarkSourceCount).toBeGreaterThan(0);
    expect(estimate.benchmarkProducts).toHaveLength(3);
    expect(estimate.notes.join(" ")).toContain("каталож");
    expect(estimate.equipmentRub).toBeGreaterThan(500_000);
    expect(estimate.equipmentRub).toBeLessThan(900_000);
  });

  it("filters oversized outliers and refines a playground request to a slide when photo hints say so", () => {
    const input: ClientRequestSubmission = {
      customerName: "Тестовый заказчик",
      companyName: "Тест Девелопмент",
      email: "test@example.com",
      phone: undefined,
      projectName: "Горка для участка",
      location: "Москва",
      objectType: "PLAYGROUND_COMPLEX",
      segment: "PREMIUM",
      widthM: 5,
      lengthM: 4,
      heightM: 3,
      targetBudgetRub: undefined,
      needsDelivery: true,
      needsInstallation: true,
      notes: "Нужна небольшая горка для дачи из эко-материалов, без песочницы",
    };

    const estimate = buildClientRequestEstimate(
      input,
      1,
      [
        createProduct({
          article: "BIG-001",
          name: "Большой игровой комплекс премиум",
          categoryName: "Игровые комплексы",
          materials: ["Дерево", "HDPE"],
          lengthM: 8.8,
          widthM: 4.5,
          heightM: 3.4,
          basePriceRub: 2_200_000,
          tags: ["Игровые комплексы", "Премиум", "Эко"],
        }),
        createProduct({
          article: "SLIDE-001",
          name: "Горка Neo-Eco",
          categoryName: "Игровые элементы",
          materials: ["Дерево", "HDPE"],
          lengthM: 3.1,
          widthM: 1.1,
          heightM: 2.8,
          basePriceRub: 310_000,
          tags: ["Игровые элементы", "Премиум", "Эко"],
        }),
        createProduct({
          article: "SLIDE-002",
          name: "Горка Эко-play",
          categoryName: "Игровые элементы",
          materials: ["Робиния", "HDPE"],
          lengthM: 3.8,
          widthM: 1.2,
          heightM: 3,
          basePriceRub: 365_000,
          tags: ["Игровые элементы", "Премиум", "Эко"],
        }),
      ],
      ["gorka-reference.jpg"],
    );

    expect(estimate.resolvedObjectType).toBe("SLIDE");
    expect(estimate.benchmarkProducts.some((product) => product.article === "BIG-001")).toBe(false);
    expect(estimate.equipmentRub).toBeLessThan(700_000);
  });
});
