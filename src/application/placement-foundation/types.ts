import {
  ChildDevelopmentStage,
  MaterialPreferenceTag,
  ObjectType,
  UsageContextTag,
} from "@/application/selection/types";
import { BusinessSegment } from "@/domain/catalog/types";
import { GeneratedProductCosting } from "@/application/costing/types";

export type PlacementProductKind =
  | "PLAYGROUND_COMPLEX"
  | "PLAYGROUND_ELEMENT"
  | "SLIDE"
  | "SWING"
  | "SANDBOX"
  | "ROPE_COMPLEX"
  | "KINDERGARTEN_EQUIPMENT"
  | "WORKOUT_UNIT"
  | "GYMNASTIC_UNIT"
  | "TRAINER_UNIT"
  | "SPORTS_ELEMENT"
  | "SKATE_MODULE"
  | "SMALL_ARCH_FORM"
  | "LANDSCAPE_FEATURE"
  | "PARK_FEATURE";

export type PlacementRole = "ANCHOR" | "FEATURE" | "SUPPORTING" | "ACCESSORY";

export type PlacementSafetySource = "DERIVED_RULE" | "MANUAL_ASSET";

export type PlacementThreeDStatus =
  | "WEB_READY"
  | "SOURCE_READY"
  | "PREVIEW_READY"
  | "NO_3D_DATA";

export type PlacementQualityFlag =
  | "missing_dimensions"
  | "missing_materials"
  | "missing_age"
  | "missing_image"
  | "missing_base_price"
  | "missing_costing"
  | "inferred_costing"
  | "no_3d_source"
  | "no_web_3d"
  | "no_dwg"
  | "safety_zone_derived"
  | "low_source_diversity";

export type PlacementQualityStatus =
  | "FOUNDATION_READY"
  | "REQUIRES_REVIEW"
  | "NEEDS_DATA";

export type PlacementSourceLayer = {
  sourceCount: number;
  sourceSystems: string[];
  categoryName?: string;
  subcategoryLabel?: string;
  seriesName?: string;
  materials: string[];
  ageLabel?: string;
  ageMinYears?: number;
  ageMaxYears?: number;
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  sizeLabel?: string;
  basePriceRub?: number;
  costing?: GeneratedProductCosting;
};

export type PlacementSafetyEnvelope = {
  source: PlacementSafetySource;
  ruleId: string;
  widthM?: number;
  lengthM?: number;
  areaM2?: number;
  frontClearanceM?: number;
  rearClearanceM?: number;
  sideClearanceM?: number;
};

export type PlacementDerivedLayer = {
  footprintWidthM?: number;
  footprintLengthM?: number;
  footprintAreaM2?: number;
  compactScore: number;
  safetyZone: PlacementSafetyEnvelope;
  placementContexts: string[];
  compatibilityTags: string[];
  familyRelevance: {
    private: number;
    residential: number;
    municipal: number;
    kindergarten: number;
  };
};

export type PlacementInferredLayer = {
  objectTypes: ObjectType[];
  productKind: PlacementProductKind;
  placementRole: PlacementRole;
  usageTags: UsageContextTag[];
  childDevelopmentStages: ChildDevelopmentStage[];
  materialTags: MaterialPreferenceTag[];
  ecoScore: number;
  growthScore: number;
  antiVandalScore: number;
};

export type PlacementAssetLayer = {
  primaryImageUrl?: string;
  galleryImages: number;
  previewImages: number;
  hasPreview: boolean;
  threeDStatus: PlacementThreeDStatus;
  threeDFormat?: string;
  hasRenderableViewerAsset: boolean;
  hasDwg: boolean;
  source3dFiles: number;
};

export type PlacementCommercialLayer = {
  basePriceRub?: number;
  costingAvailability: "DIRECT" | "INFERRED" | "NONE";
  costingConfidence?: number;
  defaultCostRub?: number;
  defaultMarginPercent?: number;
};

export type PlacementQualityLayer = {
  score: number;
  status: PlacementQualityStatus;
  flags: PlacementQualityFlag[];
  notes: string[];
  placementReady: boolean;
};

export type PlacementTruthProduct = {
  id: string;
  article: string;
  articleNormalized: string;
  slug: string;
  name: string;
  segmentKey?: BusinessSegment;
  source: PlacementSourceLayer;
  derived: PlacementDerivedLayer;
  inferred: PlacementInferredLayer;
  assets: PlacementAssetLayer;
  commercial: PlacementCommercialLayer;
  quality: PlacementQualityLayer;
};

export type PlacementFirstWaveItem = {
  article: string;
  articleNormalized: string;
  name: string;
  categoryName?: string;
  productKind: PlacementProductKind;
  priorityScore: number;
  qualityScore: number;
  placementReady: boolean;
  threeDStatus: PlacementThreeDStatus;
  costingAvailability: "DIRECT" | "INFERRED" | "NONE";
  safetyRuleId: string;
};

export type ProductTruthFoundation = {
  generatedAt: string;
  summary: {
    totalProducts: number;
    placementReadyProducts: number;
    foundationReadyProducts: number;
    productsWithSafetyZone: number;
    productsWithCosting: number;
    productsWithThreeDSource: number;
    productsWithWebThreeD: number;
    productsWithDwg: number;
  };
  firstWaveSummary: {
    targetCount: number;
    selectedCount: number;
    placementReadyCount: number;
    byCategory: Record<string, number>;
  };
  products: PlacementTruthProduct[];
  firstWave: PlacementFirstWaveItem[];
};
