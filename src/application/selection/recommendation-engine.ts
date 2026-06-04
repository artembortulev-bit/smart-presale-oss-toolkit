import { buildSelectionConstraints } from "@/application/selection/constraints";
import {
  buildItemMicroExplanation,
  buildSelectionRationale,
  buildSelectionSolutionName,
} from "@/application/selection/explainer";
import {
  applySelectionHardFilters,
  describeAppliedHardFilters,
} from "@/application/selection/hard-filters";
import { buildSelectionProductProfiles } from "@/application/selection/product-profile";
import {
  applySelectionDiversityPenalty,
  scoreSelectionProduct,
} from "@/application/selection/scoring";
import {
  ObjectType,
  SelectionInput,
  SelectionRecommendation,
  SelectionScoreWeights,
} from "@/application/selection/types";
import { getCatalogProducts } from "@/infrastructure/data/generated-catalog";
import { GeneratedProduct } from "@/import/catalog/types";

export type { ObjectType, SelectionInput } from "@/application/selection/types";

type BuildSelectionRecommendationOptions = {
  products?: GeneratedProduct[];
  weights?: SelectionScoreWeights;
};

function pickSelectionCandidates(
  candidates: ReturnType<typeof scoreSelectionProduct>[],
  targetCount: number,
  weights?: SelectionScoreWeights,
) {
  const remaining = [...candidates];
  const selected: ReturnType<typeof scoreSelectionProduct>[] = [];
  const familyCounts = new Map<string, number>();

  while (selected.length < targetCount && remaining.length > 0) {
    const ranked = remaining
      .map((candidate) =>
        applySelectionDiversityPenalty(
          candidate,
          familyCounts.get(candidate.profile.familyKey) ?? 0,
          weights,
        ),
      )
      .sort((left, right) => {
        if (right.breakdown.total !== left.breakdown.total) {
          return right.breakdown.total - left.breakdown.total;
        }

        return (
          (right.profile.product.basePriceRub ?? 0) -
          (left.profile.product.basePriceRub ?? 0)
        );
      });

    const winner = ranked[0];
    if (!winner) {
      break;
    }
    selected.push(winner);
    familyCounts.set(
      winner.profile.familyKey,
      (familyCounts.get(winner.profile.familyKey) ?? 0) + 1,
    );

    const winnerIndex = remaining.findIndex(
      (candidate) => candidate.profile.product.id === winner.profile.product.id,
    );

    if (winnerIndex >= 0) {
      remaining.splice(winnerIndex, 1);
    }
  }

  return selected;
}

export async function buildSelectionRecommendation(
  input: SelectionInput,
  options?: BuildSelectionRecommendationOptions,
): Promise<SelectionRecommendation> {
  const products = options?.products ?? (await getCatalogProducts());
  const constraints = buildSelectionConstraints(input);
  const filtersApplied = describeAppliedHardFilters(constraints);
  const profiles = buildSelectionProductProfiles(products);

  const filteredProfiles = profiles.map((profile) => ({
    profile,
    filterResult: applySelectionHardFilters(profile, constraints),
  }));

  const allowedProfiles = filteredProfiles
    .filter((entry) => entry.filterResult.allowed)
    .map((entry) => entry.profile);

  const filteredOutCount =
    filteredProfiles.length - allowedProfiles.length;

  const scoredCandidates = allowedProfiles
    .map((profile) =>
      scoreSelectionProduct(profile, constraints, options?.weights),
    )
    .sort((left, right) => right.breakdown.total - left.breakdown.total);

  const selectedCandidates = pickSelectionCandidates(
    scoredCandidates,
    constraints.targetCount,
    options?.weights,
  );

  const items = selectedCandidates.map((candidate) => {
    const highlights = candidate.breakdown.reasons.slice(0, 4);

    const item = {
      product: candidate.profile.product,
      quantity: 1,
      score: candidate.breakdown.total,
      reasoning: "",
      highlights,
      breakdown: candidate.breakdown,
      profile: candidate.profile,
    };

    return {
      ...item,
      reasoning: buildItemMicroExplanation(item),
    };
  });

  const estimatedTotalRub = items.reduce(
    (sum, item) => sum + (item.product.basePriceRub ?? 0),
    0,
  );

  return {
    input,
    constraints,
    solutionName: buildSelectionSolutionName(constraints),
    estimatedTotalRub,
    rationale: buildSelectionRationale(constraints, filteredOutCount),
    recognizedPreferences: constraints.chips,
    filteredOutCount,
    filtersApplied,
    items,
  };
}
