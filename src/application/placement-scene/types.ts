import { PlacementProductKind, PlacementRole, PlacementTruthProduct } from "@/application/placement-foundation/types";
import { SelectionRecommendation } from "@/application/selection/types";

export type PlacementSceneBounds = {
  widthM: number;
  lengthM: number;
  areaM2: number;
  source: "FORM" | "TEXT" | "DERIVED";
};

export type PlacementSceneWarningType =
  | "OUT_OF_BOUNDS"
  | "SAFETY_OVERLAP"
  | "PLOT_IS_TIGHT"
  | "NO_DIMENSIONS";

export type PlacementSceneWarning = {
  type: PlacementSceneWarningType;
  message: string;
  itemId?: string;
  relatedItemId?: string;
  severity: "warning" | "danger";
};

export type PlacementSceneItem = {
  id: string;
  productSlug?: string;
  article: string;
  name: string;
  categoryName?: string;
  imageUrl?: string;
  basePriceRub?: number;
  placementRole: PlacementRole;
  productKind: PlacementProductKind;
  widthM: number;
  lengthM: number;
  safetyWidthM: number;
  safetyLengthM: number;
  positionXM: number;
  positionYM: number;
  rotationDeg: 0 | 90 | 180 | 270;
  colorToken: "accent" | "graphite" | "sand" | "sage" | "copper";
  threeDStatus?: "WEB_READY" | "SOURCE_READY" | "PREVIEW_READY" | "NO_3D_DATA";
  hasRenderableViewerAsset?: boolean;
  hasDwg?: boolean;
  rationale: string[];
  qualityScore: number;
  placementReady: boolean;
  source: {
    recommendationScore: number;
    reasoning: string;
    highlights: string[];
  };
};

export type PlacementSceneEvaluationItem = PlacementSceneItem & {
  orientedWidthM: number;
  orientedLengthM: number;
  footprintRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  safetyRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  warnings: PlacementSceneWarning[];
};

export type PlacementSceneEvaluation = {
  items: PlacementSceneEvaluationItem[];
  warnings: PlacementSceneWarning[];
  summary: {
    itemsCount: number;
    anchorCount: number;
    safetyCoverageRatio: number;
    footprintCoverageRatio: number;
    outOfBoundsCount: number;
    collisionCount: number;
    estimatedTotalRub: number;
  };
};

export type PlacementScenePlan = {
  recommendation: Pick<
    SelectionRecommendation,
    "solutionName" | "rationale" | "estimatedTotalRub"
  >;
  bounds: PlacementSceneBounds;
  items: PlacementSceneItem[];
  evaluation: PlacementSceneEvaluation;
  rationale: string[];
  explainability: string[];
};

export type BuildPlacementSceneOptions = {
  targetItems?: number;
  truthProducts?: PlacementTruthProduct[];
};
