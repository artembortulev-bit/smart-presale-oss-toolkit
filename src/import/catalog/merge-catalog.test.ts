import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { mergeCatalogData } from "@/import/catalog/merge-catalog";
import { ImportBundle } from "@/import/shared/types";

function createBundle(items: ImportBundle["items"]): ImportBundle {
  return {
    items,
    issues: [],
  };
}

describe("mergeCatalogData", () => {
  it("merges semantic matches from price rows without article into Bitrix products", () => {
    const bitrix = createBundle([
      {
        source: "BITRIX",
        articleRaw: "ДЕКОР-141",
        articleNormalized: "ДЕКОР-141",
        name: "Ангелочек девочка",
        categoryName: "Декор",
        subcategoryLabel: "Топиарные фигуры",
        prices: [
          {
            material: "STANDARD",
            level: "BASE",
            amountRub: new Decimal(65000),
            source: "BITRIX",
          },
        ],
        rawData: {},
        normalizedData: {},
      },
    ]);

    const price = createBundle([
      {
        source: "PRICE_PREMIUM",
        articleNormalized: "DEKOR-BASE-ANGELOCHEK-DEVOCHKA",
        name: "Ангелочек девочка",
        categoryName: "Декор",
        subcategoryLabel: "Топиарные фигуры",
        prices: [],
        rawData: {},
        normalizedData: {},
      },
    ]);

    const merged = mergeCatalogData([bitrix, price], []);

    expect(merged.products).toHaveLength(1);
    expect(merged.products[0]?.articleNormalized).toBe("ДЕКОР-141");
  });
});
