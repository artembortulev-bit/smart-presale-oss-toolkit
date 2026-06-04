import { describe, expect, it } from "vitest";

import {
  buildProductCostCatalog,
  resolveProductCosting,
} from "@/application/costing/product-cost-engine";
import { ProductCostImportResult } from "@/application/costing/types";

const imported: ProductCostImportResult = {
  workbookPath: "C:\\test\\product-costs.xlsx",
  records: [
    {
      articleNormalized: "СКП.001",
      articleRaw: "СКП.001",
      name: "Скейт-фигура 1",
      categoryName: "Скейт парк",
      sectionLabel: "Серия тест",
      seriesName: "Серия тест",
      sizeLabel: "2x1x1",
      sheetName: "Скейт парк",
      rowNumber: 4,
      costDateLabel: "01.04.2026",
      rawCostValue: "600000",
      priceVariants: [
        {
          material: "STANDARD",
          clientPriceRub: 1000000,
        },
      ],
      costVariants: [
        {
          material: "STANDARD",
          costRub: 600000,
        },
      ],
    },
    {
      articleNormalized: "СКП.002",
      articleRaw: "СКП.002",
      name: "Скейт-фигура 2",
      categoryName: "Скейт парк",
      sectionLabel: "Серия тест",
      seriesName: "Серия тест",
      sizeLabel: "3x1x1",
      sheetName: "Скейт парк",
      rowNumber: 5,
      costDateLabel: "01.04.2026",
      rawCostValue: "750000",
      priceVariants: [
        {
          material: "STANDARD",
          clientPriceRub: 1250000,
        },
      ],
      costVariants: [
        {
          material: "STANDARD",
          costRub: 750000,
        },
      ],
    },
  ],
  issues: [],
  sheetSummaries: [
    {
      sheetName: "Скейт парк",
      categoryName: "Скейт парк",
      rows: 10,
      records: 2,
      recordsWithCost: 2,
      recordsWithMaterialCosts: 0,
    },
  ],
  summary: {
    sheets: 1,
    records: 2,
    recordsWithCost: 2,
    coverageRatio: 1,
  },
};

describe("product-cost-engine", () => {
  it("returns direct costing when article is matched exactly", () => {
    const catalog = buildProductCostCatalog(imported);

    const costing = resolveProductCosting(
      {
        article: "СКП.001",
        articleNormalized: "СКП.001",
        name: "Скейт-фигура 1",
        categoryName: "Скейт парк",
        seriesName: "Серия тест",
        basePriceRub: 1000000,
        prices: [
          {
            material: "STANDARD",
            level: "BASE",
            amountRub: 1000000,
          },
        ],
      },
      catalog,
    );

    expect(costing?.availability).toBe("DIRECT");
    expect(costing?.defaultCostRub).toBe(600000);
    expect(costing?.defaultMarginRub).toBe(400000);
    expect(costing?.confidence).toBe(1);
  });

  it("infers costing from category/prefix rules when direct cost is missing", () => {
    const catalog = buildProductCostCatalog(imported);

    const costing = resolveProductCosting(
      {
        article: "СКП.099",
        articleNormalized: "СКП.099",
        name: "Скейт-фигура 99",
        categoryName: "Скейт парк",
        seriesName: "Серия тест",
        basePriceRub: 2000000,
        prices: [
          {
            material: "STANDARD",
            level: "BASE",
            amountRub: 2000000,
          },
        ],
      },
      catalog,
    );

    expect(costing?.availability).toBe("INFERRED");
    expect(costing?.defaultCostRub).toBe(1200000);
    expect(costing?.defaultMarginRub).toBe(800000);
    expect(costing?.confidence).toBeGreaterThan(0.7);
  });
});
