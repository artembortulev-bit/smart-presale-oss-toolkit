import { SelectionRecommendation } from "@/application/selection/types";

export type PersistSelectionRecommendationInput = {
  clientRequestId?: string;
  projectId?: string;
  createdByUserId?: string;
  recommendation: SelectionRecommendation;
};

export type PersistedSelectionRecommendationSet = {
  sessionId: string;
  recommendationCount: number;
};

export type SelectionRepository = {
  findLatestSessionByClientRequestId(
    clientRequestId: string,
  ): Promise<PersistedSelectionRecommendationSet | null>;
  saveRecommendationSet(
    input: PersistSelectionRecommendationInput,
  ): Promise<PersistedSelectionRecommendationSet>;
};
