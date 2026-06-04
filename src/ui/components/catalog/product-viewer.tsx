import { GeneratedProduct } from "@/import/catalog/types";
import { ProductViewerClient } from "@/ui/components/catalog/product-viewer-client";

type ProductViewerProps = {
  product: GeneratedProduct;
  requireRealAsset?: boolean;
  confidenceModeLabel?: string;
};

export function ProductViewer({
  product,
  requireRealAsset,
  confidenceModeLabel,
}: ProductViewerProps) {
  return (
    <ProductViewerClient
      product={product}
      requireRealAsset={requireRealAsset}
      confidenceModeLabel={confidenceModeLabel}
    />
  );
}
