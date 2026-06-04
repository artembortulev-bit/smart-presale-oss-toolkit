import {
  ClientObjectType,
  ClientRequestEstimateBenchmarkProduct,
  ClientRequestSubmission,
} from "@/application/client-intake/types";
import { parseSelectionQuery } from "@/application/selection/query-parser";
import { SelectionIntentSignal } from "@/application/selection/types";
import { GeneratedProduct } from "@/import/catalog/types";

const benchmarkCategoryMap: Record<ClientObjectType, string[]> = {
  PLAYGROUND_COMPLEX: [
    "Игровые комплексы",
    "Игровые элементы",
    "Канатные комплексы",
    "Оборудование для детских садов",
    "Батуты",
  ],
  SLIDE: ["Игровые элементы", "Оборудование для детских садов"],
  SWING: ["Игровые элементы", "Оборудование для детских садов"],
  WORKOUT: [
    "Воркаут",
    "Гимнастические комплексы",
    "Спортивные элементы",
    "Тренажеры",
    "Скейт парк",
  ],
  PARK_EQUIPMENT: [
    "МАФ",
    "Декор",
    "Геопластика",
    "Уличное освещение",
    "Тренировка собак",
  ],
  CUSTOM: [],
};

const objectTypeHintRules: Array<{
  type: ClientObjectType;
  phrases: string[];
  threshold?: number;
}> = [
  {
    type: "SLIDE",
    phrases: ["горк", "скат", "slide", "gorka", "rampa"],
    threshold: 1,
  },
  {
    type: "SWING",
    phrases: ["кач", "swing", "podves"],
    threshold: 1,
  },
  {
    type: "WORKOUT",
    phrases: ["воркаут", "турник", "брусь", "тренаж", "workout", "sport"],
    threshold: 1,
  },
  {
    type: "PARK_EQUIPMENT",
    phrases: ["скам", "урн", "пергол", "бесед", "park", "maf"],
    threshold: 1,
  },
  {
    type: "PLAYGROUND_COMPLEX",
    phrases: ["игров", "площадк", "комплекс", "домик", "лаз"],
    threshold: 2,
  },
];

const materialPreferences = [
  {
    label: "дерево",
    patterns: ["дерев", "сосн", "листвен", "робини", "брус"],
    productPatterns: ["дерево", "сосна", "листвен", "робини", "брус"],
  },
  {
    label: "эко-материалы",
    patterns: ["эко", "эколог", "натурал"],
    productPatterns: ["эко", "дерево", "натурал", "robinia", "larch", "pine"],
  },
  {
    label: "HDPE",
    patterns: ["hdpe", "пнд"],
    productPatterns: ["hdpe", "пнд"],
  },
  {
    label: "HPL",
    patterns: ["hpl"],
    productPatterns: ["hpl"],
  },
  {
    label: "металл",
    patterns: ["металл", "сталь", "нерж"],
    productPatterns: ["металл", "сталь", "нерж"],
  },
] as const;

const segmentMatchMap = {
  ECONOMY: ["эконом"],
  OPTIMUM: ["оптимум"],
  PREMIUM: ["премиум", "premium"],
} as const;

type BenchmarkCandidate = {
  product: GeneratedProduct;
  score: number;
  confidence: number;
  reasons: string[];
};

export type CatalogBenchmarkResult = {
  equipmentRub: number;
  confidence: number;
  coverage: number;
  sourceCount: number;
  resolvedObjectType: ClientObjectType;
  assumedMaterials: string[];
  benchmarkProducts: ClientRequestEstimateBenchmarkProduct[];
  notes: string[];
};

function normalizeText(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function roundRub(value: number, step: number) {
  return Math.max(step, Math.round(value / step) * step);
}

function getArea(lengthM?: number, widthM?: number) {
  if (!lengthM || !widthM) {
    return undefined;
  }

  return Number((lengthM * widthM).toFixed(2));
}

function getHintText(input: ClientRequestSubmission, photoFileNames: string[]) {
  return normalizeText([input.projectName, input.notes, ...photoFileNames].filter(Boolean).join(" "));
}

function inferResolvedObjectType(
  input: ClientRequestSubmission,
  hintText: string,
): ClientObjectType {
  const matches = objectTypeHintRules
    .map((rule) => ({
      type: rule.type,
      count: rule.phrases.filter((phrase) => hintText.includes(phrase)).length,
      threshold: rule.threshold ?? 1,
    }))
    .filter((match) => match.count >= match.threshold)
    .sort((left, right) => right.count - left.count);

  if (input.objectType === "CUSTOM") {
    return matches[0]?.type ?? "CUSTOM";
  }

  if (
    input.objectType === "PLAYGROUND_COMPLEX" &&
    matches[0] &&
    ["SLIDE", "SWING"].includes(matches[0].type)
  ) {
    return matches[0].type;
  }

  return input.objectType;
}

function getObjectTypeCategories(objectType: ClientObjectType) {
  return benchmarkCategoryMap[objectType];
}

function getProductText(product: GeneratedProduct) {
  return normalizeText(
    [
      product.article,
      product.name,
      product.categoryName,
      product.subcategoryLabel,
      product.seriesName,
      ...(product.materials ?? []),
      ...(product.tags ?? []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function fitsRequestedFootprint(
  input: ClientRequestSubmission,
  product: GeneratedProduct,
  tolerance = 1.08,
) {
  if (!input.widthM || !input.lengthM || !product.widthM || !product.lengthM) {
    return true;
  }

  const directFit =
    product.widthM <= input.widthM * tolerance &&
    product.lengthM <= input.lengthM * tolerance;
  const rotatedFit =
    product.widthM <= input.lengthM * tolerance &&
    product.lengthM <= input.widthM * tolerance;

  return directFit || rotatedFit;
}

function getDimensionScore(
  input: ClientRequestSubmission,
  resolvedObjectType: ClientObjectType,
  product: GeneratedProduct,
  reasons: string[],
) {
  let score = 0;
  const requestArea = getArea(input.lengthM, input.widthM);
  const productArea = getArea(product.lengthM, product.widthM);

  if (!fitsRequestedFootprint(input, product)) {
    return -24;
  }

  if (requestArea && productArea) {
    const ratio = Math.min(requestArea, productArea) / Math.max(requestArea, productArea);
    score += ratio * 22;

    if (ratio >= 0.72) {
      reasons.push(
        `габариты близки к запросу (${product.sizeLabel ?? `${product.lengthM}×${product.widthM} м`})`,
      );
    }
  } else if (input.lengthM && input.widthM) {
    score += 4;
  }

  const shouldUseHeightSignal = !(
    input.objectType === "PLAYGROUND_COMPLEX" &&
    (resolvedObjectType === "SLIDE" || resolvedObjectType === "SWING")
  );

  if (shouldUseHeightSignal && input.heightM && product.heightM) {
    const minHeight = Math.min(input.heightM, product.heightM);
    const maxHeight = Math.max(input.heightM, product.heightM);
    const ratio = minHeight / maxHeight;
    score += ratio * 8;

    if (ratio >= 0.78) {
      reasons.push(`высота близка к ориентиру ${input.heightM} м`);
    }
  }

  return score;
}

function getSubtypeScore(
  resolvedObjectType: ClientObjectType,
  hintText: string,
  productText: string,
  reasons: string[],
) {
  let score = 0;

  if (resolvedObjectType === "SLIDE" && /(горк|скат|slide|gorka)/i.test(productText)) {
    score += 18;
    reasons.push("совпадает с распознанным типом: горка");
  }

  if (resolvedObjectType === "SWING" && /(кач|swing|подвес)/i.test(productText)) {
    score += 18;
    reasons.push("совпадает с распознанным типом: качели");
  }

  if (
    resolvedObjectType === "WORKOUT" &&
    /(воркаут|турник|брусь|тренаж|workout|sport)/i.test(productText)
  ) {
    score += 18;
    reasons.push("совпадает со спортивным сценарием");
  }

  if (
    resolvedObjectType === "PLAYGROUND_COMPLEX" &&
    /(комплекс|игров|площадк|домик|лаз)/i.test(productText)
  ) {
    score += 10;
  }

  if (
    /(дача|частн|коттедж)/i.test(hintText) &&
    /(neo eco|эко|wood|дерев|robinia)/i.test(productText)
  ) {
    score += 6;
  }

  return score;
}

function getKeywordScore(
  hintText: string,
  productText: string,
  reasons: string[],
) {
  const tokens = unique(hintText.split(" ").filter((token) => token.length >= 4)).slice(0, 14);
  const queryMatches = tokens.filter((token) => productText.includes(token));

  if (queryMatches.length === 0) {
    return 0;
  }

  reasons.push(`совпадает по запросу: ${queryMatches.slice(0, 3).join(", ")}`);
  return Math.min(16, queryMatches.length * 3.8);
}

function getMaterialScore(
  parsedQueryText: string,
  productText: string,
  reasons: string[],
) {
  let score = 0;

  materialPreferences.forEach((preference) => {
    const requestMatches = preference.patterns.some((pattern) => parsedQueryText.includes(pattern));
    if (!requestMatches) {
      return;
    }

    const productMatches = preference.productPatterns.some((pattern) => productText.includes(pattern));
    if (!productMatches) {
      return;
    }

    score += preference.label === "эко-материалы" ? 7 : 5;
    reasons.push(`поддерживает предпочтение: ${preference.label}`);
  });

  return Math.min(score, 14);
}

function getSegmentScore(product: GeneratedProduct, segment: ClientRequestSubmission["segment"]) {
  const productText = getProductText(product);
  return segmentMatchMap[segment].some((term) => productText.includes(term)) ? 5 : 0;
}

function buildPriceBand(
  candidates: BenchmarkCandidate[],
  hintText: string,
  resolvedObjectType: ClientObjectType,
) {
  if (candidates.length <= 2) {
    return candidates;
  }

  const prices = candidates
    .map((candidate) => candidate.product.basePriceRub ?? 0)
    .filter((value) => value > 0)
    .sort((left, right) => left - right);

  const median = prices[Math.floor(prices.length / 2)] ?? prices[0] ?? 0;
  const isPrivateCase = /(дача|частн|коттедж|семь|для дома)/i.test(hintText);
  const upperMultiplier =
    resolvedObjectType === "SLIDE" && isPrivateCase ? 1.35 : isPrivateCase ? 1.65 : 2.1;
  const lowerMultiplier = 0.35;

  const trimmed = candidates.filter((candidate) => {
    const price = candidate.product.basePriceRub ?? 0;
    const slidePrivateCap =
      resolvedObjectType === "SLIDE" && isPrivateCase ? 800_000 : Number.POSITIVE_INFINITY;

    return (
      price >= median * lowerMultiplier &&
      price <= median * upperMultiplier &&
      price <= slidePrivateCap
    );
  });

  if (resolvedObjectType === "SLIDE" && isPrivateCase) {
    const slidePrices = trimmed
      .map((candidate) => candidate.product.basePriceRub ?? 0)
      .filter((value) => value > 0)
      .sort((left, right) => left - right);

    if (slidePrices.length >= 3) {
      const priceBandLimit =
        slidePrices[
          Math.min(slidePrices.length - 1, Math.floor(slidePrices.length * 0.6))
        ] ?? slidePrices[slidePrices.length - 1] ?? Number.POSITIVE_INFINITY;
      const lowerBand = trimmed.filter(
        (candidate) => (candidate.product.basePriceRub ?? 0) <= priceBandLimit * 1.08,
      );

      if (lowerBand.length >= 2) {
        return lowerBand;
      }
    }
  }

  if (resolvedObjectType === "SLIDE" && isPrivateCase && trimmed.length > 0) {
    return trimmed;
  }

  return trimmed.length >= 2 ? trimmed : candidates;
}

function buildBenchmarkProducts(
  candidates: BenchmarkCandidate[],
): ClientRequestEstimateBenchmarkProduct[] {
  return candidates.slice(0, 4).map((candidate) => ({
    article: candidate.product.article,
    name: candidate.product.name,
    categoryName: candidate.product.categoryName,
    basePriceRub: candidate.product.basePriceRub ?? 0,
    costRub: candidate.product.costing?.defaultCostRub,
    confidence: candidate.confidence,
    score: Number(candidate.score.toFixed(2)),
    reasons: candidate.reasons,
  }));
}

function scoreCandidate(params: {
  input: ClientRequestSubmission;
  resolvedObjectType: ClientObjectType;
  product: GeneratedProduct;
  hintText: string;
  parsedQueryText: string;
  querySignal: SelectionIntentSignal;
}) {
  const { input, resolvedObjectType, product, hintText, parsedQueryText, querySignal } = params;

  if (!product.basePriceRub || !product.costing?.defaultCostRub) {
    return null;
  }

  const categories = getObjectTypeCategories(resolvedObjectType);
  const normalizedCategoryName = normalizeText(product.categoryName);
  const productText = getProductText(product);
  const categoryMatch =
    resolvedObjectType === "CUSTOM" ||
    categories.length === 0 ||
    (normalizedCategoryName
      ? categories.some((category) => normalizeText(category) === normalizedCategoryName)
      : false) ||
    (resolvedObjectType === "PLAYGROUND_COMPLEX" &&
      /(игров|комплекс|площадк|домик|лаз)/i.test(productText)) ||
    (resolvedObjectType === "SLIDE" && /(горк|скат|slide|gorka)/i.test(productText)) ||
    (resolvedObjectType === "SWING" && /(кач|swing|подвес)/i.test(productText)) ||
    (resolvedObjectType === "WORKOUT" &&
      /(воркаут|турник|брусь|тренаж|workout|sport|скейт)/i.test(productText)) ||
    (resolvedObjectType === "PARK_EQUIPMENT" &&
      /(скам|урн|пергол|бесед|маф|парк)/i.test(productText));

  if (!categoryMatch) {
    return null;
  }
  const reasons: string[] = [];
  let score = 0;

  score += resolvedObjectType === "CUSTOM" ? 14 : 28;
  if (product.categoryName) {
    reasons.push(`категория ${product.categoryName}`);
  }

  const dimensionScore = getDimensionScore(input, resolvedObjectType, product, reasons);
  if (dimensionScore < 0) {
    return null;
  }

  score += dimensionScore;
  score += getSubtypeScore(resolvedObjectType, hintText, productText, reasons);
  score += getKeywordScore(hintText, productText, reasons);
  score += getMaterialScore(parsedQueryText, productText, reasons);
  score += getSegmentScore(product, input.segment);
  score += Math.min(8, (product.costing.confidence ?? 0) * 8);

  if (
    querySignal.usageContexts.includes("dacha") ||
    querySignal.usageContexts.includes("private_house")
  ) {
    if ((product.basePriceRub ?? 0) > (resolvedObjectType === "SLIDE" ? 750_000 : 1_500_000)) {
      score -= 18;
    }

    const productArea = getArea(product.lengthM, product.widthM);
    if (productArea && productArea > 15) {
      score -= 10;
    }
  }

  if (
    querySignal.excludeCategories.includes("sandbox") &&
    productText.includes("песоч")
  ) {
    return null;
  }

  if (score < 24) {
    return null;
  }

  const confidence =
    (product.costing.confidence ?? 0) *
    (product.costing.availability === "DIRECT" ? 1 : 0.92);

  return {
    product,
    score: Number(score.toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    reasons: unique(reasons).slice(0, 4),
  } satisfies BenchmarkCandidate;
}

export function buildCatalogBenchmarkEstimate(
  input: ClientRequestSubmission,
  products: GeneratedProduct[],
  options?: {
    photoFileNames?: string[];
  },
): CatalogBenchmarkResult | null {
  const photoFileNames = options?.photoFileNames ?? [];
  const hintText = getHintText(input, photoFileNames);
  const rawQueryText = `${input.projectName ?? ""} ${input.notes ?? ""}`.trim();
  const parsedQueryText = normalizeText(rawQueryText);
  const querySignal = parseSelectionQuery(rawQueryText);
  const resolvedObjectType = inferResolvedObjectType(input, hintText);
  const isPrivateSlideCase =
    resolvedObjectType === "SLIDE" &&
    querySignal.usageContexts.some((usageTag) =>
      ["dacha", "private_house", "cottage", "private_family"].includes(usageTag),
    );

  const candidates = products
    .map((product) =>
      scoreCandidate({
        input,
        resolvedObjectType,
        product,
        hintText,
        parsedQueryText,
        querySignal,
      }),
    )
    .filter((candidate): candidate is BenchmarkCandidate => Boolean(candidate))
    .sort((left, right) => right.score - left.score);

  if (candidates.length === 0) {
    return null;
  }

  const initialPool = isPrivateSlideCase
    ? candidates
        .filter((candidate) => (candidate.product.basePriceRub ?? 0) <= 800_000)
        .slice(0, 8)
    : candidates.slice(0, Math.min(10, candidates.length));
  const pricingPool = buildPriceBand(initialPool, hintText, resolvedObjectType);
  const benchmarkPool = pricingPool.slice(0, Math.min(4, pricingPool.length));

  const weightedTotals = benchmarkPool.reduce(
    (accumulator, candidate) => {
      const weight = candidate.score * (0.72 + candidate.confidence * 0.28);
      return {
        weight: accumulator.weight + weight,
        price: accumulator.price + (candidate.product.basePriceRub ?? 0) * weight,
        confidence: accumulator.confidence + candidate.confidence,
      };
    },
    { weight: 0, price: 0, confidence: 0 },
  );

  if (weightedTotals.weight <= 0) {
    return null;
  }

  const averagePrice = weightedTotals.price / weightedTotals.weight;
  const averageConfidence = weightedTotals.confidence / benchmarkPool.length;
  const coverage = Math.min(1, averageConfidence * Math.min(1, benchmarkPool.length / 4));
  const assumedMaterials = unique(
    benchmarkPool.flatMap((candidate) => candidate.product.materials ?? []),
  ).slice(0, 6);
  const notePool = [
    resolvedObjectType !== input.objectType
      ? `По фото и тексту запрос уточнен до типа «${
          resolvedObjectType === "SLIDE"
            ? "горка"
            : resolvedObjectType === "SWING"
              ? "качели"
              : resolvedObjectType === "WORKOUT"
                ? "спорт / воркаут"
                : resolvedObjectType === "PARK_EQUIPMENT"
                  ? "МАФ / парк"
                  : "игровой комплекс"
        }».`
      : "",
    isPrivateSlideCase
      ? "Для частного сценария по горке из выборки исключены крупные общественные комплексы и дорогие модели."
      : "",
    querySignal.excludeCategories.includes("sandbox")
      ? "Из выдачи исключены позиции с песочницами."
      : "",
    querySignal.materialPreferences.some((preference) =>
      ["eco", "wood", "natural"].includes(preference),
    )
      ? "В приоритете оставлены позиции с экологичным или деревянным исполнением."
      : "",
  ];

  return {
    equipmentRub: roundRub(averagePrice, 5_000),
    confidence: Number(averageConfidence.toFixed(2)),
    coverage: Number(coverage.toFixed(2)),
    sourceCount: benchmarkPool.length,
    resolvedObjectType,
    assumedMaterials,
    benchmarkProducts: buildBenchmarkProducts(benchmarkPool),
    notes: unique(notePool.filter(Boolean)),
  };
}
