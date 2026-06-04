import {
  GeneratedProductCosting,
  ProductCostCatalog,
  ProductCostConfidenceLabel,
  ProductCostImportResult,
  ProductCostMaterial,
  ProductCostMergeReport,
  ProductCostRule,
  ProductCostRuleScope,
  ProductCostSourceRecord,
  ProductCostSourceVariant,
} from "@/application/costing/types";
import { slugify } from "@/shared/utils/slugify";

type CatalogPriceLike = {
  material: ProductCostMaterial;
  level: "BASE" | "DISCOUNT_10" | "DISCOUNT_20" | "DISCOUNT_30";
  amountRub: number;
};

type CostingProductLike = {
  article: string;
  articleNormalized: string;
  name: string;
  categoryName?: string;
  seriesName?: string;
  basePriceRub?: number;
  prices: CatalogPriceLike[];
};

type RatioSample = {
  scope: ProductCostRuleScope;
  material: ProductCostMaterial;
  categoryName?: string;
  seriesName?: string;
  articlePrefix?: string;
  costToPriceRatio: number;
};

type RuleMatch = {
  rule: ProductCostRule;
  confidenceLabel: ProductCostConfidenceLabel;
};

function round(value: number, digits = 4) {
  return Number(value.toFixed(digits));
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle]!;
  }

  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function getArticlePrefix(articleNormalized: string) {
  const match = articleNormalized.match(/^([A-ZА-ЯЁ]+)/u);
  return match?.[1];
}

function getDefaultMaterial(product: CostingProductLike) {
  return product.prices.find((price) => price.level === "BASE")?.material ?? "STANDARD";
}

function getBasePriceMap(prices: CatalogPriceLike[]) {
  const basePrices = prices.filter((price) => price.level === "BASE");
  const priceMap = new Map<ProductCostMaterial, number>();

  basePrices.forEach((price) => {
    if (!priceMap.has(price.material)) {
      priceMap.set(price.material, price.amountRub);
    }
  });

  return priceMap;
}

function calculateMargins(clientPriceRub?: number, costRub?: number) {
  if (clientPriceRub === undefined || costRub === undefined) {
    return {
      marginRub: undefined,
      marginPercent: undefined,
    };
  }

  const marginRub = round(clientPriceRub - costRub, 2);
  const marginPercent =
    clientPriceRub > 0 ? round((marginRub / clientPriceRub) * 100, 2) : undefined;

  return {
    marginRub,
    marginPercent,
  };
}

function getRecordPriceForMaterial(
  record: ProductCostSourceRecord,
  material: ProductCostMaterial,
) {
  return (
    record.priceVariants.find((variant) => variant.material === material)?.clientPriceRub ??
    (record.priceVariants.length === 1 ? record.priceVariants[0]?.clientPriceRub : undefined)
  );
}

function createRuleId(params: {
  scope: ProductCostRuleScope;
  categoryName?: string;
  seriesName?: string;
  articlePrefix?: string;
  material: ProductCostMaterial;
}) {
  return slugify(
    [
      params.scope,
      params.categoryName,
      params.seriesName,
      params.articlePrefix,
      params.material,
    ]
      .filter(Boolean)
      .join("|"),
  );
}

function createRatioSamples(records: ProductCostSourceRecord[]) {
  const samples: RatioSample[] = [];

  records.forEach((record) => {
    const articlePrefix = getArticlePrefix(record.articleNormalized);

    record.costVariants.forEach((costVariant) => {
      const matchedPriceRub = getRecordPriceForMaterial(record, costVariant.material);
      if (matchedPriceRub === undefined || matchedPriceRub <= 0 || costVariant.costRub <= 0) {
        return;
      }

      const ratio = costVariant.costRub / matchedPriceRub;

      if (record.seriesName) {
        samples.push({
          scope: "series_material",
          material: costVariant.material,
          categoryName: record.categoryName,
          seriesName: record.seriesName,
          articlePrefix,
          costToPriceRatio: ratio,
        });
      }

      if (record.categoryName && articlePrefix) {
        samples.push({
          scope: "category_prefix_material",
          material: costVariant.material,
          categoryName: record.categoryName,
          articlePrefix,
          costToPriceRatio: ratio,
        });
      }

      if (record.categoryName) {
        samples.push({
          scope: "category_material",
          material: costVariant.material,
          categoryName: record.categoryName,
          costToPriceRatio: ratio,
        });
        samples.push({
          scope: "category",
          material: "STANDARD",
          categoryName: record.categoryName,
          costToPriceRatio: ratio,
        });
      }

      samples.push({
        scope: "global",
        material: "STANDARD",
        costToPriceRatio: ratio,
      });
    });
  });

  return samples;
}

function buildRules(records: ProductCostSourceRecord[]) {
  const samples = createRatioSamples(records);
  const groups = new Map<string, RatioSample[]>();

  samples.forEach((sample) => {
    const id = createRuleId(sample);
    const bucket = groups.get(id) ?? [];
    bucket.push(sample);
    groups.set(id, bucket);
  });

  return Array.from(groups.entries()).map(([id, bucket]) => {
    const ratios = bucket.map((item) => item.costToPriceRatio).sort((left, right) => left - right);
    const first = bucket[0]!;
    const medianCostToPriceRatio = round(median(ratios), 4);

    return {
      id,
      scope: first.scope,
      categoryName: first.categoryName,
      seriesName: first.seriesName,
      articlePrefix: first.articlePrefix,
      material: first.material,
      sampleCount: bucket.length,
      medianCostToPriceRatio,
      medianPriceToCostRatio: round(1 / medianCostToPriceRatio, 4),
      minCostToPriceRatio: round(ratios[0]!, 4),
      maxCostToPriceRatio: round(ratios[ratios.length - 1]!, 4),
    } satisfies ProductCostRule;
  });
}

function getRuleKey(params: {
  scope: ProductCostRuleScope;
  material: ProductCostMaterial;
  categoryName?: string;
  seriesName?: string;
  articlePrefix?: string;
}) {
  return createRuleId(params);
}

function buildRuleIndex(rules: ProductCostRule[]) {
  return new Map(rules.map((rule) => [rule.id, rule] as const));
}

export function buildProductCostCatalog(
  imported: ProductCostImportResult,
): ProductCostCatalog {
  const directByArticle = new Map(
    imported.records.map((record) => [record.articleNormalized, record] as const),
  );
  const rules = buildRules(imported.records.filter((record) => record.costVariants.length > 0));

  return {
    workbookPath: imported.workbookPath,
    records: imported.records,
    rules,
    directByArticle,
    summary: {
      records: imported.records.length,
      recordsWithCost: imported.records.filter((record) => record.costVariants.length > 0).length,
      rules: rules.length,
    },
  };
}

function inferConfidence(label: ProductCostConfidenceLabel, sampleCount: number) {
  const base =
    label === "series_material_rule"
      ? 0.82
      : label === "category_prefix_material_rule"
        ? 0.74
        : label === "category_material_rule"
          ? 0.66
          : label === "category_rule"
            ? 0.58
            : label === "global_rule"
              ? 0.46
              : 1;

  return round(Math.min(0.96, base + Math.min(sampleCount, 10) * 0.01), 2);
}

function findBestRule(
  product: CostingProductLike,
  material: ProductCostMaterial,
  ruleIndex: Map<string, ProductCostRule>,
) {
  const articlePrefix = getArticlePrefix(product.articleNormalized);
  const candidates: Array<{
    key: string;
    confidenceLabel: ProductCostConfidenceLabel;
  }> = [];

  if (product.seriesName) {
    candidates.push({
      key: getRuleKey({
        scope: "series_material",
        material,
        categoryName: product.categoryName,
        seriesName: product.seriesName,
      }),
      confidenceLabel: "series_material_rule",
    });
  }

  if (product.categoryName && articlePrefix) {
    candidates.push({
      key: getRuleKey({
        scope: "category_prefix_material",
        material,
        categoryName: product.categoryName,
        articlePrefix,
      }),
      confidenceLabel: "category_prefix_material_rule",
    });
  }

  if (product.categoryName) {
    candidates.push({
      key: getRuleKey({
        scope: "category_material",
        material,
        categoryName: product.categoryName,
      }),
      confidenceLabel: "category_material_rule",
    });
    candidates.push({
      key: getRuleKey({
        scope: "category",
        material: "STANDARD",
        categoryName: product.categoryName,
      }),
      confidenceLabel: "category_rule",
    });
  }

  candidates.push({
    key: getRuleKey({
      scope: "global",
      material: "STANDARD",
    }),
    confidenceLabel: "global_rule",
  });

  for (const candidate of candidates) {
    const rule = ruleIndex.get(candidate.key);
    if (rule) {
      return {
        rule,
        confidenceLabel: candidate.confidenceLabel,
      } satisfies RuleMatch;
    }
  }

  return undefined;
}

function buildDirectVariants(
  product: CostingProductLike,
  record: ProductCostSourceRecord,
) {
  const productPriceMap = getBasePriceMap(product.prices);
  const recordPriceMap = new Map(
    record.priceVariants.map((variant) => [variant.material, variant.clientPriceRub] as const),
  );

  const variants: ProductCostSourceVariant[] = record.costVariants.map((costVariant) => {
    const clientPriceRub =
      productPriceMap.get(costVariant.material) ??
      recordPriceMap.get(costVariant.material) ??
      (record.costVariants.length === 1 ? product.basePriceRub : undefined);
    const margins = calculateMargins(clientPriceRub, costVariant.costRub);

    return {
      material: costVariant.material,
      clientPriceRub,
      costRub: costVariant.costRub,
      source: "DIRECT",
      sourceSheet: record.sheetName,
      sourceRow: record.rowNumber,
      costDateLabel: record.costDateLabel,
      costNote: costVariant.note,
      formulaHint: record.priceVariants.find((variant) => variant.material === costVariant.material)
        ?.formulaHint,
      marginRub: margins.marginRub,
      marginPercent: margins.marginPercent,
    };
  });

  const knownMaterials = new Set(variants.map((variant) => variant.material));

  getBasePriceMap(product.prices).forEach((clientPriceRub, material) => {
    if (knownMaterials.has(material)) {
      return;
    }

    const fallbackCostRub =
      record.costVariants.length === 1 ? record.costVariants[0]?.costRub : undefined;
    if (fallbackCostRub === undefined) {
      return;
    }

    const margins = calculateMargins(clientPriceRub, fallbackCostRub);

    variants.push({
      material,
      clientPriceRub,
      costRub: fallbackCostRub,
      source: "DIRECT",
      sourceSheet: record.sheetName,
      sourceRow: record.rowNumber,
      costDateLabel: record.costDateLabel,
      costNote: record.costVariants[0]?.note,
      marginRub: margins.marginRub,
      marginPercent: margins.marginPercent,
    });
  });

  return variants.sort((left, right) => left.material.localeCompare(right.material));
}

function buildInferredVariants(
  product: CostingProductLike,
  catalog: ProductCostCatalog,
  skipMaterials = new Set<ProductCostMaterial>(),
) {
  const productPriceMap = getBasePriceMap(product.prices);
  const materials =
    productPriceMap.size > 0
      ? Array.from(productPriceMap.keys())
      : [getDefaultMaterial(product)];
  const ruleIndex = buildRuleIndex(catalog.rules);

  return materials
    .filter((material) => !skipMaterials.has(material))
    .map((material) => {
      const clientPriceRub =
        productPriceMap.get(material) ??
        (materials.length === 1 ? product.basePriceRub : undefined);
      if (clientPriceRub === undefined) {
        return undefined;
      }

      const matchedRule = findBestRule(product, material, ruleIndex);
      if (!matchedRule) {
        return undefined;
      }

      const costRub = round(clientPriceRub * matchedRule.rule.medianCostToPriceRatio, 2);
      const margins = calculateMargins(clientPriceRub, costRub);

      return {
        material,
        clientPriceRub,
        costRub,
        source: "INFERRED",
        sourceSheet: undefined,
        sourceRow: undefined,
        costDateLabel: undefined,
        costNote: undefined,
        formulaHint: undefined,
        marginRub: margins.marginRub,
        marginPercent: margins.marginPercent,
        _matchedRule: matchedRule,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left!.material.localeCompare(right!.material)) as Array<
    ProductCostSourceVariant & { _matchedRule: RuleMatch }
  >;
}

export function resolveProductCosting(
  product: CostingProductLike,
  catalog?: ProductCostCatalog,
): GeneratedProductCosting | undefined {
  if (!catalog) {
    return undefined;
  }

  const directRecord = catalog.directByArticle.get(product.articleNormalized);
  const directVariants = directRecord ? buildDirectVariants(product, directRecord) : [];
  const directMaterials = new Set(directVariants.map((variant) => variant.material));
  const inferredVariants = buildInferredVariants(product, catalog, directMaterials);
  const variants = [...directVariants, ...inferredVariants].sort((left, right) =>
    left.material.localeCompare(right.material),
  );

  if (variants.length === 0) {
    return {
      availability: "NONE",
      confidence: 0,
      confidenceLabel: "global_rule",
      basis: ["No cost rule or direct cost was found for this product."],
      sourceWorkbookPath: catalog.workbookPath,
      defaultMaterial: getDefaultMaterial(product),
      variants: [],
    };
  }

  const defaultMaterial = getDefaultMaterial(product);
  const defaultVariant =
    variants.find((variant) => variant.material === defaultMaterial) ?? variants[0]!;
  const inferredDefault = inferredVariants.find((variant) => variant.material === defaultVariant.material);

  const confidenceLabel =
    defaultVariant.source === "DIRECT"
      ? "direct"
      : inferredDefault?._matchedRule.confidenceLabel ?? "global_rule";
  const confidence =
    defaultVariant.source === "DIRECT"
      ? 1
      : inferConfidence(
          confidenceLabel,
          inferredDefault?._matchedRule.rule.sampleCount ?? 1,
        );

  const basis =
    defaultVariant.source === "DIRECT"
      ? [
          `Direct cost matched by article ${product.articleNormalized}.`,
          directRecord?.sheetName ? `Sheet: ${directRecord.sheetName}` : "",
          directRecord?.costDateLabel ? `Cost date: ${directRecord.costDateLabel}` : "",
        ].filter(Boolean)
      : [
          `Rule: ${inferredDefault?._matchedRule.rule.scope ?? "global"}.`,
          inferredDefault?._matchedRule.rule.categoryName
            ? `Category: ${inferredDefault?._matchedRule.rule.categoryName}`
            : "",
          inferredDefault?._matchedRule.rule.seriesName
            ? `Series: ${inferredDefault?._matchedRule.rule.seriesName}`
            : "",
          inferredDefault?._matchedRule.rule.articlePrefix
            ? `Article prefix: ${inferredDefault?._matchedRule.rule.articlePrefix}`
            : "",
          inferredDefault?._matchedRule.rule.sampleCount
            ? `Samples: ${inferredDefault?._matchedRule.rule.sampleCount}`
            : "",
          inferredDefault?._matchedRule.rule.medianCostToPriceRatio
            ? `Median cost/price: ${inferredDefault?._matchedRule.rule.medianCostToPriceRatio}`
            : "",
        ].filter(Boolean);

  return {
    availability: directVariants.length > 0 ? "DIRECT" : "INFERRED",
    confidence,
    confidenceLabel,
    basis,
    sourceWorkbookPath: catalog.workbookPath,
    sourceDateLabel: directRecord?.costDateLabel,
    defaultMaterial: defaultVariant.material,
    defaultClientPriceRub: defaultVariant.clientPriceRub,
    defaultCostRub: defaultVariant.costRub,
    defaultMarginRub: defaultVariant.marginRub,
    defaultMarginPercent: defaultVariant.marginPercent,
    variants: variants.map((variant) => {
      const { _matchedRule: _ignored, ...publicVariant } = variant as ProductCostSourceVariant & {
        _matchedRule?: RuleMatch;
      };
      return publicVariant;
    }),
  };
}

export function buildProductCostMergeReport(
  products: CostingProductLike[],
  catalog: ProductCostCatalog,
  imported: ProductCostImportResult,
): ProductCostMergeReport {
  const catalogArticles = new Set(products.map((product) => product.articleNormalized));
  let directMatches = 0;
  let inferredMatches = 0;
  let unmatchedCatalogProducts = 0;

  products.forEach((product) => {
    const costing = resolveProductCosting(product, catalog);
    if (!costing || costing.availability === "NONE") {
      unmatchedCatalogProducts += 1;
      return;
    }

    if (costing.availability === "DIRECT") {
      directMatches += 1;
      return;
    }

    inferredMatches += 1;
  });

  const unmatchedWorkbookArticles = imported.records
    .filter((record) => !catalogArticles.has(record.articleNormalized))
    .map((record) => record.articleNormalized)
    .slice(0, 200);

  return {
    workbookPath: catalog.workbookPath,
    summary: {
      sourceRecords: imported.records.length,
      directMatches,
      inferredMatches,
      unmatchedCatalogProducts,
      unmatchedWorkbookRecords: unmatchedWorkbookArticles.length,
      ruleCount: catalog.rules.length,
    },
    sheetCoverage: imported.sheetSummaries,
    topRules: [...catalog.rules]
      .sort((left, right) => right.sampleCount - left.sampleCount)
      .slice(0, 30),
    unmatchedWorkbookArticles,
  };
}
