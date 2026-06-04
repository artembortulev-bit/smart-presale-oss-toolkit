export type ProductCostMaterial = "STANDARD" | "PINE" | "LARCH" | "ROBINIA";

export type ProductCostRuleScope =
  | "series_material"
  | "category_prefix_material"
  | "category_material"
  | "category"
  | "global";

export type ProductCostConfidenceLabel =
  | "direct"
  | "series_material_rule"
  | "category_prefix_material_rule"
  | "category_material_rule"
  | "category_rule"
  | "global_rule";

export type ProductCostSourceVariant = {
  material: ProductCostMaterial;
  clientPriceRub?: number;
  costRub: number;
  source: "DIRECT" | "INFERRED";
  sourceSheet?: string;
  sourceRow?: number;
  costDateLabel?: string;
  costNote?: string;
  formulaHint?: string;
  marginRub?: number;
  marginPercent?: number;
};

export type GeneratedProductCosting = {
  availability: "DIRECT" | "INFERRED" | "NONE";
  confidence: number;
  confidenceLabel: ProductCostConfidenceLabel;
  basis: string[];
  sourceWorkbookPath?: string;
  sourceDateLabel?: string;
  defaultMaterial: ProductCostMaterial;
  defaultClientPriceRub?: number;
  defaultCostRub?: number;
  defaultMarginRub?: number;
  defaultMarginPercent?: number;
  variants: ProductCostSourceVariant[];
};

export type ProductCostRecordPrice = {
  material: ProductCostMaterial;
  clientPriceRub: number;
  formulaHint?: string;
};

export type ProductCostRecordCost = {
  material: ProductCostMaterial;
  costRub: number;
  note?: string;
};

export type ProductCostSourceRecord = {
  articleRaw?: string;
  articleNormalized: string;
  name: string;
  categoryName: string;
  sectionLabel?: string;
  seriesName?: string;
  sizeLabel?: string;
  sheetName: string;
  rowNumber: number;
  costDateLabel?: string;
  rawCostValue?: string;
  priceVariants: ProductCostRecordPrice[];
  costVariants: ProductCostRecordCost[];
};

export type ProductCostImportIssue = {
  severity: "INFO" | "WARNING" | "ERROR";
  code: string;
  message: string;
  sheetName?: string;
  rowNumber?: number;
  articleNormalized?: string;
  details?: Record<string, unknown>;
};

export type ProductCostSheetSummary = {
  sheetName: string;
  categoryName: string;
  rows: number;
  records: number;
  recordsWithCost: number;
  recordsWithMaterialCosts: number;
};

export type ProductCostImportResult = {
  workbookPath: string;
  records: ProductCostSourceRecord[];
  issues: ProductCostImportIssue[];
  sheetSummaries: ProductCostSheetSummary[];
  summary: {
    sheets: number;
    records: number;
    recordsWithCost: number;
    coverageRatio: number;
  };
};

export type ProductCostRule = {
  id: string;
  scope: ProductCostRuleScope;
  categoryName?: string;
  seriesName?: string;
  articlePrefix?: string;
  material: ProductCostMaterial;
  sampleCount: number;
  medianCostToPriceRatio: number;
  medianPriceToCostRatio: number;
  minCostToPriceRatio: number;
  maxCostToPriceRatio: number;
};

export type ProductCostCatalog = {
  workbookPath?: string;
  records: ProductCostSourceRecord[];
  rules: ProductCostRule[];
  directByArticle: Map<string, ProductCostSourceRecord>;
  summary: {
    records: number;
    recordsWithCost: number;
    rules: number;
  };
};

export type ProductCostMergeReport = {
  workbookPath?: string;
  summary: {
    sourceRecords: number;
    directMatches: number;
    inferredMatches: number;
    unmatchedCatalogProducts: number;
    unmatchedWorkbookRecords: number;
    ruleCount: number;
  };
  sheetCoverage: ProductCostSheetSummary[];
  topRules: ProductCostRule[];
  unmatchedWorkbookArticles: string[];
};
