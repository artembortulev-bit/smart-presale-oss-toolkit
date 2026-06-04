import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";

import { ProductTruthFoundation } from "@/application/placement-foundation/types";

const productTruthPath = path.join(process.cwd(), "generated", "product-truth-foundation.json");

export const getGeneratedProductTruthFoundation = cache(
  async (): Promise<ProductTruthFoundation | null> => {
    try {
      const raw = await fs.readFile(productTruthPath, "utf8");
      return JSON.parse(raw) as ProductTruthFoundation;
    } catch {
      return null;
    }
  },
);

export const getGeneratedProductTruthIndex = cache(async () => {
  const foundation = await getGeneratedProductTruthFoundation();

  if (!foundation) {
    return null;
  }

  const productByArticleNormalized = new Map(
    foundation.products.map((product) => [product.articleNormalized, product]),
  );
  const productBySlug = new Map(
    foundation.products.map((product) => [product.slug, product]),
  );

  return {
    foundation,
    productByArticleNormalized,
    productBySlug,
  };
});
