import Decimal from "decimal.js";

import { resolveProductCosting, } from "@/application/costing/product-cost-engine";
import { ProductCostCatalog } from "@/application/costing/types";
import { segmentByCategoryName } from "@/domain/catalog/constants";
import { ThreeDAssetRegistry } from "@/import/3d/import-3d-assets";
import { GeneratedCatalogData, GeneratedCategory, GeneratedProduct, GeneratedVariant } from "@/import/catalog/types";
import {
  firstDefined,
  normalizeCode,
  uniqueStrings,
} from "@/import/shared/normalizers";
import { ImportBundle, PriceEntryDraft, SourceProductDraft } from "@/import/shared/types";
import { slugify } from "@/shared/utils/slugify";

const identityPriority = ["BITRIX", "PRICE_PREMIUM", "PRICE_OPTIMUM"] as const;
const pricePriority = ["PRICE_PREMIUM", "PRICE_OPTIMUM", "BITRIX"] as const;

function decimalToNumber(value?: Decimal | null) {
  return value ? value.toNumber() : undefined;
}

function buildSemanticSignature(item: SourceProductDraft) {
  return slugify(
    [item.categoryName, item.subcategoryLabel, item.name]
      .filter(Boolean)
      .join("|"),
  );
}

function sortByPriority<T extends { source: string }>(items: T[], priority: readonly string[]) {
  return [...items].sort(
    (left, right) =>
      priority.indexOf(left.source) - priority.indexOf(right.source),
  );
}

function dedupePrices(prices: PriceEntryDraft[]) {
  const unique = new Map<string, PriceEntryDraft>();

  sortByPriority(prices, pricePriority).forEach((price) => {
    const key = `${price.material}:${price.level}`;
    if (!unique.has(key)) {
      unique.set(key, price);
    }
  });

  return Array.from(unique.values()).map((price) => ({
    material: price.material,
    level: price.level,
    amountRub: price.amountRub.toNumber(),
    source: price.source,
    sourceLabel: price.sourceLabel,
  }));
}

function buildVariantKey(groupItems: SourceProductDraft[]) {
  const meaningfulExternalCodes = uniqueStrings(
    groupItems.map((item) => {
      const externalCode = normalizeCode(item.externalCode);
      if (!externalCode || externalCode === item.articleNormalized) {
        return undefined;
      }

      return externalCode;
    }),
  );

  if (meaningfulExternalCodes.length > 1) {
    return (item: SourceProductDraft) =>
      normalizeCode(item.externalCode) || item.articleNormalized || "default";
  }

  const sizeLabels = uniqueStrings(groupItems.map((item) => item.sizeLabel));

  if (sizeLabels.length > 1) {
    return (item: SourceProductDraft) => slugify(item.sizeLabel ?? "default");
  }

  return () => "default";
}

function mergeVariant(
  productId: string,
  groupKey: string,
  items: SourceProductDraft[],
): GeneratedVariant {
  const ordered = sortByPriority(items, identityPriority);
  const primary = ordered[0]!;
  const prices = dedupePrices(items.flatMap((item) => item.prices));
  const assets = uniqueStrings(items.map((item) => item.imageUrl)).map((url, index) => {
    const kind: GeneratedVariant["assets"][number]["kind"] =
      index === 0 ? "PRIMARY_IMAGE" : "GALLERY_IMAGE";

    return {
      kind,
      url,
    };
  });

  return {
    id: `${productId}-variant-${groupKey}`,
    variantKey: groupKey,
    displayName:
      firstDefined(ordered.map((item) => item.name)) ??
      primary.articleNormalized ??
      productId,
    externalCode: firstDefined(ordered.map((item) => item.externalCode)),
    sizeLabel: firstDefined(ordered.map((item) => item.sizeLabel)),
    lengthM: decimalToNumber(firstDefined(ordered.map((item) => item.lengthM))),
    widthM: decimalToNumber(firstDefined(ordered.map((item) => item.widthM))),
    heightM: decimalToNumber(firstDefined(ordered.map((item) => item.heightM))),
    weightKg: decimalToNumber(firstDefined(ordered.map((item) => item.weightKg))),
    volumeM3: decimalToNumber(firstDefined(ordered.map((item) => item.volumeM3))),
    imageUrl: firstDefined(ordered.map((item) => item.imageUrl)),
    prices,
    assets,
  };
}

function createCategories(products: GeneratedProduct[]) {
  const categories = new Map<string, GeneratedCategory>();

  products.forEach((product) => {
    if (!product.categoryName || !product.categorySlug) {
      return;
    }

    if (!categories.has(product.categorySlug)) {
      categories.set(product.categorySlug, {
        id: `category-${product.categorySlug}`,
        slug: product.categorySlug,
        name: product.categoryName,
        segmentKey: segmentByCategoryName[product.categoryName],
      });
    }

    if (!product.subcategoryLabel) {
      return;
    }

    const subcategorySlug = `${product.categorySlug}--${slugify(product.subcategoryLabel)}`;

    if (!categories.has(subcategorySlug)) {
      categories.set(subcategorySlug, {
        id: `category-${subcategorySlug}`,
        slug: subcategorySlug,
        name: product.subcategoryLabel,
        parentSlug: product.categorySlug,
        segmentKey: segmentByCategoryName[product.categoryName],
      });
    }
  });

  return Array.from(categories.values()).sort((left, right) =>
    left.slug.localeCompare(right.slug, "ru"),
  );
}

export function mergeCatalogData(
  bundles: ImportBundle[],
  proposalScenarios: GeneratedCatalogData["proposalScenarios"],
  threeDRegistry?: ThreeDAssetRegistry,
  productCostCatalog?: ProductCostCatalog,
): GeneratedCatalogData {
  const allItems = bundles.flatMap((bundle) => bundle.items);
  const issues = bundles.flatMap((bundle) => bundle.issues);
  const grouped = new Map<string, SourceProductDraft[]>();
  const semanticRealArticleIndex = new Map<string, string>();

  allItems.forEach((item) => {
    const rawArticle = normalizeCode(item.articleRaw);
    if (!rawArticle || !item.name || !item.articleNormalized) {
      return;
    }

    semanticRealArticleIndex.set(buildSemanticSignature(item), item.articleNormalized);
  });

  allItems.forEach((item) => {
    const rawArticle = normalizeCode(item.articleRaw);
    const semanticMatch =
      !rawArticle && item.name
        ? semanticRealArticleIndex.get(buildSemanticSignature(item))
        : undefined;
    const key = semanticMatch || item.articleNormalized || rawArticle;
    const existing = grouped.get(key) ?? [];
    existing.push(item);
    grouped.set(key, existing);
  });

  const threeDByArticle = new Map(
    (threeDRegistry?.records ?? []).map((record) => [record.articleNormalized, record] as const),
  );

  const products = Array.from(grouped.entries()).map(([articleNormalized, items]) => {
    const ordered = sortByPriority(items, identityPriority);
    const primary = ordered[0]!;
    const categoryName = firstDefined(ordered.map((item) => item.categoryName));
    const categorySlug = categoryName ? slugify(categoryName) : undefined;
    const subcategoryLabel = firstDefined(ordered.map((item) => item.subcategoryLabel));
    const seriesName = firstDefined(ordered.map((item) => item.seriesName));
    const imageUrl = firstDefined(ordered.map((item) => item.imageUrl));
    const prices = dedupePrices(items.flatMap((item) => item.prices));
    const variantKeyResolver = buildVariantKey(items);
    const variantsGrouped = new Map<string, SourceProductDraft[]>();

    items.forEach((item) => {
      const variantKey = variantKeyResolver(item);
      const existing = variantsGrouped.get(variantKey) ?? [];
      existing.push(item);
      variantsGrouped.set(variantKey, existing);
    });

    const productId = `product-${slugify(articleNormalized.toLowerCase())}`;
    const variants = Array.from(variantsGrouped.entries()).map(([variantKey, groupItems]) =>
      mergeVariant(productId, variantKey, groupItems),
    );
    const threeDRecord = threeDByArticle.get(articleNormalized);
    const mergedGallery = uniqueStrings([
      ...ordered.map((item) => item.imageUrl),
      ...(threeDRecord?.previewUrls ?? []),
    ]);
    const resolvedImageUrl = firstDefined([
      firstDefined(ordered.map((item) => item.imageUrl)),
      threeDRecord?.previewUrls[0],
    ]);
    const modelUrl = threeDRecord?.webModelUrl ?? threeDRecord?.glbUrl;
    const threeDAssets = [
      ...(resolvedImageUrl
        ? [
            {
              kind: "PRIMARY_IMAGE" as const,
              url: resolvedImageUrl,
            },
          ]
        : []),
      ...((modelUrl
        ? [
            {
              kind: "MODEL_3D" as const,
              url: modelUrl,
              title: `${threeDRecord?.webModelFormat ?? "3D"} web model`,
              metadata: {
                status: threeDRecord?.glbStatus,
                format: threeDRecord?.webModelFormat,
                sourceFile: threeDRecord?.webModelSourceFile,
                materialUrl: threeDRecord?.materialUrl,
                supportingUrls: threeDRecord?.webModelSupportingUrls,
                sourceDirectory: threeDRecord?.sourceDirectories[0],
                sourceDirectories: threeDRecord?.sourceDirectories,
              },
            },
          ]
        : []) as GeneratedProduct["assets"]),
    ];

    const basePrice =
      prices.find((price) => price.level === "BASE" && price.material === "STANDARD")
        ?.amountRub ?? prices.find((price) => price.level === "BASE")?.amountRub;
    const costing = resolveProductCosting(
      {
        article: primary.articleRaw ?? articleNormalized,
        articleNormalized,
        name: firstDefined(ordered.map((item) => item.name)) ?? articleNormalized,
        categoryName,
        seriesName,
        basePriceRub: basePrice,
        prices,
      },
      productCostCatalog,
    );

    return {
      id: productId,
      slug: slugify(`${articleNormalized}-${primary.name ?? articleNormalized}`),
      article: primary.articleRaw ?? articleNormalized,
      articleNormalized,
      externalCode: firstDefined(ordered.map((item) => item.externalCode)),
      name: firstDefined(ordered.map((item) => item.name)) ?? articleNormalized,
      classLabel: firstDefined(ordered.map((item) => item.classLabel)),
      categorySlug,
      categoryName,
      subcategoryLabel,
      seriesName,
      description: firstDefined(ordered.map((item) => item.name)),
      materials: uniqueStrings(ordered.flatMap((item) => item.materials ?? [])),
      ageLabel: firstDefined(ordered.map((item) => item.ageLabel)),
      ageMinYears: firstDefined(ordered.map((item) => item.ageMinYears)),
      ageMaxYears: firstDefined(ordered.map((item) => item.ageMaxYears)),
      lengthM: decimalToNumber(firstDefined(ordered.map((item) => item.lengthM))),
      widthM: decimalToNumber(firstDefined(ordered.map((item) => item.widthM))),
      heightM: decimalToNumber(firstDefined(ordered.map((item) => item.heightM))),
      sizeLabel: firstDefined(ordered.map((item) => item.sizeLabel)),
      weightKg: decimalToNumber(firstDefined(ordered.map((item) => item.weightKg))),
      volumeM3: decimalToNumber(firstDefined(ordered.map((item) => item.volumeM3))),
      basePriceRub: basePrice,
      imageUrl: resolvedImageUrl,
      gallery: mergedGallery,
      tags: uniqueStrings([
        categoryName,
        subcategoryLabel,
        seriesName,
        firstDefined(ordered.map((item) => item.classLabel)),
        threeDRecord?.lifecycleStatus === "PUBLISHED"
          ? "3D Live"
          : threeDRecord?.lifecycleStatus === "ANNOTATED"
            ? "3D Annotated"
            : threeDRecord?.webModelUrl
              ? "3D Converted"
              : threeDRecord
                ? "3D Source"
                : undefined,
      ]),
      costing,
      metadata: {
        sourceCount: items.length,
        threeD: threeDRecord
          ? {
              status: threeDRecord.glbStatus,
              lifecycleStatus: threeDRecord.lifecycleStatus,
              workflowStage: threeDRecord.workflowStage,
              annotationStatus: threeDRecord.annotationStatus,
              publishStatus: threeDRecord.publishStatus,
              webModelUrl: threeDRecord.webModelUrl,
              webModelFormat: threeDRecord.webModelFormat,
              materialUrl: threeDRecord.materialUrl,
              webModelSupportingUrls: threeDRecord.webModelSupportingUrls,
              annotationManifestUrl: threeDRecord.annotationManifestUrl,
              annotationCount: threeDRecord.annotationCount,
              qualityGate: threeDRecord.qualityGate,
              sourceDirectory: threeDRecord.sourceDirectories[0],
              sourceDirectories: threeDRecord.sourceDirectories,
              previewImages: threeDRecord.previewUrls,
              sourceMaxFiles: threeDRecord.sourceMaxFiles,
              sourceDwgFiles: threeDRecord.sourceDwgFiles,
              sourceConvertibleFiles: threeDRecord.sourceConvertibleFiles,
            }
          : undefined,
      },
      prices,
      assets: threeDAssets,
      variants,
      rawSources: ordered.map((item) => ({
        source: item.source,
        sourceSheet: item.sourceSheet,
        sourceRow: item.sourceRow,
        sourceRecordId: item.sourceRecordId,
      })),
    } satisfies GeneratedProduct;
  });

  const categories = createCategories(products);
  const variantsCount = products.reduce(
    (total, product) => total + product.variants.length,
    0,
  );
  const directProducts = products.filter((product) => product.costing?.availability === "DIRECT").length;
  const inferredProducts = products.filter((product) => product.costing?.availability === "INFERRED").length;
  const withoutCost = products.length - directProducts - inferredProducts;

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      categories: categories.length,
      products: products.length,
      variants: variantsCount,
      issues: issues.length,
      costing: productCostCatalog
        ? {
            sourceRecords: productCostCatalog.summary.recordsWithCost,
            directProducts,
            inferredProducts,
            withoutCost,
            coverageRatio:
              products.length > 0
                ? Number(((directProducts + inferredProducts) / products.length).toFixed(4))
                : 0,
            rules: productCostCatalog.summary.rules,
          }
        : undefined,
    },
    categories,
    products: products.sort((left, right) => left.name.localeCompare(right.name, "ru")),
    issues,
    proposalScenarios,
  };
}
