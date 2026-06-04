import {
  getCatalogCategoryBySlug,
  getCatalogCategories,
  getCatalogProductBySlug,
  getCatalogProducts,
  getCatalogProductsByCategorySlug,
} from "@/infrastructure/data/generated-catalog";
import { GeneratedCategory, GeneratedProduct } from "@/import/catalog/types";
import { formatPriceRub } from "@/shared/utils/money";

export type CatalogSort = "featured" | "name" | "price_asc" | "price_desc";

const DEFAULT_PAGE_SIZE = 24;

export type CatalogQueryInput = {
  q?: string;
  categorySlug?: string;
  material?: string;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
};

export async function getCatalogTree() {
  const categories = await getCatalogCategories();
  const childrenByParent = new Map<string, GeneratedCategory[]>();
  const roots: GeneratedCategory[] = [];

  categories.forEach((category) => {
    if (!category.parentSlug) {
      roots.push(category);
      return;
    }

    const existing = childrenByParent.get(category.parentSlug) ?? [];
    existing.push(category);
    childrenByParent.set(category.parentSlug, existing);
  });

  return roots.map((root) => ({
    ...root,
    children:
      childrenByParent
        .get(root.slug)
        ?.sort((left, right) => left.name.localeCompare(right.name, "ru")) ?? [],
  }));
}

function matchesQuery(product: GeneratedProduct, query?: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    product.article,
    product.name,
    product.categoryName,
    product.subcategoryLabel,
    product.seriesName,
    product.tags.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function matchesMaterial(product: GeneratedProduct, material?: string) {
  if (!material) {
    return true;
  }

  return product.materials.some(
    (value) => value.toLowerCase() === material.toLowerCase(),
  );
}

function sortProducts(products: GeneratedProduct[], sort: CatalogSort) {
  const items = [...products];

  switch (sort) {
    case "name":
      return items.sort((left, right) => left.name.localeCompare(right.name, "ru"));
    case "price_asc":
      return items.sort(
        (left, right) => (left.basePriceRub ?? Number.MAX_SAFE_INTEGER) - (right.basePriceRub ?? Number.MAX_SAFE_INTEGER),
      );
    case "price_desc":
      return items.sort(
        (left, right) => (right.basePriceRub ?? -1) - (left.basePriceRub ?? -1),
      );
    case "featured":
    default:
      return items.sort((left, right) => {
        if ((left.basePriceRub ?? 0) !== (right.basePriceRub ?? 0)) {
          return (right.basePriceRub ?? 0) - (left.basePriceRub ?? 0);
        }

        return left.name.localeCompare(right.name, "ru");
      });
  }
}

export async function queryCatalogProducts(input: CatalogQueryInput) {
  const products = input.categorySlug
    ? await getCatalogProductsByCategorySlug(input.categorySlug)
    : await getCatalogProducts();
  const sort = input.sort ?? "featured";
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;

  const filtered = products.filter(
    (product) =>
      matchesQuery(product, input.q) &&
      matchesMaterial(product, input.material),
  );

  const sorted = sortProducts(filtered, sort);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(input.page ?? 1, 1), totalPages);
  const start = (page - 1) * pageSize;
  const pagedProducts = sorted.slice(start, start + pageSize);

  const materials = Array.from(
    new Set(filtered.flatMap((product) => product.materials)),
  ).sort((left, right) => left.localeCompare(right, "ru"));

  return {
    products: pagedProducts,
    materials,
    total,
    page,
    pageSize,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

export async function getCatalogLandingData() {
  const [tree, products] = await Promise.all([getCatalogTree(), getCatalogProducts()]);

  return {
    tree,
    featuredProducts: products
      .filter((product) => product.imageUrl)
      .sort((left, right) => (right.basePriceRub ?? 0) - (left.basePriceRub ?? 0))
      .slice(0, 8),
    summary: {
      products: products.length,
      categories: tree.length,
    },
  };
}

export async function getProductDetail(productSlug: string) {
  const product = await getCatalogProductBySlug(productSlug);

  if (!product) {
    return null;
  }

  const products = product.categorySlug
    ? await getCatalogProductsByCategorySlug(product.categorySlug)
    : await getCatalogProducts();

  const relatedProducts = products
    .filter((candidate) => candidate.slug !== product.slug)
    .sort((left, right) => {
      const leftScore =
        (left.imageUrl ? 3 : 0) +
        (left.gallery.length > 0 ? 2 : 0) +
        (left.seriesName === product.seriesName ? 2 : 0) +
        (left.subcategoryLabel === product.subcategoryLabel ? 1 : 0);
      const rightScore =
        (right.imageUrl ? 3 : 0) +
        (right.gallery.length > 0 ? 2 : 0) +
        (right.seriesName === product.seriesName ? 2 : 0) +
        (right.subcategoryLabel === product.subcategoryLabel ? 1 : 0);

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      return (right.basePriceRub ?? 0) - (left.basePriceRub ?? 0);
    })
    .slice(0, 4);

  return {
    product,
    relatedProducts,
    primaryPriceLabel: formatPriceRub(product.basePriceRub),
  };
}

export async function getCategoryDetail(categorySlug: string) {
  return getCatalogCategoryBySlug(categorySlug);
}
