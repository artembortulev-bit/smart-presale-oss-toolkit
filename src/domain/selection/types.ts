export type SelectionInput = {
  objectType: string;
  widthM: number;
  lengthM: number;
  segment: "ECONOMY" | "OPTIMUM" | "PREMIUM";
  budgetRub?: number;
  clientType?: string;
  needsDelivery: boolean;
  needsInstallation: boolean;
  wishes?: string;
};

export type SelectionSuggestion = {
  productId: string;
  variantId?: string;
  article: string;
  name: string;
  quantity: number;
  estimatedLineRub: number;
  reasoning: string;
};
