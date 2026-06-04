import Decimal from "decimal.js";

export type ImportIssueDraft = {
  severity: "INFO" | "WARNING" | "ERROR";
  code: string;
  message: string;
  sourceKey?: string;
  sourceSheet?: string;
  sourceRow?: number;
  details?: Record<string, unknown>;
};

export type PriceEntryDraft = {
  material: "STANDARD" | "PINE" | "LARCH" | "ROBINIA";
  level: "BASE" | "DISCOUNT_10" | "DISCOUNT_20" | "DISCOUNT_30";
  amountRub: Decimal;
  source: "BITRIX" | "PRICE_OPTIMUM" | "PRICE_PREMIUM";
  sourceLabel?: string;
};

export type SourceProductDraft = {
  source: "BITRIX" | "PRICE_OPTIMUM" | "PRICE_PREMIUM";
  sourceRecordId?: string;
  sourceSheet?: string;
  sourceRow?: number;
  articleRaw?: string;
  articleNormalized?: string;
  externalCode?: string;
  name?: string;
  categoryName?: string;
  subcategoryLabel?: string;
  classLabel?: string;
  seriesName?: string;
  imageUrl?: string;
  materials?: string[];
  ageLabel?: string;
  ageMinYears?: number;
  ageMaxYears?: number;
  lengthM?: Decimal;
  widthM?: Decimal;
  heightM?: Decimal;
  sizeLabel?: string;
  weightKg?: Decimal;
  volumeM3?: Decimal;
  prices: PriceEntryDraft[];
  rawData: Record<string, unknown>;
  normalizedData: Record<string, unknown>;
};

export type ImportBundle = {
  items: SourceProductDraft[];
  issues: ImportIssueDraft[];
};
