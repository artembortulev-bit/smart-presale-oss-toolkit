import { describe, expect, it } from "vitest";

import {
  buildSelectionRecommendation,
  SelectionInput,
} from "@/application/selection/recommendation-engine";
import { GeneratedProduct } from "@/import/catalog/types";

function buildProduct(overrides: Partial<GeneratedProduct>): GeneratedProduct {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    slug: overrides.slug ?? "demo-product",
    article: overrides.article ?? "ART-001",
    articleNormalized: overrides.articleNormalized ?? "ART001",
    name: overrides.name ?? "Демо товар",
    categoryName: overrides.categoryName ?? "Игровые комплексы",
    materials: overrides.materials ?? [],
    gallery: overrides.gallery ?? [],
    tags: overrides.tags ?? [],
    metadata: overrides.metadata ?? {},
    prices: overrides.prices ?? [],
    assets: overrides.assets ?? [],
    variants: overrides.variants ?? [],
    rawSources: overrides.rawSources ?? [],
    ...overrides,
  };
}

const catalog: GeneratedProduct[] = [
  buildProduct({
    id: "eco-complex",
    slug: "eco-complex",
    article: "ЭКО-001",
    name: "Эко игровой комплекс для дачи",
    categoryName: "Игровые комплексы",
    materials: ["Дерево", "HDPE"],
    ageLabel: "3-12 лет",
    widthM: 3.8,
    lengthM: 4.3,
    sizeLabel: "3,8х4,3х2,9 м",
    basePriceRub: 420_000,
    imageUrl: "/images/eco-complex.jpg",
  }),
  buildProduct({
    id: "sandbox",
    slug: "sandbox",
    article: "ПС-001",
    name: "Песочница деревянная",
    categoryName: "Игровые элементы",
    materials: ["Дерево"],
    ageLabel: "2-6 лет",
    widthM: 2,
    lengthM: 2,
    sizeLabel: "2х2 м",
    basePriceRub: 95_000,
  }),
  buildProduct({
    id: "large-complex",
    slug: "large-complex",
    article: "ГК-900",
    name: "Большой игровой комплекс",
    categoryName: "Игровые комплексы",
    materials: ["Металл", "HDPE"],
    ageLabel: "5-12 лет",
    widthM: 7,
    lengthM: 8,
    sizeLabel: "7х8 м",
    basePriceRub: 980_000,
  }),
  buildProduct({
    id: "metal-swing",
    slug: "metal-swing",
    article: "КАЧ-101",
    name: "Качели дворовые металлические",
    categoryName: "Игровые элементы",
    materials: ["Металл"],
    ageLabel: "4-12 лет",
    widthM: 2.4,
    lengthM: 3.2,
    sizeLabel: "2,4х3,2 м",
    basePriceRub: 220_000,
  }),
  buildProduct({
    id: "mini-complex",
    slug: "mini-complex",
    article: "МИНИ-010",
    name: "Мини игровой комплекс",
    categoryName: "Игровые комплексы",
    materials: ["Дерево", "Фанера"],
    ageLabel: "2-6 лет",
    widthM: 2.8,
    lengthM: 3.4,
    sizeLabel: "2,8х3,4 м",
    basePriceRub: 285_000,
  }),
  buildProduct({
    id: "municipal-complex",
    slug: "municipal-complex",
    article: "МУН-200",
    name: "Антивандальный игровой комплекс для двора",
    categoryName: "Игровые комплексы",
    materials: ["Металл", "HDPE", "HPL"],
    ageLabel: "5-12 лет",
    widthM: 4.5,
    lengthM: 5,
    sizeLabel: "4,5х5 м",
    basePriceRub: 1_100_000,
    imageUrl: "/images/municipal-complex.jpg",
  }),
  buildProduct({
    id: "kindergarten-safe",
    slug: "kindergarten-safe",
    article: "САД-100",
    name: "Безопасный игровой комплекс для малышей",
    categoryName: "Оборудование для детских садов",
    materials: ["Дерево", "HPL"],
    ageLabel: "2-6 лет",
    widthM: 3.1,
    lengthM: 3.9,
    sizeLabel: "3,1х3,9 м",
    basePriceRub: 360_000,
  }),
  buildProduct({
    id: "high-slide",
    slug: "high-slide",
    article: "ГОР-777",
    name: "Высокая горка для двора",
    categoryName: "Игровые элементы",
    materials: ["Металл", "HDPE"],
    ageLabel: "5-12 лет",
    widthM: 2,
    lengthM: 5.2,
    heightM: 2.4,
    sizeLabel: "2х5,2х2,4 м",
    basePriceRub: 310_000,
  }),
];

describe("buildSelectionRecommendation", () => {
  it("uses text wishes as a first-class signal for a dacha eco scenario", async () => {
    const input: SelectionInput = {
      objectType: "playground",
      segment: "OPTIMUM",
      wishes:
        "Детская площадка из экологичных материалов для дачи 4 на 5 метра, для детей от трех лет, на вырост, без песочницы.",
      clientType: "Частный дом",
      needsDelivery: true,
      needsInstallation: true,
    };

    const recommendation = await buildSelectionRecommendation(input, {
      products: catalog,
    });

    expect(recommendation.constraints.widthM).toBe(4);
    expect(recommendation.constraints.lengthM).toBe(5);
    expect(recommendation.recognizedPreferences.map((chip) => chip.label)).toEqual(
      expect.arrayContaining(["для дачи", "эко-материалы", "на вырост", "без песочницы"]),
    );
    expect(recommendation.items.some((item) => item.product.id === "eco-complex")).toBe(true);
    expect(recommendation.items.some((item) => item.product.id === "sandbox")).toBe(false);
    expect(recommendation.items.some((item) => item.product.id === "large-complex")).toBe(false);
    expect(recommendation.rationale).toContain("с учетом");
  });

  it("excludes high slides and prefers compact wooden products for a small private site", async () => {
    const recommendation = await buildSelectionRecommendation(
      {
        objectType: "playground",
        segment: "OPTIMUM",
        wishes:
          "Нужна компактная площадка для частного дома, детям 2-6 лет, желательно дерево, без высоких горок.",
        clientType: "Частный дом",
        needsDelivery: false,
        needsInstallation: false,
      },
      { products: catalog },
    );

    const ids = recommendation.items.map((item) => item.product.id);

    expect(ids).toContain("mini-complex");
    expect(ids).toContain("kindergarten-safe");
    expect(ids).not.toContain("high-slide");
    expect(recommendation.items[0]?.highlights.join(" ")).toMatch(/компакт|дерев|возраст/i);
  });

  it("prefers anti-vandal municipal products when the request says so", async () => {
    const recommendation = await buildSelectionRecommendation(
      {
        objectType: "playground",
        segment: "PREMIUM",
        budgetRub: 2_000_000,
        wishes:
          "Муниципальная игровая площадка для двора ЖК, антивандальная, для детей 5+, бюджет до 2 млн",
        clientType: "Муниципальный заказчик",
        needsDelivery: true,
        needsInstallation: true,
      },
      { products: catalog },
    );

    expect(recommendation.items[0]?.product.id).toBe("municipal-complex");
    expect(recommendation.constraints.usageContexts).toEqual(
      expect.arrayContaining(["municipal", "residential_courtyard"]),
    );
    expect(recommendation.constraints.antiVandalPreference).toBe(true);
  });
});
