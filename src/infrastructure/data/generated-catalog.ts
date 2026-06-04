import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";

import { GeneratedCatalogData } from "@/import/catalog/types";
import { slugify } from "@/shared/utils/slugify";

const catalogDataPath = path.join(process.cwd(), "generated", "catalog-data.json");

export const getGeneratedCatalogData = cache(async (): Promise<GeneratedCatalogData> => {
  const raw = await fs.readFile(catalogDataPath, "utf8");
  return JSON.parse(raw) as GeneratedCatalogData;
});

function getProductBucketSlugs(
  product: GeneratedCatalogData["products"][number],
) {
  const slugs: string[] = [];

  if (product.categorySlug) {
    slugs.push(product.categorySlug);
  }

  if (product.categorySlug && product.subcategoryLabel) {
    slugs.push(`${product.categorySlug}--${slugify(product.subcategoryLabel)}`);
  }

  return slugs;
}

export const getGeneratedCatalogIndex = cache(async () => {
  const data = await getGeneratedCatalogData();
  const productBySlug = new Map<string, GeneratedCatalogData["products"][number]>();
  const productsByCategorySlug = new Map<
    string,
    GeneratedCatalogData["products"]
  >();
  const categoryBySlug = new Map<
    string,
    GeneratedCatalogData["categories"][number]
  >();

  data.categories.forEach((category) => {
    categoryBySlug.set(category.slug, category);
  });

  data.products.forEach((product) => {
    productBySlug.set(product.slug, product);

    getProductBucketSlugs(product).forEach((slug) => {
      const existing = productsByCategorySlug.get(slug) ?? [];
      existing.push(product);
      productsByCategorySlug.set(slug, existing);
    });
  });

  return {
    data,
    productBySlug,
    productsByCategorySlug,
    categoryBySlug,
  };
});

export async function getCatalogCategories() {
  const { data } = await getGeneratedCatalogIndex();
  return data.categories;
}

export async function getCatalogProducts() {
  const { data } = await getGeneratedCatalogIndex();
  return data.products;
}

export async function getProposalScenarios() {
  const { data } = await getGeneratedCatalogIndex();
  return data.proposalScenarios;
}

export async function getCatalogProductBySlug(slug: string) {
  const { productBySlug } = await getGeneratedCatalogIndex();
  return productBySlug.get(slug);
}

export async function getCatalogProductsByCategorySlug(categorySlug: string) {
  const { productsByCategorySlug } = await getGeneratedCatalogIndex();
  return productsByCategorySlug.get(categorySlug) ?? [];
}

export async function getCatalogCategoryBySlug(categorySlug: string) {
  const { categoryBySlug } = await getGeneratedCatalogIndex();
  return categoryBySlug.get(categorySlug);
}
