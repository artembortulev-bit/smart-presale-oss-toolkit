import {
  antiVandalPreferencePhrases,
  compactPreferencePhrases,
  exclusionRules,
  growthPreferencePhrases,
  materialPreferenceRules,
  objectTypeKeywordRules,
  safetyPreferencePhrases,
  toddlerPreferencePhrases,
  usageKeywordRules,
} from "@/application/selection/dictionaries";
import {
  ExclusionTag,
  SelectionIntentSignal,
  UsageContextTag,
} from "@/application/selection/types";
import {
  includesAnyPhrase,
  normalizeSelectionQueryText,
  round,
  toNumber,
  uniqueValues,
} from "@/application/selection/text-utils";

function convertDimensionToMeters(
  rawValue: string | undefined,
  unit: string | undefined,
) {
  const value = toNumber(rawValue);

  if (value === undefined) {
    return undefined;
  }

  if (unit === "мм") {
    return round(value / 1000, 3);
  }

  if (unit === "см") {
    return round(value / 100, 3);
  }

  if (!unit && value >= 100) {
    return round(value / 1000, 3);
  }

  return round(value, 3);
}

function parseDimensionsFromText(text: string) {
  const explicitDimensionsPattern =
    /(?:участок|площадка|размер(?:ом)?|влез(?:ло|ет)?(?: на участок)?|на участок|место|зона)?\s*(\d+(?:[.,]\d+)?)\s*(мм|см|м)?\s*(?:x|х|×|на)\s*(\d+(?:[.,]\d+)?)\s*(мм|см|м)?(?:\s*(?:м|метр|метра|метров))?/i;
  const explicitDimensionsMatch = text.match(explicitDimensionsPattern);

  if (explicitDimensionsMatch) {
    const widthM = convertDimensionToMeters(
      explicitDimensionsMatch[1],
      explicitDimensionsMatch[2],
    );
    const lengthM = convertDimensionToMeters(
      explicitDimensionsMatch[3],
      explicitDimensionsMatch[4] ?? explicitDimensionsMatch[2],
    );

    if (widthM && lengthM) {
      return {
        widthM,
        lengthM,
        areaM2: round(widthM * lengthM, 2),
        dimensionSource: "dimensions" as const,
      };
    }
  }

  const areaMatch = text.match(
    /(\d+(?:[.,]\d+)?)\s*(?:м2|м²|кв\.?\s*м|квадратных?\s*метр)/i,
  );
  const areaM2 = toNumber(areaMatch?.[1]);

  if (areaM2 !== undefined) {
    return {
      areaM2: round(areaM2, 2),
      dimensionSource: "area" as const,
    };
  }

  return {};
}

function parseAgesFromText(text: string) {
  const rangeMatch = text.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(?:лет|года|год)?/i);
  if (rangeMatch) {
    return {
      ageMinYears: Number(rangeMatch[1]),
      ageMaxYears: Number(rangeMatch[2]),
    };
  }

  const plusMatch = text.match(/(\d{1,2})\s*\+/i);
  if (plusMatch) {
    return {
      ageMinYears: Number(plusMatch[1]),
    };
  }

  const fromMatch = text.match(/(?:от|для детей от|детям от)\s*(\d{1,2})\s*(?:лет|года|год)/i);
  if (fromMatch) {
    return {
      ageMinYears: Number(fromMatch[1]),
    };
  }

  if (includesAnyPhrase(text, toddlerPreferencePhrases)) {
    return {
      ageMinYears: 2,
      ageMaxYears: 4,
    };
  }

  return {};
}

function parseBudgetFromText(text: string) {
  const budgetMatch = text.match(
    /(?:бюджет\s*)?(?:до|в пределах|около)\s*(\d+(?:[.,]\d+)?)\s*(млн|миллион(?:а|ов)?|тыс|тысяч(?:и)?|руб(?:лей|\.|ля)?)?/i,
  );

  if (!budgetMatch) {
    return undefined;
  }

  const base = toNumber(budgetMatch[1]);

  if (base === undefined) {
    return undefined;
  }

  const unit = budgetMatch[2]?.toLowerCase();

  if (!unit || unit.startsWith("руб")) {
    return Math.round(base);
  }

  if (unit.startsWith("млн") || unit.startsWith("миллион")) {
    return Math.round(base * 1_000_000);
  }

  if (unit.startsWith("тыс") || unit.startsWith("тысяч")) {
    return Math.round(base * 1_000);
  }

  return Math.round(base);
}

function inferTargetUse(usageContexts: UsageContextTag[]) {
  if (usageContexts.includes("kindergarten")) {
    return "kindergarten" as const;
  }

  if (usageContexts.includes("residential_courtyard")) {
    return "residential_courtyard" as const;
  }

  if (
    usageContexts.includes("municipal") ||
    usageContexts.includes("park_public")
  ) {
    return "municipal_public" as const;
  }

  if (
    usageContexts.includes("dacha") ||
    usageContexts.includes("private_house") ||
    usageContexts.includes("cottage") ||
    usageContexts.includes("private_family")
  ) {
    return "private_family" as const;
  }

  return undefined;
}

function inferSolutionIntent(input: {
  growthPreference: boolean;
  compactPreference: boolean;
  safetyPreference: boolean;
}) {
  if (input.growthPreference) {
    return "long_term_use" as const;
  }

  if (input.compactPreference) {
    return "compact_solution" as const;
  }

  if (input.safetyPreference) {
    return "safe_for_toddlers" as const;
  }

  return undefined;
}

export function parseSelectionQuery(text: string): SelectionIntentSignal {
  // The parser stays deterministic on purpose: the next AI/NLP layer can enrich
  // the signal later, but this baseline must remain reproducible and testable.
  const normalizedText = normalizeSelectionQueryText(text);

  if (!normalizedText) {
    return {
      originalText: text,
      normalizedText,
      materialPreferences: [],
      usageContexts: [],
      growthPreference: false,
      compactPreference: false,
      safetyPreference: false,
      antiVandalPreference: false,
      excludeCategories: [],
      excludeKeywords: [],
      parseNotes: [],
    };
  }

  const matchedObjectTypes = objectTypeKeywordRules
    .filter((rule) => includesAnyPhrase(normalizedText, rule.phrases))
    .map((rule) => rule.value);
  const objectType = matchedObjectTypes[0];

  const usageContexts = uniqueValues(
    usageKeywordRules
      .filter((rule) => includesAnyPhrase(normalizedText, rule.phrases))
      .map((rule) => rule.value),
  );

  const materialPreferences = uniqueValues(
    materialPreferenceRules
      .filter((rule) => includesAnyPhrase(normalizedText, rule.phrases))
      .map((rule) => rule.value),
  );

  const matchedExclusions = exclusionRules.filter((rule) =>
    includesAnyPhrase(normalizedText, rule.phrases),
  );
  const excludeCategories = uniqueValues(
    matchedExclusions.map((rule) => rule.value),
  );
  const excludeKeywords = uniqueValues(
    matchedExclusions.flatMap((rule) => rule.keywords),
  );

  const compactPreference = includesAnyPhrase(
    normalizedText,
    compactPreferencePhrases,
  );
  const growthPreference = includesAnyPhrase(
    normalizedText,
    growthPreferencePhrases,
  );
  const safetyPreference = includesAnyPhrase(
    normalizedText,
    safetyPreferencePhrases,
  );
  const antiVandalPreference =
    includesAnyPhrase(normalizedText, antiVandalPreferencePhrases) ||
    materialPreferences.includes("antivandal");

  const dimensions = parseDimensionsFromText(normalizedText);
  const ages = parseAgesFromText(normalizedText);
  const budgetRub = parseBudgetFromText(normalizedText);

  const parseNotes: string[] = [];

  if (dimensions.dimensionSource === "dimensions") {
    parseNotes.push("Размеры площадки распознаны из комментария.");
  } else if (dimensions.dimensionSource === "area") {
    parseNotes.push("Распознана только площадь; точные стороны площадки не указаны.");
  }

  if (ages.ageMinYears !== undefined || ages.ageMaxYears !== undefined) {
    parseNotes.push("Возрастной диапазон распознан из комментария.");
  }

  if (excludeCategories.length > 0) {
    parseNotes.push("Система распознала исключения из свободного текста.");
  }

  return {
    originalText: text,
    normalizedText,
    objectType,
    widthM: dimensions.widthM,
    lengthM: dimensions.lengthM,
    areaM2: dimensions.areaM2,
    dimensionSource: dimensions.dimensionSource,
    budgetRub,
    materialPreferences,
    usageContexts,
    ageMinYears: ages.ageMinYears,
    ageMaxYears: ages.ageMaxYears,
    growthPreference,
    compactPreference,
    safetyPreference,
    antiVandalPreference,
    excludeCategories,
    excludeKeywords,
    targetUse: inferTargetUse(usageContexts),
    solutionIntent: inferSolutionIntent({
      growthPreference,
      compactPreference,
      safetyPreference,
    }),
    parseNotes,
  };
}
