export type ProposalLineInput = {
  productId?: string;
  variantId?: string;
  article: string;
  name: string;
  imageUrl?: string;
  sizeLabel?: string;
  quantity: number;
  unitPriceRub: number;
};

export type ProposalDraftInput = {
  title: string;
  customerName: string;
  customerAddress?: string;
  objectAddress?: string;
  issueDate: string;
  validUntil?: string;
  includeDelivery: boolean;
  includeInstallation: boolean;
  deliveryRub: number;
  installationRub: number;
  lines: ProposalLineInput[];
  notes?: string;
};
