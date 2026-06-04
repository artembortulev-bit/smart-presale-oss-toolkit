import { GeneratedProduct } from "@/import/catalog/types";

export type ObjectType =
  | "playground"
  | "school_sport"
  | "kindergarten"
  | "park";

export type SelectionSegment = "ECONOMY" | "OPTIMUM" | "PREMIUM";

export type MaterialPreferenceTag =
  | "eco"
  | "wood"
  | "natural"
  | "hdpe"
  | "hpl"
  | "metal"
  | "antivandal";

export type UsageContextTag =
  | "dacha"
  | "private_house"
  | "cottage"
  | "private_family"
  | "municipal"
  | "residential_courtyard"
  | "kindergarten"
  | "school"
  | "park_public";

export type ExclusionTag =
  | "sandbox"
  | "swing"
  | "metal"
  | "bright_colors"
  | "rope"
  | "high_slide"
  | "complex_climb";

export type ChildDevelopmentStage =
  | "toddlers"
  | "preschool"
  | "school_age"
  | "teens";

export type SelectionInput = {
  objectType: ObjectType;
  widthM?: number;
  lengthM?: number;
  segment: SelectionSegment;
  budgetRub?: number;
  clientType?: string;
  wishes?: string;
  needsDelivery: boolean;
  needsInstallation: boolean;
};

export type SelectionIntentSignal = {
  originalText: string;
  normalizedText: string;
  objectType?: ObjectType;
  widthM?: number;
  lengthM?: number;
  areaM2?: number;
  dimensionSource?: "dimensions" | "area";
  budgetRub?: number;
  materialPreferences: MaterialPreferenceTag[];
  usageContexts: UsageContextTag[];
  ageMinYears?: number;
  ageMaxYears?: number;
  growthPreference: boolean;
  compactPreference: boolean;
  safetyPreference: boolean;
  antiVandalPreference: boolean;
  excludeCategories: ExclusionTag[];
  excludeKeywords: string[];
  targetUse?:
    | "private_family"
    | "municipal_public"
    | "kindergarten"
    | "residential_courtyard";
  solutionIntent?: "long_term_use" | "compact_solution" | "safe_for_toddlers";
  parseNotes: string[];
};

export type SelectionConstraintChipTone =
  | "neutral"
  | "accent"
  | "warning"
  | "danger";

export type SelectionConstraintChip = {
  id: string;
  label: string;
  tone: SelectionConstraintChipTone;
  source: "form" | "text" | "derived";
};

export type SelectionResolvedConstraints = {
  formInput: SelectionInput;
  parsedQuery: SelectionIntentSignal;
  resolvedObjectType: ObjectType;
  widthM?: number;
  lengthM?: number;
  areaM2?: number;
  dimensionsSource: "form" | "text" | "none";
  budgetRub?: number;
  budgetSource: "form" | "text" | "none";
  textQuery: string;
  clientTypeText?: string;
  materialPreferences: MaterialPreferenceTag[];
  usageContexts: UsageContextTag[];
  excludedTags: ExclusionTag[];
  excludedKeywords: string[];
  ageMinYears?: number;
  ageMaxYears?: number;
  growthPreference: boolean;
  compactPreference: boolean;
  safetyPreference: boolean;
  antiVandalPreference: boolean;
  targetCount: number;
  chips: SelectionConstraintChip[];
  warnings: string[];
  notes: string[];
};

export type SelectionProductSourceData = {
  category?: string;
  subcategory?: string;
  materials: string[];
  ageLabel?: string;
  ageMinYears?: number;
  ageMaxYears?: number;
  widthM?: number;
  lengthM?: number;
  sizeLabel?: string;
  tags: string[];
  name: string;
  description?: string;
};

export type SelectionProductDerivedData = {
  materialTags: MaterialPreferenceTag[];
  ecoScore: number;
  footprintWidthM?: number;
  footprintLengthM?: number;
  footprintAreaM2?: number;
  compactScore: number;
  keywordIndex: string[];
  searchableAttributes: string[];
  ageMinYears?: number;
  ageMaxYears?: number;
};

export type SelectionProductInferredData = {
  objectTypes: ObjectType[];
  usageTags: UsageContextTag[];
  exclusionTags: ExclusionTag[];
  riskTags: ExclusionTag[];
  childDevelopmentStage: ChildDevelopmentStage[];
  growthScore: number;
  antiVandalScore: number;
  inferredFrom: string[];
};

export type SelectionProductProfile = {
  product: GeneratedProduct;
  sourceData: SelectionProductSourceData;
  derivedData: SelectionProductDerivedData;
  inferredData: SelectionProductInferredData;
  searchText: string;
  familyKey: string;
  confidenceScore: number;
};

export type SelectionScoreWeights = {
  objectType: number;
  sizeFit: number;
  age: number;
  material: number;
  usage: number;
  budget: number;
  growth: number;
  confidence: number;
  diversityPenalty: number;
};

export type SelectionScoreBreakdown = {
  total: number;
  components: {
    objectType: number;
    sizeFit: number;
    age: number;
    material: number;
    usage: number;
    budget: number;
    growth: number;
    confidence: number;
    diversityPenalty: number;
  };
  reasons: string[];
  penalties: string[];
};

export type SelectionCandidate = {
  profile: SelectionProductProfile;
  breakdown: SelectionScoreBreakdown;
};

export type SelectionRecommendationItem = {
  product: GeneratedProduct;
  quantity: number;
  score: number;
  reasoning: string;
  highlights: string[];
  breakdown: SelectionScoreBreakdown;
  profile: SelectionProductProfile;
};

export type SelectionRecommendation = {
  input: SelectionInput;
  constraints: SelectionResolvedConstraints;
  solutionName: string;
  estimatedTotalRub: number;
  rationale: string;
  recognizedPreferences: SelectionConstraintChip[];
  filteredOutCount: number;
  filtersApplied: string[];
  items: SelectionRecommendationItem[];
};
