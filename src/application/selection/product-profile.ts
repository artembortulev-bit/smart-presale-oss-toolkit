import {
  objectTypeCategoryMap,
} from "@/application/selection/config";
import {
  ChildDevelopmentStage,
  ExclusionTag,
  MaterialPreferenceTag,
  ObjectType,
  SelectionProductProfile,
  UsageContextTag,
} from "@/application/selection/types";
import { GeneratedProduct } from "@/import/catalog/types";
import {
  buildKeywordIndex,
  clamp,
  normalizeSelectionQueryText,
  round,
  toNumber,
  uniqueValues,
} from "@/application/selection/text-utils";
import { slugify } from "@/shared/utils/slugify";

const productProfileCache = new Map<string, SelectionProductProfile>();

function parseAgeLabel(ageLabel?: string) {
  const normalized = normalizeSelectionQueryText(ageLabel ?? "");

  const rangeMatch = normalized.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})/);
  if (rangeMatch) {
    return {
      ageMinYears: Number(rangeMatch[1]),
      ageMaxYears: Number(rangeMatch[2]),
    };
  }

  const fromMatch = normalized.match(/(\d{1,2})\s*(?:лет|года|год)\s*и\s*старше/);
  if (fromMatch) {
    return {
      ageMinYears: Number(fromMatch[1]),
    };
  }

  const explicitFromMatch = normalized.match(/от\s*(\d{1,2})\s*(?:лет|года|год)/);
  if (explicitFromMatch) {
    return {
      ageMinYears: Number(explicitFromMatch[1]),
    };
  }

  if (normalized.includes("без возраст")) {
    return {};
  }

  return {};
}

function parseDimensionsFromSizeLabel(sizeLabel?: string) {
  const normalized = normalizeSelectionQueryText(sizeLabel ?? "");
  const numbers = Array.from(
    normalized.matchAll(/(\d+(?:[.,]\d+)?)/g),
    (match) => toNumber(match[1]),
  ).filter((value): value is number => value !== undefined);

  if (numbers.length < 2) {
    return {};
  }

  const meterNumbers = numbers.map((value) => {
    if (normalized.includes("мм") || value >= 100) {
      return round(value / 1000, 3);
    }

    return round(value, 3);
  });

  return {
    widthM: meterNumbers[0],
    lengthM: meterNumbers[1],
  };
}

function inferMaterialTags(product: GeneratedProduct) {
  const materialText = normalizeSelectionQueryText(
    [...product.materials, product.name, ...product.tags].join(" "),
  );
  const tags = new Set<MaterialPreferenceTag>();
  const hasWood = /(дерево|деревян|фанер|робиния|larch|pine)/i.test(materialText);
  const hasHdpe = /(hdpe)/i.test(materialText);
  const hasHpl = /(hpl)/i.test(materialText);
  const hasMetal = /(металл|нержав|сталь)/i.test(materialText);
  const hasAntiVandalKeyword = /(антиванд)/i.test(materialText);

  if (hasWood) {
    tags.add("wood");
    tags.add("natural");
    tags.add("eco");
  }

  if (hasHdpe) {
    tags.add("hdpe");
    tags.add("eco");
  }

  if (hasHpl) {
    tags.add("hpl");
    tags.add("eco");
  }

  if (hasMetal) {
    tags.add("metal");
  }

  if (
    hasAntiVandalKeyword ||
    ((hasMetal || /нержав/i.test(materialText)) &&
      (hasHdpe || hasHpl || /нержав/i.test(materialText))) ||
    (!hasWood &&
      (product.categoryName === "Воркаут" ||
        product.categoryName === "Спортивные элементы"))
  ) {
    tags.add("antivandal");
  }

  return Array.from(tags);
}

function inferEcoScore(materialTags: MaterialPreferenceTag[]) {
  let score = 0.18;

  if (materialTags.includes("wood")) {
    score += 0.46;
  }

  if (materialTags.includes("natural")) {
    score += 0.16;
  }

  if (materialTags.includes("hdpe")) {
    score += 0.12;
  }

  if (materialTags.includes("hpl")) {
    score += 0.08;
  }

  if (materialTags.includes("metal") && !materialTags.includes("wood")) {
    score -= 0.08;
  }

  return clamp(round(score, 2), 0, 1);
}

function inferObjectTypes(category?: string): ObjectType[] {
  if (!category) {
    return ["playground"];
  }

  const matches = Object.entries(objectTypeCategoryMap)
    .filter(([, categories]) => categories.includes(category))
    .map(([objectType]) => objectType as ObjectType);

  return matches.length > 0 ? matches : ["playground"];
}

function inferUsageTags(input: {
  objectTypes: ObjectType[];
  category?: string;
  materialTags: MaterialPreferenceTag[];
  ageMaxYears?: number;
  text: string;
  antiVandalScore: number;
}) {
  const tags = new Set<UsageContextTag>();

  input.objectTypes.forEach((objectType) => {
    if (objectType === "playground") {
      tags.add("private_family");
      tags.add("residential_courtyard");
    }

    if (objectType === "kindergarten") {
      tags.add("kindergarten");
      tags.add("private_family");
    }

    if (objectType === "school_sport") {
      tags.add("school");
      tags.add("municipal");
      tags.add("residential_courtyard");
    }

    if (objectType === "park") {
      tags.add("park_public");
      tags.add("municipal");
      tags.add("residential_courtyard");
    }
  });

  if (
    input.objectTypes.includes("playground") &&
    (input.materialTags.includes("wood") || input.materialTags.includes("natural"))
  ) {
    tags.add("dacha");
    tags.add("private_house");
    tags.add("cottage");
  }

  if (
    input.objectTypes.includes("playground") &&
    (input.category === "Оборудование для детских садов" ||
      (input.ageMaxYears !== undefined && input.ageMaxYears <= 7))
  ) {
    tags.add("kindergarten");
  }

  if (
    input.objectTypes.includes("playground") &&
    (input.antiVandalScore >= 0.75 ||
      input.text.includes("антиванд") ||
      input.text.includes("для двора"))
  ) {
    tags.add("municipal");
    tags.add("residential_courtyard");
  }

  return Array.from(tags);
}

function inferExclusionTags(product: GeneratedProduct) {
  const text = normalizeSelectionQueryText(
    [
      product.name,
      product.categoryName,
      product.subcategoryLabel,
      product.description,
      ...product.tags,
      ...product.materials,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const exclusionTags = new Set<ExclusionTag>();
  const riskTags = new Set<ExclusionTag>();

  if (text.includes("песоч")) {
    exclusionTags.add("sandbox");
  }

  if (text.includes("качел")) {
    exclusionTags.add("swing");
  }

  if (text.includes("канат") || text.includes("верев")) {
    exclusionTags.add("rope");
    riskTags.add("complex_climb");
  }

  if (
    text.includes("лазал") ||
    text.includes("скалодр") ||
    text.includes("верев") ||
    text.includes("канат")
  ) {
    exclusionTags.add("complex_climb");
    riskTags.add("complex_climb");
  }

  if (
    text.includes("горк") &&
    ((product.heightM ?? 0) >= 1.8 || text.includes("высок"))
  ) {
    exclusionTags.add("high_slide");
    riskTags.add("high_slide");
  }

  if (
    text.includes("оранж") ||
    text.includes("ярк") ||
    text.includes("радуг") ||
    text.includes("цветн")
  ) {
    exclusionTags.add("bright_colors");
  }

  if (text.includes("металл") || text.includes("сталь")) {
    exclusionTags.add("metal");
  }

  return {
    exclusionTags: Array.from(exclusionTags),
    riskTags: Array.from(riskTags),
  };
}

function inferChildDevelopmentStages(ageMinYears?: number, ageMaxYears?: number) {
  const stages = new Set<ChildDevelopmentStage>();

  if (ageMinYears === undefined && ageMaxYears === undefined) {
    stages.add("preschool");
    stages.add("school_age");
    return Array.from(stages);
  }

  if ((ageMinYears ?? 0) <= 3 || (ageMaxYears ?? 99) <= 4) {
    stages.add("toddlers");
  }

  if ((ageMinYears ?? 0) <= 6 && (ageMaxYears ?? 99) >= 3) {
    stages.add("preschool");
  }

  if ((ageMinYears ?? 0) <= 12 && (ageMaxYears ?? 99) >= 7) {
    stages.add("school_age");
  }

  if ((ageMaxYears ?? 99) >= 13 || (ageMinYears ?? 0) >= 13) {
    stages.add("teens");
  }

  return Array.from(stages);
}

function inferCompactScore(
  footprintWidthM?: number,
  footprintLengthM?: number,
) {
  const area =
    footprintWidthM !== undefined && footprintLengthM !== undefined
      ? footprintWidthM * footprintLengthM
      : undefined;

  if (!area) {
    return 0.35;
  }

  if (area <= 6) {
    return 1;
  }

  if (area <= 12) {
    return 0.82;
  }

  if (area <= 20) {
    return 0.66;
  }

  if (area <= 35) {
    return 0.42;
  }

  return 0.18;
}

function inferGrowthScore(product: GeneratedProduct, ageMaxYears?: number) {
  const text = normalizeSelectionQueryText(
    [product.name, product.categoryName, product.subcategoryLabel, ...product.tags]
      .filter(Boolean)
      .join(" "),
  );
  let score = 0.24;

  if (
    text.includes("комплекс") ||
    text.includes("канат") ||
    text.includes("воркаут") ||
    text.includes("гимнаст")
  ) {
    score += 0.34;
  }

  if (ageMaxYears === undefined || ageMaxYears >= 10) {
    score += 0.18;
  }

  if (text.includes("мини") || text.includes("малыш")) {
    score -= 0.16;
  }

  return clamp(round(score, 2), 0, 1);
}

function inferAntiVandalScore(
  materialTags: MaterialPreferenceTag[],
  text: string,
  categoryName?: string,
) {
  if (text.includes("антиванд")) {
    return 1;
  }

  if (materialTags.includes("antivandal")) {
    return 0.86;
  }

  if (
    materialTags.includes("metal") &&
    (materialTags.includes("hdpe") || materialTags.includes("hpl"))
  ) {
    return 0.78;
  }

  if (
    categoryName === "Воркаут" ||
    categoryName === "Спортивные элементы" ||
    categoryName === "Тренажеры"
  ) {
    return 0.8;
  }

  if (materialTags.includes("metal")) {
    return 0.52;
  }

  if (materialTags.includes("hdpe") || materialTags.includes("hpl")) {
    return 0.44;
  }

  return 0.28;
}

export function buildSelectionProductProfile(product: GeneratedProduct) {
  const cached = productProfileCache.get(product.id);
  if (cached) {
    return cached;
  }

  // We keep source, derived and inferred layers separate so later imports or AI
  // enrichment can evolve without mutating the original catalog record.
  const parsedAge = parseAgeLabel(product.ageLabel);
  const parsedDimensions = parseDimensionsFromSizeLabel(product.sizeLabel);
  const materialTags = inferMaterialTags(product);
  const normalizedSourceText = normalizeSelectionQueryText(
    [
      product.name,
      product.categoryName,
      product.subcategoryLabel,
      product.description,
      ...product.tags,
      ...product.materials,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const ageMinYears = product.ageMinYears ?? parsedAge.ageMinYears;
  const ageMaxYears = product.ageMaxYears ?? parsedAge.ageMaxYears;
  const footprintWidthM = product.widthM ?? parsedDimensions.widthM;
  const footprintLengthM = product.lengthM ?? parsedDimensions.lengthM;
  const footprintAreaM2 =
    footprintWidthM !== undefined && footprintLengthM !== undefined
      ? round(footprintWidthM * footprintLengthM, 2)
      : undefined;
  const objectTypes = inferObjectTypes(product.categoryName);
  const antiVandalScore = inferAntiVandalScore(
    materialTags,
    normalizedSourceText,
    product.categoryName,
  );
  const usageTags = inferUsageTags({
    objectTypes,
    category: product.categoryName,
    materialTags,
    ageMaxYears,
    text: normalizedSourceText,
    antiVandalScore,
  });
  const { exclusionTags, riskTags } = inferExclusionTags(product);

  const keywordIndex = buildKeywordIndex([
    product.article,
    product.name,
    product.categoryName,
    product.subcategoryLabel,
    product.seriesName,
    product.description,
    product.ageLabel,
    product.sizeLabel,
    ...product.tags,
    ...product.materials,
  ]);

  const profile: SelectionProductProfile = {
    product,
    sourceData: {
      category: product.categoryName,
      subcategory: product.subcategoryLabel,
      materials: product.materials,
      ageLabel: product.ageLabel,
      ageMinYears: product.ageMinYears,
      ageMaxYears: product.ageMaxYears,
      widthM: product.widthM,
      lengthM: product.lengthM,
      sizeLabel: product.sizeLabel,
      tags: product.tags,
      name: product.name,
      description: product.description,
    },
    derivedData: {
      materialTags,
      ecoScore: inferEcoScore(materialTags),
      footprintWidthM,
      footprintLengthM,
      footprintAreaM2,
      compactScore: inferCompactScore(footprintWidthM, footprintLengthM),
      keywordIndex,
      searchableAttributes: [
        product.name,
        product.categoryName,
        product.subcategoryLabel,
        product.ageLabel,
        product.sizeLabel,
        ...product.tags,
        ...product.materials,
      ].filter((value): value is string => Boolean(value)),
      ageMinYears,
      ageMaxYears,
    },
    inferredData: {
      objectTypes,
      usageTags,
      exclusionTags,
      riskTags,
      childDevelopmentStage: inferChildDevelopmentStages(ageMinYears, ageMaxYears),
      growthScore: inferGrowthScore(product, ageMaxYears),
      antiVandalScore,
      inferredFrom: [
        product.categoryName ? `category:${slugify(product.categoryName)}` : "",
        materialTags.length > 0 ? "materials" : "",
        product.ageLabel ? "age-label" : "",
        product.sizeLabel ? "size-label" : "",
      ].filter(Boolean),
    },
    searchText: normalizeSelectionQueryText(
      [
        product.article,
        normalizedSourceText,
        product.seriesName,
        product.ageLabel,
        product.sizeLabel,
      ]
        .filter(Boolean)
        .join(" "),
    ),
    familyKey:
      product.subcategoryLabel ??
      product.seriesName ??
      product.categoryName ??
      product.article,
    confidenceScore:
      (product.imageUrl ? 0.55 : 0.2) +
      (product.basePriceRub ? 0.2 : 0) +
      (footprintAreaM2 ? 0.15 : 0) +
      (materialTags.length > 0 ? 0.1 : 0),
  };

  productProfileCache.set(product.id, profile);
  return profile;
}

export function buildSelectionProductProfiles(products: GeneratedProduct[]) {
  return products.map(buildSelectionProductProfile);
}
