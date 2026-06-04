import {
  exclusionLabels,
  getSelectionTargetCount,
  materialPreferenceLabels,
  objectTypeLabels,
  usageContextLabels,
} from "@/application/selection/config";
import { parseSelectionQuery } from "@/application/selection/query-parser";
import {
  SelectionConstraintChip,
  SelectionInput,
  SelectionResolvedConstraints,
  UsageContextTag,
} from "@/application/selection/types";
import { uniqueValues } from "@/application/selection/text-utils";

function buildChips(
  constraints: Omit<SelectionResolvedConstraints, "chips">,
): SelectionConstraintChip[] {
  const chips: SelectionConstraintChip[] = [
    {
      id: `objectType:${constraints.resolvedObjectType}`,
      label: objectTypeLabels[constraints.resolvedObjectType],
      tone: "neutral",
      source: "form",
    },
  ];

  if (constraints.widthM && constraints.lengthM) {
    chips.push({
      id: "dimensions",
      label: `${constraints.widthM}×${constraints.lengthM} м`,
      tone: "accent",
      source: constraints.dimensionsSource === "text" ? "text" : "form",
    });
  } else if (constraints.areaM2) {
    chips.push({
      id: "area",
      label: `${constraints.areaM2} м²`,
      tone: "accent",
      source: constraints.dimensionsSource === "text" ? "text" : "form",
    });
  }

  if (constraints.ageMinYears !== undefined && constraints.ageMaxYears !== undefined) {
    chips.push({
      id: "age-range",
      label: `${constraints.ageMinYears}-${constraints.ageMaxYears} лет`,
      tone: "accent",
      source: "text",
    });
  } else if (constraints.ageMinYears !== undefined) {
    chips.push({
      id: "age-min",
      label: `${constraints.ageMinYears}+`,
      tone: "accent",
      source: "text",
    });
  }

  constraints.usageContexts.forEach((usageContext) => {
    chips.push({
      id: `usage:${usageContext}`,
      label: usageContextLabels[usageContext],
      tone: "neutral",
      source: "text",
    });
  });

  constraints.materialPreferences.forEach((materialPreference) => {
    chips.push({
      id: `material:${materialPreference}`,
      label: materialPreferenceLabels[materialPreference],
      tone: "accent",
      source: "text",
    });
  });

  if (constraints.growthPreference) {
    chips.push({
      id: "growth",
      label: "на вырост",
      tone: "accent",
      source: "text",
    });
  }

  if (constraints.compactPreference) {
    chips.push({
      id: "compact",
      label: "компактное решение",
      tone: "neutral",
      source: "text",
    });
  }

  constraints.excludedTags.forEach((tag) => {
    chips.push({
      id: `exclude:${tag}`,
      label: exclusionLabels[tag],
      tone: "danger",
      source: "text",
    });
  });

  return chips;
}

export function buildSelectionConstraints(
  input: SelectionInput,
): SelectionResolvedConstraints {
  const textQuery = [input.clientType, input.wishes].filter(Boolean).join(". ");
  const parsedQuery = parseSelectionQuery(textQuery);

  // Structured fields stay authoritative when the user filled them explicitly;
  // the free-text parser acts as a second signal and validation layer.
  const widthM = input.widthM ?? parsedQuery.widthM;
  const lengthM = input.lengthM ?? parsedQuery.lengthM;
  const areaM2 =
    widthM && lengthM
      ? widthM * lengthM
      : parsedQuery.areaM2;
  const budgetRub = input.budgetRub ?? parsedQuery.budgetRub;

  const warnings: string[] = [];
  const notes = [...parsedQuery.parseNotes];

  if (
    input.widthM &&
    input.lengthM &&
    parsedQuery.widthM &&
    parsedQuery.lengthM &&
    (Math.abs(input.widthM - parsedQuery.widthM) > 0.1 ||
      Math.abs(input.lengthM - parsedQuery.lengthM) > 0.1)
  ) {
    warnings.push(
      "Размеры из формы и комментария отличаются: приоритет отдан полям формы.",
    );
  }

  if (input.budgetRub && parsedQuery.budgetRub && input.budgetRub !== parsedQuery.budgetRub) {
    warnings.push(
      "Бюджет в форме и комментарии отличается: приоритет отдан значению из формы.",
    );
  }

  const materialPreferences = uniqueValues(parsedQuery.materialPreferences);
  const usageContexts = uniqueValues(
    [
      ...parsedQuery.usageContexts,
      input.clientType?.toLowerCase().includes("муницип") ? "municipal" : undefined,
      input.clientType?.toLowerCase().includes("детск") ? "kindergarten" : undefined,
    ].filter((value): value is UsageContextTag => Boolean(value)),
  );
  const excludedTags = uniqueValues(parsedQuery.excludeCategories);
  const excludedKeywords = uniqueValues(parsedQuery.excludeKeywords);

  const draftConstraints = {
    formInput: input,
    parsedQuery,
    resolvedObjectType: input.objectType,
    widthM,
    lengthM,
    areaM2,
    dimensionsSource:
      input.widthM && input.lengthM
        ? ("form" as const)
        : parsedQuery.dimensionSource
          ? ("text" as const)
          : ("none" as const),
    budgetRub,
    budgetSource:
      input.budgetRub !== undefined
        ? ("form" as const)
        : parsedQuery.budgetRub !== undefined
          ? ("text" as const)
          : ("none" as const),
    textQuery,
    clientTypeText: input.clientType,
    materialPreferences,
    usageContexts,
    excludedTags,
    excludedKeywords,
    ageMinYears: parsedQuery.ageMinYears,
    ageMaxYears: parsedQuery.ageMaxYears,
    growthPreference: parsedQuery.growthPreference,
    compactPreference:
      parsedQuery.compactPreference ||
      (areaM2 !== undefined && areaM2 <= 30),
    safetyPreference: parsedQuery.safetyPreference,
    antiVandalPreference:
      parsedQuery.antiVandalPreference || usageContexts.includes("municipal"),
    targetCount: getSelectionTargetCount(areaM2),
    warnings,
    notes,
  };

  return {
    ...draftConstraints,
    chips: buildChips(draftConstraints),
  };
}
