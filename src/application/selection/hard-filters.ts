import {
  SelectionProductProfile,
  SelectionResolvedConstraints,
} from "@/application/selection/types";

type HardFilterResult = {
  allowed: boolean;
  reasons: string[];
};

function passesObjectType(
  profile: SelectionProductProfile,
  constraints: SelectionResolvedConstraints,
) {
  return profile.inferredData.objectTypes.includes(constraints.resolvedObjectType);
}

function passesSizeFit(
  profile: SelectionProductProfile,
  constraints: SelectionResolvedConstraints,
) {
  if (!constraints.areaM2) {
    return true;
  }

  const productArea = profile.derivedData.footprintAreaM2;
  const productWidth = profile.derivedData.footprintWidthM;
  const productLength = profile.derivedData.footprintLengthM;

  if (!productArea || !productWidth || !productLength) {
    return true;
  }

  const directFit =
    constraints.widthM !== undefined &&
    constraints.lengthM !== undefined &&
    productWidth <= constraints.widthM &&
    productLength <= constraints.lengthM;
  const rotatedFit =
    constraints.widthM !== undefined &&
    constraints.lengthM !== undefined &&
    productWidth <= constraints.lengthM &&
    productLength <= constraints.widthM;
  const areaFit = productArea <= constraints.areaM2 * 0.95;

  if (constraints.widthM && constraints.lengthM) {
    return (directFit || rotatedFit) && areaFit;
  }

  return productArea <= constraints.areaM2 * 0.8;
}

function passesAgeFit(
  profile: SelectionProductProfile,
  constraints: SelectionResolvedConstraints,
) {
  const productAgeMin = profile.derivedData.ageMinYears;
  const productAgeMax = profile.derivedData.ageMaxYears;
  const requestedAgeMin = constraints.ageMinYears;
  const requestedAgeMax = constraints.ageMaxYears;

  if (requestedAgeMin === undefined && requestedAgeMax === undefined) {
    return true;
  }

  if (
    requestedAgeMin !== undefined &&
    productAgeMax !== undefined &&
    productAgeMax < requestedAgeMin
  ) {
    return false;
  }

  if (
    requestedAgeMax !== undefined &&
    productAgeMin !== undefined &&
    productAgeMin > requestedAgeMax
  ) {
    return false;
  }

  if (
    constraints.safetyPreference &&
    profile.inferredData.riskTags.includes("high_slide") &&
    (requestedAgeMax === undefined || requestedAgeMax <= 5)
  ) {
    return false;
  }

  return true;
}

function passesBudgetFit(
  profile: SelectionProductProfile,
  constraints: SelectionResolvedConstraints,
) {
  if (!constraints.budgetRub || !profile.product.basePriceRub) {
    return true;
  }

  return profile.product.basePriceRub <= constraints.budgetRub;
}

function passesExclusions(
  profile: SelectionProductProfile,
  constraints: SelectionResolvedConstraints,
) {
  if (
    constraints.excludedTags.some((tag) =>
      profile.inferredData.exclusionTags.includes(tag),
    )
  ) {
    return false;
  }

  if (
    constraints.excludedKeywords.some((keyword) => profile.searchText.includes(keyword))
  ) {
    return false;
  }

  return true;
}

export function applySelectionHardFilters(
  profile: SelectionProductProfile,
  constraints: SelectionResolvedConstraints,
): HardFilterResult {
  const reasons: string[] = [];

  if (!passesObjectType(profile, constraints)) {
    reasons.push("не соответствует типу объекта");
  }

  if (!passesSizeFit(profile, constraints)) {
    reasons.push("не помещается в ограничение по размерам");
  }

  if (!passesExclusions(profile, constraints)) {
    reasons.push("конфликтует с исключениями из запроса");
  }

  if (!passesAgeFit(profile, constraints)) {
    reasons.push("не соответствует возрастному диапазону");
  }

  if (!passesBudgetFit(profile, constraints)) {
    reasons.push("цена позиции выше заданного бюджета");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

export function describeAppliedHardFilters(
  constraints: SelectionResolvedConstraints,
) {
  const filters = [
    `тип объекта: ${constraints.resolvedObjectType}`,
  ];

  if (constraints.widthM && constraints.lengthM) {
    filters.push(`влезание в ${constraints.widthM}×${constraints.lengthM} м`);
  } else if (constraints.areaM2) {
    filters.push(`площадь до ${constraints.areaM2} м²`);
  }

  if (constraints.excludedTags.length > 0) {
    filters.push("исключения из комментария");
  }

  if (constraints.ageMinYears !== undefined || constraints.ageMaxYears !== undefined) {
    filters.push("возрастной фильтр");
  }

  if (constraints.budgetRub) {
    filters.push("бюджетный порог");
  }

  return filters;
}
