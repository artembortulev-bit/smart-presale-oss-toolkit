import { defaultSelectionScoreWeights } from "@/application/selection/config";
import {
  SelectionCandidate,
  SelectionProductProfile,
  SelectionResolvedConstraints,
  SelectionScoreBreakdown,
  SelectionScoreWeights,
  UsageContextTag,
} from "@/application/selection/types";
import { clamp, round } from "@/application/selection/text-utils";

function weightedScore(value: number, weight: number) {
  return round(clamp(value, 0, 1) * weight, 2);
}

function scoreSizeFit(
  profile: SelectionProductProfile,
  constraints: SelectionResolvedConstraints,
) {
  const productArea = profile.derivedData.footprintAreaM2;

  if (!constraints.areaM2 || !productArea) {
    return 0.55;
  }

  const ratio = productArea / constraints.areaM2;

  if (ratio <= 0.18) {
    return constraints.compactPreference ? 1 : 0.88;
  }

  if (ratio <= 0.32) {
    return 0.82;
  }

  if (ratio <= 0.5) {
    return 0.62;
  }

  return 0.38;
}

function scoreAge(
  profile: SelectionProductProfile,
  constraints: SelectionResolvedConstraints,
) {
  if (
    constraints.ageMinYears === undefined &&
    constraints.ageMaxYears === undefined
  ) {
    return 0.55;
  }

  const productAgeMin = profile.derivedData.ageMinYears;
  const productAgeMax = profile.derivedData.ageMaxYears;

  if (productAgeMin === undefined && productAgeMax === undefined) {
    return 0.42;
  }

  if (
    constraints.ageMinYears !== undefined &&
    productAgeMin !== undefined &&
    productAgeMin <= constraints.ageMinYears &&
    (productAgeMax === undefined || productAgeMax >= constraints.ageMinYears)
  ) {
    return 1;
  }

  if (
    constraints.ageMaxYears !== undefined &&
    productAgeMax !== undefined &&
    productAgeMax <= constraints.ageMaxYears &&
    (productAgeMin === undefined || productAgeMin <= constraints.ageMaxYears)
  ) {
    return 0.84;
  }

  return 0.5;
}

function materialPreferenceMatch(
  profile: SelectionProductProfile,
  preference: (typeof profile.derivedData.materialTags)[number],
) {
  return profile.derivedData.materialTags.includes(preference);
}

function scoreMaterial(
  profile: SelectionProductProfile,
  constraints: SelectionResolvedConstraints,
) {
  if (constraints.materialPreferences.length === 0) {
    return 0.55;
  }

  const matches = constraints.materialPreferences.map((preference) => {
    if (preference === "eco") {
      return profile.derivedData.ecoScore;
    }

    if (preference === "antivandal") {
      return profile.inferredData.antiVandalScore;
    }

    return materialPreferenceMatch(profile, preference) ? 1 : 0.1;
  });

  const average =
    matches.reduce((sum, value) => sum + value, 0) / matches.length;

  return clamp(round(average, 2), 0, 1);
}

function usageMatchScore(
  profile: SelectionProductProfile,
  usageContext: UsageContextTag,
) {
  const usageTags = profile.inferredData.usageTags;

  if (usageTags.includes(usageContext)) {
    return 1;
  }

  if (
    ["dacha", "private_house", "cottage", "private_family"].includes(
      usageContext,
    ) &&
    usageTags.some((tag) =>
      ["dacha", "private_house", "cottage", "private_family"].includes(tag),
    )
  ) {
    return 0.8;
  }

  if (
    usageContext === "municipal" &&
    usageTags.some((tag) => ["park_public", "school"].includes(tag))
  ) {
    return 0.58;
  }

  if (
    usageContext === "park_public" &&
    usageTags.some((tag) => ["municipal", "residential_courtyard"].includes(tag))
  ) {
    return 0.72;
  }

  if (
    usageContext === "residential_courtyard" &&
    usageTags.some((tag) => ["municipal", "private_family"].includes(tag))
  ) {
    return 0.66;
  }

  return 0.18;
}

function scoreUsage(
  profile: SelectionProductProfile,
  constraints: SelectionResolvedConstraints,
) {
  if (constraints.usageContexts.length === 0) {
    return 0.55;
  }

  const matches = constraints.usageContexts.map((usageContext) =>
    usageMatchScore(profile, usageContext),
  );
  const usageScore =
    matches.reduce((sum, value) => sum + value, 0) / matches.length;

  if (constraints.antiVandalPreference) {
    return round(
      clamp(
        usageScore * 0.7 + profile.inferredData.antiVandalScore * 0.3,
        0,
        1,
      ),
      2,
    );
  }

  return round(usageScore, 2);
}

function scoreBudget(
  profile: SelectionProductProfile,
  constraints: SelectionResolvedConstraints,
) {
  if (!constraints.budgetRub || !profile.product.basePriceRub) {
    return 0.55;
  }

  const ratio = profile.product.basePriceRub / constraints.budgetRub;

  if (ratio <= 0.18) {
    return 1;
  }

  if (ratio <= 0.3) {
    return 0.86;
  }

  if (ratio <= 0.5) {
    return 0.7;
  }

  if (ratio <= 0.75) {
    return 0.42;
  }

  return 0.16;
}

function scoreGrowth(
  profile: SelectionProductProfile,
  constraints: SelectionResolvedConstraints,
) {
  if (!constraints.growthPreference) {
    return 0.55;
  }

  return profile.inferredData.growthScore;
}

function buildReasons(
  profile: SelectionProductProfile,
  constraints: SelectionResolvedConstraints,
  componentScores: Omit<SelectionScoreBreakdown["components"], "diversityPenalty">,
) {
  const reasons: string[] = [];
  const penalties: string[] = [];

  if (componentScores.sizeFit >= defaultSelectionScoreWeights.sizeFit * 0.72) {
    reasons.push(
      constraints.compactPreference
        ? "компактные размеры для заданного участка"
        : "хорошо вписывается в доступную площадь",
    );
  }

  if (componentScores.age >= defaultSelectionScoreWeights.age * 0.72) {
    if (constraints.ageMinYears !== undefined && constraints.ageMaxYears !== undefined) {
      reasons.push(
        `подходит для возраста ${constraints.ageMinYears}-${constraints.ageMaxYears} лет`,
      );
    } else if (constraints.ageMinYears !== undefined) {
      reasons.push(`подходит для возраста ${constraints.ageMinYears}+`);
    }
  }

  if (componentScores.material >= defaultSelectionScoreWeights.material * 0.72) {
    if (constraints.materialPreferences.includes("eco")) {
      reasons.push("соответствует эко-направлению");
    } else if (constraints.materialPreferences.includes("wood")) {
      reasons.push("поддерживает запрос на деревянные материалы");
    } else {
      reasons.push("совпадает по материалам и исполнению");
    }
  }

  if (componentScores.usage >= defaultSelectionScoreWeights.usage * 0.72) {
    if (constraints.usageContexts.includes("dacha")) {
      reasons.push("уместен для дачи и частного участка");
    } else if (constraints.usageContexts.includes("kindergarten")) {
      reasons.push("подходит под сценарий детского сада");
    } else if (
      constraints.usageContexts.includes("municipal") ||
      constraints.usageContexts.includes("residential_courtyard")
    ) {
      reasons.push("подходит под общественный или дворовой сценарий");
    }
  }

  if (
    constraints.growthPreference &&
    componentScores.growth >= defaultSelectionScoreWeights.growth * 0.72
  ) {
    reasons.push("может использоваться дольше базовых решений для малышей");
  }

  if (constraints.budgetRub && componentScores.budget >= defaultSelectionScoreWeights.budget * 0.72) {
    reasons.push("укладывается в ожидаемый бюджет по позиции");
  }

  if (constraints.materialPreferences.includes("eco") && profile.derivedData.ecoScore < 0.45) {
    penalties.push("эко-предпочтение выражено слабо");
  }

  if (constraints.antiVandalPreference && profile.inferredData.antiVandalScore < 0.45) {
    penalties.push("антивандальная пригодность ниже желаемой");
  }

  return { reasons, penalties };
}

export function scoreSelectionProduct(
  profile: SelectionProductProfile,
  constraints: SelectionResolvedConstraints,
  weights: SelectionScoreWeights = defaultSelectionScoreWeights,
): SelectionCandidate {
  // Weight order mirrors the current business priority: object type, size and
  // exclusions first; budget stays intentionally lighter than fit and relevance.
  const componentValues = {
    objectType: 1,
    sizeFit: scoreSizeFit(profile, constraints),
    age: scoreAge(profile, constraints),
    material: scoreMaterial(profile, constraints),
    usage: scoreUsage(profile, constraints),
    budget: scoreBudget(profile, constraints),
    growth: scoreGrowth(profile, constraints),
    confidence: profile.confidenceScore,
  };

  const components = {
    objectType: weightedScore(componentValues.objectType, weights.objectType),
    sizeFit: weightedScore(componentValues.sizeFit, weights.sizeFit),
    age: weightedScore(componentValues.age, weights.age),
    material: weightedScore(componentValues.material, weights.material),
    usage: weightedScore(componentValues.usage, weights.usage),
    budget: weightedScore(componentValues.budget, weights.budget),
    growth: weightedScore(componentValues.growth, weights.growth),
    confidence: weightedScore(componentValues.confidence, weights.confidence),
    diversityPenalty: 0,
  };

  const { reasons, penalties } = buildReasons(profile, constraints, components);

  return {
    profile,
    breakdown: {
      total: round(
        components.objectType +
          components.sizeFit +
          components.age +
          components.material +
          components.usage +
          components.budget +
          components.growth +
          components.confidence,
        2,
      ),
      components,
      reasons,
      penalties,
    },
  };
}

export function applySelectionDiversityPenalty(
  candidate: SelectionCandidate,
  familyRepeats: number,
  weights: SelectionScoreWeights = defaultSelectionScoreWeights,
) {
  const penalty =
    familyRepeats > 0 ? round(weights.diversityPenalty * familyRepeats, 2) : 0;

  return {
    ...candidate,
    breakdown: {
      ...candidate.breakdown,
      total: round(candidate.breakdown.total - penalty, 2),
      components: {
        ...candidate.breakdown.components,
        diversityPenalty: penalty,
      },
    },
  };
}
