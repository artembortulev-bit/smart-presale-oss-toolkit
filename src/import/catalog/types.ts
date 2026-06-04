import { ImportIssueDraft } from "@/import/shared/types";
import { GeneratedProductCosting } from "@/application/costing/types";

export type GeneratedCategory = {
  id: string;
  slug: string;
  name: string;
  parentSlug?: string;
  segmentKey?: "PLAY" | "SPORT" | "PARK" | "LANDSCAPE" | "SMALL_ARCH";
};

export type GeneratedPrice = {
  material: "STANDARD" | "PINE" | "LARCH" | "ROBINIA";
  level: "BASE" | "DISCOUNT_10" | "DISCOUNT_20" | "DISCOUNT_30";
  amountRub: number;
  source: "BITRIX" | "PRICE_OPTIMUM" | "PRICE_PREMIUM";
  sourceLabel?: string;
};

export type GeneratedAsset = {
  kind:
    | "PRIMARY_IMAGE"
    | "GALLERY_IMAGE"
    | "MODEL_3D"
    | "DOCUMENT"
    | "CERTIFICATE"
    | "PASSPORT"
    | "SAFETY_ZONE"
    | "FOOTPRINT";
  url: string;
  title?: string;
  metadata?: Record<string, unknown>;
};

export type GeneratedVariant = {
  id: string;
  variantKey: string;
  displayName: string;
  externalCode?: string;
  sizeLabel?: string;
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  weightKg?: number;
  volumeM3?: number;
  imageUrl?: string;
  prices: GeneratedPrice[];
  assets: GeneratedAsset[];
};

export type GeneratedProduct = {
  id: string;
  slug: string;
  article: string;
  articleNormalized: string;
  externalCode?: string;
  name: string;
  classLabel?: string;
  categorySlug?: string;
  categoryName?: string;
  subcategoryLabel?: string;
  seriesName?: string;
  description?: string;
  materials: string[];
  ageLabel?: string;
  ageMinYears?: number;
  ageMaxYears?: number;
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  sizeLabel?: string;
  weightKg?: number;
  volumeM3?: number;
  basePriceRub?: number;
  imageUrl?: string;
  gallery: string[];
  tags: string[];
  costing?: GeneratedProductCosting;
  metadata: Record<string, unknown>;
  prices: GeneratedPrice[];
  assets: GeneratedAsset[];
  variants: GeneratedVariant[];
  rawSources: Array<{
    source: "BITRIX" | "PRICE_OPTIMUM" | "PRICE_PREMIUM";
    sourceSheet?: string;
    sourceRow?: number;
    sourceRecordId?: string;
  }>;
};

export type DemoProposalScenario = {
  id: string;
  title: string;
  customerName: string;
  address?: string;
  issueDate?: string;
  lines: Array<{
    article?: string;
    name: string;
    materialLabel?: string;
    sizeLabel?: string;
    quantity?: number;
    unitPriceRub?: number;
    totalPriceRub?: number;
  }>;
};

export type GeneratedCatalogData = {
  generatedAt: string;
  summary: {
    categories: number;
    products: number;
    variants: number;
    issues: number;
    costing?: {
      sourceRecords: number;
      directProducts: number;
      inferredProducts: number;
      withoutCost: number;
      coverageRatio: number;
      rules: number;
    };
  };
  categories: GeneratedCategory[];
  products: GeneratedProduct[];
  issues: ImportIssueDraft[];
  proposalScenarios: DemoProposalScenario[];
};
