import { getProductThreeDInfo } from "@/application/catalog/three-d";
import { segmentByCategoryName } from "@/domain/catalog/constants";
import { GeneratedProduct } from "@/import/catalog/types";
import { buildSelectionProductProfile } from "@/application/selection/product-profile";
import { round } from "@/application/selection/text-utils";

import {
  PlacementAssetLayer,
  PlacementCommercialLayer,
  PlacementDerivedLayer,
  PlacementFirstWaveItem,
  PlacementInferredLayer,
  PlacementProductKind,
  PlacementQualityFlag,
  PlacementQualityLayer,
  PlacementRole,
  PlacementSafetyEnvelope,
  PlacementThreeDStatus,
  PlacementTruthProduct,
  ProductTruthFoundation,
} from "@/application/placement-foundation/types";

const categoryQuotas: Record<string, number> = {
  "Игровые комплексы": 12,
  "Игровые элементы": 10,
  "Канатные комплексы": 6,
  "Оборудование для детских садов": 4,
  "Гимнастические комплексы": 5,
  Воркаут: 4,
  Тренажеры: 2,
  МАФ: 4,
  "Скейт парк": 3,
};

function inferPlacementProductKind(product: GeneratedProduct): PlacementProductKind {
  const text = [
    product.name,
    product.categoryName,
    product.subcategoryLabel,
    product.seriesName,
    ...product.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (product.categoryName === "Игровые комплексы") {
    return "PLAYGROUND_COMPLEX";
  }

  if (product.categoryName === "Игровые элементы") {
    if (text.includes("горк")) {
      return "SLIDE";
    }

    if (text.includes("качел")) {
      return "SWING";
    }

    if (text.includes("песоч")) {
      return "SANDBOX";
    }

    return "PLAYGROUND_ELEMENT";
  }

  if (product.categoryName === "Канатные комплексы") {
    return "ROPE_COMPLEX";
  }

  if (product.categoryName === "Оборудование для детских садов") {
    return "KINDERGARTEN_EQUIPMENT";
  }

  if (product.categoryName === "Воркаут") {
    return "WORKOUT_UNIT";
  }

  if (product.categoryName === "Гимнастические комплексы") {
    return "GYMNASTIC_UNIT";
  }

  if (product.categoryName === "Тренажеры") {
    return "TRAINER_UNIT";
  }

  if (product.categoryName === "Спортивные элементы") {
    return "SPORTS_ELEMENT";
  }

  if (product.categoryName === "Скейт парк") {
    return "SKATE_MODULE";
  }

  if (product.categoryName === "МАФ") {
    return "SMALL_ARCH_FORM";
  }

  if (product.categoryName === "Геопластика") {
    return "LANDSCAPE_FEATURE";
  }

  return "PARK_FEATURE";
}

function inferPlacementRole(
  kind: PlacementProductKind,
  product: GeneratedProduct,
  footprintAreaM2?: number,
): PlacementRole {
  if (
    kind === "PLAYGROUND_COMPLEX" ||
    kind === "ROPE_COMPLEX" ||
    kind === "SKATE_MODULE" ||
    (product.basePriceRub ?? 0) >= 800_000 ||
    (footprintAreaM2 ?? 0) >= 18
  ) {
    return "ANCHOR";
  }

  if (
    kind === "SLIDE" ||
    kind === "SWING" ||
    kind === "WORKOUT_UNIT" ||
    kind === "GYMNASTIC_UNIT" ||
    kind === "TRAINER_UNIT" ||
    kind === "SPORTS_ELEMENT" ||
    (footprintAreaM2 ?? 0) >= 6
  ) {
    return "FEATURE";
  }

  if (
    kind === "PLAYGROUND_ELEMENT" ||
    kind === "KINDERGARTEN_EQUIPMENT" ||
    kind === "SMALL_ARCH_FORM"
  ) {
    return "SUPPORTING";
  }

  return "ACCESSORY";
}

function deriveSafetyEnvelope(
  kind: PlacementProductKind,
  widthM?: number,
  lengthM?: number,
  heightM?: number,
): PlacementSafetyEnvelope {
  const hasFootprint = widthM !== undefined && lengthM !== undefined;
  const heightFactor = Math.min(Math.max(heightM ?? 0, 0), 4);

  let sideClearanceM = 1.2;
  let frontClearanceM = 1.2;
  let rearClearanceM = 1.2;
  let ruleId = "default-clearance";

  switch (kind) {
    case "PLAYGROUND_COMPLEX":
      sideClearanceM = 1.5;
      frontClearanceM = 1.7 + heightFactor * 0.1;
      rearClearanceM = 1.5;
      ruleId = "playground-complex-envelope";
      break;
    case "SLIDE":
      sideClearanceM = 1.4;
      frontClearanceM = 2.2 + heightFactor * 0.15;
      rearClearanceM = 1.3;
      ruleId = "slide-runout-envelope";
      break;
    case "SWING":
      sideClearanceM = 1.6;
      frontClearanceM = 2.5 + heightFactor * 0.2;
      rearClearanceM = 2.5 + heightFactor * 0.2;
      ruleId = "swing-motion-envelope";
      break;
    case "SANDBOX":
      sideClearanceM = 0.8;
      frontClearanceM = 0.8;
      rearClearanceM = 0.8;
      ruleId = "sandbox-perimeter-envelope";
      break;
    case "ROPE_COMPLEX":
      sideClearanceM = 1.8;
      frontClearanceM = 1.8;
      rearClearanceM = 1.8;
      ruleId = "rope-complex-envelope";
      break;
    case "WORKOUT_UNIT":
    case "GYMNASTIC_UNIT":
    case "TRAINER_UNIT":
    case "SPORTS_ELEMENT":
      sideClearanceM = 1.5;
      frontClearanceM = 1.6;
      rearClearanceM = 1.4;
      ruleId = "sport-activity-envelope";
      break;
    case "SKATE_MODULE":
      sideClearanceM = 1.8;
      frontClearanceM = 2.8;
      rearClearanceM = 2.2;
      ruleId = "skate-run-envelope";
      break;
    case "SMALL_ARCH_FORM":
      sideClearanceM = 0.7;
      frontClearanceM = 0.8;
      rearClearanceM = 0.7;
      ruleId = "small-arch-perimeter-envelope";
      break;
    case "LANDSCAPE_FEATURE":
    case "PARK_FEATURE":
      sideClearanceM = 0.6;
      frontClearanceM = 0.6;
      rearClearanceM = 0.6;
      ruleId = "park-perimeter-envelope";
      break;
    case "KINDERGARTEN_EQUIPMENT":
      sideClearanceM = 1.4;
      frontClearanceM = 1.5;
      rearClearanceM = 1.4;
      ruleId = "kindergarten-safe-envelope";
      break;
    default:
      break;
  }

  const envelopeWidthM = hasFootprint ? round(widthM! + sideClearanceM * 2, 2) : undefined;
  const envelopeLengthM = hasFootprint
    ? round(lengthM! + frontClearanceM + rearClearanceM, 2)
    : undefined;

  return {
    source: "DERIVED_RULE",
    ruleId,
    widthM: envelopeWidthM,
    lengthM: envelopeLengthM,
    areaM2:
      envelopeWidthM !== undefined && envelopeLengthM !== undefined
        ? round(envelopeWidthM * envelopeLengthM, 2)
        : undefined,
    frontClearanceM: round(frontClearanceM, 2),
    rearClearanceM: round(rearClearanceM, 2),
    sideClearanceM: round(sideClearanceM, 2),
  };
}

function derivePlacementContexts(product: GeneratedProduct, profile: ReturnType<typeof buildSelectionProductProfile>) {
  const contexts = new Set<string>();
  const categoryName = product.categoryName ?? "Без категории";

  contexts.add(categoryName);

  profile.inferredData.usageTags.forEach((tag) => {
    if (tag === "private_family" || tag === "dacha" || tag === "private_house") {
      contexts.add("private-plot");
    }

    if (tag === "residential_courtyard") {
      contexts.add("residential-courtyard");
    }

    if (tag === "municipal" || tag === "park_public") {
      contexts.add("municipal-public");
    }

    if (tag === "kindergarten") {
      contexts.add("kindergarten");
    }

    if (tag === "school") {
      contexts.add("school-sport");
    }
  });

  if (profile.derivedData.materialTags.includes("eco")) {
    contexts.add("eco-cluster");
  }

  if (profile.inferredData.objectTypes.includes("playground")) {
    contexts.add("play-cluster");
  }

  if (profile.inferredData.objectTypes.includes("school_sport")) {
    contexts.add("sport-cluster");
  }

  return Array.from(contexts);
}

function deriveCompatibilityTags(
  kind: PlacementProductKind,
  role: PlacementRole,
  profile: ReturnType<typeof buildSelectionProductProfile>,
) {
  const tags = new Set<string>();

  tags.add(`kind:${kind.toLowerCase()}`);
  tags.add(`role:${role.toLowerCase()}`);

  if (profile.derivedData.compactScore >= 0.75) {
    tags.add("fits-compact-plot");
  }

  if (profile.inferredData.growthScore >= 0.65) {
    tags.add("long-term-use");
  }

  if (profile.inferredData.antiVandalScore >= 0.75) {
    tags.add("high-durability");
  }

  if (profile.derivedData.materialTags.includes("eco")) {
    tags.add("eco-friendly");
  }

  if (kind === "SLIDE") {
    tags.add("needs-runout-axis");
  }

  if (kind === "SWING") {
    tags.add("needs-motion-axis");
  }

  if (kind === "SKATE_MODULE") {
    tags.add("needs-flow-line");
  }

  if (kind === "PLAYGROUND_COMPLEX" || kind === "ROPE_COMPLEX") {
    tags.add("core-scene-anchor");
  }

  return Array.from(tags);
}

function deriveFamilyRelevance(profile: ReturnType<typeof buildSelectionProductProfile>) {
  const usageTags = new Set(profile.inferredData.usageTags);

  return {
    private:
      usageTags.has("private_family") || usageTags.has("dacha") || usageTags.has("private_house")
        ? 1
        : profile.derivedData.ecoScore >= 0.55
          ? 0.65
          : 0.35,
    residential: usageTags.has("residential_courtyard") ? 1 : 0.4,
    municipal: usageTags.has("municipal") || usageTags.has("park_public") ? 1 : 0.3,
    kindergarten: usageTags.has("kindergarten") ? 1 : profile.sourceData.ageMaxYears !== undefined && profile.sourceData.ageMaxYears <= 7 ? 0.7 : 0.2,
  };
}

function deriveThreeDStatus(product: GeneratedProduct): PlacementAssetLayer {
  const threeD = getProductThreeDInfo(product);
  const hasDwg = Boolean(
    product.metadata.threeD &&
      typeof product.metadata.threeD === "object" &&
      Array.isArray((product.metadata.threeD as Record<string, unknown>).sourceDwgFiles) &&
      ((product.metadata.threeD as Record<string, unknown>).sourceDwgFiles as unknown[]).length > 0,
  );

  let threeDStatus: PlacementThreeDStatus = "NO_3D_DATA";

  if (threeD?.hasModelAsset && threeD.renderableInViewer) {
    threeDStatus = "WEB_READY";
  } else if (threeD && threeD.sourceFiles > 0) {
    threeDStatus = "SOURCE_READY";
  } else if ((threeD?.previewImages ?? 0) > 0) {
    threeDStatus = "PREVIEW_READY";
  }

  return {
    primaryImageUrl: product.imageUrl,
    galleryImages: product.gallery.length,
    previewImages: threeD?.previewImages ?? 0,
    hasPreview: Boolean(product.imageUrl || product.gallery.length > 0 || (threeD?.previewImages ?? 0) > 0),
    threeDStatus,
    threeDFormat: threeD?.deliveryFormat,
    hasRenderableViewerAsset: Boolean(threeD?.hasModelAsset && threeD.renderableInViewer),
    hasDwg,
    source3dFiles: threeD?.sourceFiles ?? 0,
  };
}

function deriveQuality(
  product: GeneratedProduct,
  derived: PlacementDerivedLayer,
  assets: PlacementAssetLayer,
  commercial: PlacementCommercialLayer,
): PlacementQualityLayer {
  const flags: PlacementQualityFlag[] = [];
  const notes: string[] = [];
  let score = 0;

  if (derived.footprintWidthM !== undefined && derived.footprintLengthM !== undefined) {
    score += 22;
  } else {
    flags.push("missing_dimensions");
    notes.push("Нет полной пары габаритов для постановки в сцену.");
  }

  if (product.materials.length > 0) {
    score += 10;
  } else {
    flags.push("missing_materials");
  }

  if (product.ageLabel || product.ageMinYears !== undefined || product.ageMaxYears !== undefined) {
    score += 8;
  } else {
    flags.push("missing_age");
  }

  if (assets.hasPreview) {
    score += 8;
  } else {
    flags.push("missing_image");
  }

  if (commercial.basePriceRub !== undefined) {
    score += 8;
  } else {
    flags.push("missing_base_price");
  }

  if (commercial.costingAvailability === "DIRECT") {
    score += 14;
  } else if (commercial.costingAvailability === "INFERRED") {
    score += 9;
    flags.push("inferred_costing");
  } else {
    flags.push("missing_costing");
  }

  if (assets.threeDStatus === "WEB_READY") {
    score += 14;
  } else if (assets.threeDStatus === "SOURCE_READY") {
    score += 10;
    flags.push("no_web_3d");
  } else if (assets.threeDStatus === "PREVIEW_READY") {
    score += 5;
    flags.push("no_3d_source");
    flags.push("no_web_3d");
  } else {
    flags.push("no_3d_source");
    flags.push("no_web_3d");
  }

  if (assets.hasDwg) {
    score += 8;
  } else {
    flags.push("no_dwg");
  }

  if (derived.safetyZone.widthM !== undefined && derived.safetyZone.lengthM !== undefined) {
    score += 8;
    if (derived.safetyZone.source === "DERIVED_RULE") {
      flags.push("safety_zone_derived");
      notes.push("Зона безопасности рассчитана по детерминированному правилу, а не из паспорта.");
    }
  }

  if ((product.rawSources?.length ?? 0) <= 1) {
    flags.push("low_source_diversity");
  } else {
    score += 4;
  }

  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const placementReady =
    normalizedScore >= 68 &&
    derived.footprintWidthM !== undefined &&
    derived.footprintLengthM !== undefined &&
    commercial.basePriceRub !== undefined &&
    assets.hasPreview;

  const status =
    normalizedScore >= 80
      ? "FOUNDATION_READY"
      : normalizedScore >= 58
        ? "REQUIRES_REVIEW"
        : "NEEDS_DATA";

  return {
    score: normalizedScore,
    status,
    flags,
    notes,
    placementReady,
  };
}

function toCommercialLayer(product: GeneratedProduct): PlacementCommercialLayer {
  return {
    basePriceRub: product.basePriceRub,
    costingAvailability: product.costing?.availability ?? "NONE",
    costingConfidence: product.costing?.confidence,
    defaultCostRub: product.costing?.defaultCostRub,
    defaultMarginPercent: product.costing?.defaultMarginPercent,
  };
}

function buildPriorityScore(productTruth: PlacementTruthProduct) {
  const categoryQuotaWeight = categoryQuotas[productTruth.source.categoryName ?? ""] ?? 2;
  const web3dWeight =
    productTruth.assets.threeDStatus === "WEB_READY"
      ? 18
      : productTruth.assets.threeDStatus === "SOURCE_READY"
        ? 12
        : productTruth.assets.threeDStatus === "PREVIEW_READY"
          ? 6
          : 0;
  const costWeight =
    productTruth.commercial.costingAvailability === "DIRECT"
      ? 14
      : productTruth.commercial.costingAvailability === "INFERRED"
        ? 8
        : 0;
  const dwgWeight = productTruth.assets.hasDwg ? 8 : 0;
  const roleWeight =
    productTruth.inferred.placementRole === "ANCHOR"
      ? 14
      : productTruth.inferred.placementRole === "FEATURE"
        ? 10
        : productTruth.inferred.placementRole === "SUPPORTING"
          ? 6
          : 3;

  return (
    productTruth.quality.score +
    categoryQuotaWeight +
    web3dWeight +
    costWeight +
    dwgWeight +
    roleWeight
  );
}

function selectFirstWave(products: PlacementTruthProduct[], targetCount = 50) {
  const readyProducts = [...products]
    .filter((product) => product.quality.status !== "NEEDS_DATA")
    .sort((left, right) => buildPriorityScore(right) - buildPriorityScore(left));

  const selected: PlacementTruthProduct[] = [];
  const selectedArticles = new Set<string>();

  for (const [categoryName, quota] of Object.entries(categoryQuotas)) {
    const categoryProducts = readyProducts.filter(
      (product) =>
        product.source.categoryName === categoryName &&
        !selectedArticles.has(product.articleNormalized),
    );

    for (const product of categoryProducts.slice(0, quota)) {
      selected.push(product);
      selectedArticles.add(product.articleNormalized);
    }
  }

  for (const product of readyProducts) {
    if (selected.length >= targetCount) {
      break;
    }

    if (selectedArticles.has(product.articleNormalized)) {
      continue;
    }

    selected.push(product);
    selectedArticles.add(product.articleNormalized);
  }

  return selected.slice(0, targetCount);
}

export function buildProductTruthFoundation(
  products: GeneratedProduct[],
  targetCount = 50,
): ProductTruthFoundation {
  const truthProducts: PlacementTruthProduct[] = products.map((product) => {
    const profile = buildSelectionProductProfile(product);
    const productKind = inferPlacementProductKind(product);
    const footprintWidthM = profile.derivedData.footprintWidthM;
    const footprintLengthM = profile.derivedData.footprintLengthM;
    const footprintAreaM2 =
      footprintWidthM !== undefined && footprintLengthM !== undefined
        ? round(footprintWidthM * footprintLengthM, 2)
        : undefined;
    const placementRole = inferPlacementRole(productKind, product, footprintAreaM2);
    const safetyZone = deriveSafetyEnvelope(
      productKind,
      footprintWidthM,
      footprintLengthM,
      product.heightM,
    );

    const derived: PlacementDerivedLayer = {
      footprintWidthM,
      footprintLengthM,
      footprintAreaM2,
      compactScore: profile.derivedData.compactScore,
      safetyZone,
      placementContexts: derivePlacementContexts(product, profile),
      compatibilityTags: deriveCompatibilityTags(productKind, placementRole, profile),
      familyRelevance: deriveFamilyRelevance(profile),
    };
    const inferred: PlacementInferredLayer = {
      objectTypes: profile.inferredData.objectTypes,
      productKind,
      placementRole,
      usageTags: profile.inferredData.usageTags,
      childDevelopmentStages: profile.inferredData.childDevelopmentStage,
      materialTags: profile.derivedData.materialTags,
      ecoScore: profile.derivedData.ecoScore,
      growthScore: profile.inferredData.growthScore,
      antiVandalScore: profile.inferredData.antiVandalScore,
    };
    const assets = deriveThreeDStatus(product);
    const commercial = toCommercialLayer(product);
    const quality = deriveQuality(product, derived, assets, commercial);

    return {
      id: product.id,
      article: product.article,
      articleNormalized: product.articleNormalized,
      slug: product.slug,
      name: product.name,
      segmentKey: segmentByCategoryName[product.categoryName ?? ""],
      source: {
        sourceCount: product.rawSources.length,
        sourceSystems: Array.from(new Set(product.rawSources.map((source) => source.source))),
        categoryName: product.categoryName,
        subcategoryLabel: product.subcategoryLabel,
        seriesName: product.seriesName,
        materials: product.materials,
        ageLabel: product.ageLabel,
        ageMinYears: profile.sourceData.ageMinYears ?? profile.derivedData.ageMinYears,
        ageMaxYears: profile.sourceData.ageMaxYears ?? profile.derivedData.ageMaxYears,
        lengthM: product.lengthM,
        widthM: product.widthM,
        heightM: product.heightM,
        sizeLabel: product.sizeLabel,
        basePriceRub: product.basePriceRub,
        costing: product.costing,
      },
      derived,
      inferred,
      assets,
      commercial,
      quality,
    };
  });

  const firstWaveProducts = selectFirstWave(truthProducts, targetCount);
  const firstWave: PlacementFirstWaveItem[] = firstWaveProducts.map((product) => ({
    article: product.article,
    articleNormalized: product.articleNormalized,
    name: product.name,
    categoryName: product.source.categoryName,
    productKind: product.inferred.productKind,
    priorityScore: buildPriorityScore(product),
    qualityScore: product.quality.score,
    placementReady: product.quality.placementReady,
    threeDStatus: product.assets.threeDStatus,
    costingAvailability: product.commercial.costingAvailability,
    safetyRuleId: product.derived.safetyZone.ruleId,
  }));

  const byCategory = firstWave.reduce<Record<string, number>>((acc, item) => {
    const key = item.categoryName ?? "Без категории";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalProducts: truthProducts.length,
      placementReadyProducts: truthProducts.filter((product) => product.quality.placementReady).length,
      foundationReadyProducts: truthProducts.filter(
        (product) => product.quality.status === "FOUNDATION_READY",
      ).length,
      productsWithSafetyZone: truthProducts.filter(
        (product) => product.derived.safetyZone.widthM !== undefined,
      ).length,
      productsWithCosting: truthProducts.filter(
        (product) => product.commercial.costingAvailability !== "NONE",
      ).length,
      productsWithThreeDSource: truthProducts.filter(
        (product) => product.assets.threeDStatus === "SOURCE_READY" || product.assets.threeDStatus === "WEB_READY",
      ).length,
      productsWithWebThreeD: truthProducts.filter(
        (product) => product.assets.threeDStatus === "WEB_READY",
      ).length,
      productsWithDwg: truthProducts.filter((product) => product.assets.hasDwg).length,
    },
    firstWaveSummary: {
      targetCount,
      selectedCount: firstWave.length,
      placementReadyCount: firstWave.filter((item) => item.placementReady).length,
      byCategory,
    },
    products: truthProducts.sort((left, right) =>
      left.name.localeCompare(right.name, "ru"),
    ),
    firstWave,
  };
}

export function renderFirstWaveMarkdown(foundation: ProductTruthFoundation) {
  const lines = [
    "# Product Truth Foundation / First Wave",
    "",
    `Generated: ${foundation.generatedAt}`,
    "",
    `Total products: ${foundation.summary.totalProducts}`,
    `Placement-ready products: ${foundation.summary.placementReadyProducts}`,
    `Foundation-ready products: ${foundation.summary.foundationReadyProducts}`,
    `Selected first-wave items: ${foundation.firstWaveSummary.selectedCount}`,
    "",
    "| Article | Category | Kind | Quality | 3D | Costing | Safety rule |",
    "| --- | --- | --- | ---: | --- | --- | --- |",
    ...foundation.firstWave.map(
      (item) =>
        `| ${item.article} | ${item.categoryName ?? ""} | ${item.productKind} | ${item.qualityScore} | ${item.threeDStatus} | ${item.costingAvailability} | ${item.safetyRuleId} |`,
    ),
    "",
  ];

  return lines.join("\n");
}
