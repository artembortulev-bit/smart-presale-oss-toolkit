export type BusinessSegment =
  | "PLAY"
  | "SPORT"
  | "PARK"
  | "LANDSCAPE"
  | "SMALL_ARCH";

export type CatalogCategoryNode = {
  id: string;
  slug: string;
  name: string;
  segmentKey?: BusinessSegment;
  children: CatalogCategoryNode[];
};

export type ProductPriceView = {
  material: "STANDARD" | "PINE" | "LARCH" | "ROBINIA";
  level: "BASE" | "DISCOUNT_10" | "DISCOUNT_20" | "DISCOUNT_30";
  amountRub: number;
  source: "BITRIX" | "PRICE_OPTIMUM" | "PRICE_PREMIUM" | "MANUAL";
};

export type ProductAssetView = {
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
};

export type ProductVariantView = {
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
  prices: ProductPriceView[];
  assets: ProductAssetView[];
};

export type ProductCardView = {
  id: string;
  slug: string;
  article: string;
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
  prices: ProductPriceView[];
  assets: ProductAssetView[];
  variants: ProductVariantView[];
};
