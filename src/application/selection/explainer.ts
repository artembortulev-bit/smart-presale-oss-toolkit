import {
  objectTypeLabels,
  usageContextLabels,
} from "@/application/selection/config";
import {
  SelectionRecommendationItem,
  SelectionResolvedConstraints,
} from "@/application/selection/types";
import { formatPriceRub } from "@/shared/utils/money";

function describeContext(constraints: SelectionResolvedConstraints) {
  const parts: string[] = [];

  if (constraints.usageContexts.length > 0) {
    parts.push(
      constraints.usageContexts
        .map((usageContext) => usageContextLabels[usageContext])
        .join(", "),
    );
  }

  if (constraints.widthM && constraints.lengthM) {
    parts.push(`участка ${constraints.widthM}×${constraints.lengthM} м`);
  } else if (constraints.areaM2) {
    parts.push(`площади ${constraints.areaM2} м²`);
  }

  if (
    constraints.ageMinYears !== undefined &&
    constraints.ageMaxYears !== undefined
  ) {
    parts.push(`возраста ${constraints.ageMinYears}-${constraints.ageMaxYears} лет`);
  } else if (constraints.ageMinYears !== undefined) {
    parts.push(`возраста ${constraints.ageMinYears}+`);
  }

  if (constraints.materialPreferences.length > 0) {
    if (constraints.materialPreferences.includes("eco")) {
      parts.push("предпочтения экологичных материалов");
    } else {
      parts.push("материальных предпочтений клиента");
    }
  }

  if (constraints.growthPreference) {
    parts.push("запроса на решение на вырост");
  }

  if (constraints.excludedTags.length > 0) {
    parts.push("заданных исключений");
  }

  if (constraints.budgetRub) {
    parts.push(`ориентира по бюджету ${formatPriceRub(constraints.budgetRub)}`);
  }

  return parts;
}

export function buildSelectionRationale(
  constraints: SelectionResolvedConstraints,
  filteredOutCount: number,
) {
  const contextParts = describeContext(constraints);
  const objectLabel = objectTypeLabels[constraints.resolvedObjectType].toLowerCase();

  const base = `Подбор выполнен как пресейл-рекомендация для сценария «${objectLabel}»`;
  const details =
    contextParts.length > 0
      ? ` с учетом ${contextParts.join(", ")}`
      : "";
  const tail =
    filteredOutCount > 0
      ? `. Жесткими фильтрами отсечено ${filteredOutCount} неподходящих позиций, затем остаток отсортирован по релевантности.`
      : ". Список отсортирован по релевантности и объяснимым весам.";

  return `${base}${details}${tail}`;
}

export function buildSelectionSolutionName(
  constraints: SelectionResolvedConstraints,
) {
  const contextPrefix = constraints.compactPreference
    ? "Компактное решение"
    : "Рекомендованное решение";

  if (constraints.usageContexts.includes("dacha")) {
    return `${contextPrefix} для дачи`;
  }

  if (constraints.usageContexts.includes("kindergarten")) {
    return `${contextPrefix} для детского сада`;
  }

  if (constraints.usageContexts.includes("residential_courtyard")) {
    return `${contextPrefix} для двора ЖК`;
  }

  if (constraints.usageContexts.includes("municipal")) {
    return `${contextPrefix} для муниципального объекта`;
  }

  return `${contextPrefix}: ${objectTypeLabels[constraints.resolvedObjectType]}`;
}

export function buildItemMicroExplanation(
  item: SelectionRecommendationItem,
) {
  return item.highlights.length > 0
    ? item.highlights.join("; ")
    : "Позиция прошла жесткие фильтры и попала в верхнюю часть ранжирования.";
}
