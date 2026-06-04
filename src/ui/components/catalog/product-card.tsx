import Link from "next/link";

import { getProductThreeDInfo } from "@/application/catalog/three-d";
import { GeneratedProduct } from "@/import/catalog/types";
import { cleanDisplayText } from "@/shared/utils/display-text";
import { formatPriceRub } from "@/shared/utils/money";
import { CatalogMediaImage } from "@/ui/components/catalog/catalog-media-image";

type ProductCardProps = {
  product: GeneratedProduct;
};

function ProductCardFallback({
  article,
  name,
}: {
  article: string;
  name: string;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[8px] bg-[linear-gradient(150deg,#fbf7f1_0%,#efe3d5_48%,#e7d3bf_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(23,20,18,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(23,20,18,0.035)_1px,transparent_1px)] bg-[size:26px_26px] opacity-40" />
      <div className="page-orb page-orb--accent right-[-50px] top-[-40px] h-40 w-40" />
      <div className="absolute inset-x-5 bottom-5 rounded-[8px] border border-white/60 bg-[rgba(255,255,255,0.72)] px-4 py-4 backdrop-blur-xl">
        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--foreground-soft)]">
          {cleanDisplayText(article)}
        </div>
        <div className="safe-text mt-3 text-[1.15rem] font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--foreground)]">
          {cleanDisplayText(name)}
        </div>
      </div>
    </div>
  );
}

function ProductStage({
  product,
  mediaStatus,
}: {
  product: GeneratedProduct;
  mediaStatus?: string;
}) {
  return (
    <div className="relative aspect-[1.08/1] overflow-hidden rounded-[8px] border border-[rgba(24,21,18,0.1)] bg-[linear-gradient(160deg,rgba(255,255,255,0.72)_0%,rgba(241,233,223,0.9)_100%)]">
      <div className="page-orb page-orb--accent left-[-40px] top-[-24px] h-36 w-36" />
      <div className="page-orb page-orb--light bottom-[-24px] right-[-14px] h-36 w-36" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(23,20,18,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(23,20,18,0.03)_1px,transparent_1px)] bg-[size:34px_34px] opacity-35" />

      <div className="absolute left-4 top-4 z-10 rounded-[8px] border border-white/70 bg-white/82 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--foreground-soft)] shadow-[0_10px_26px_rgba(17,17,17,0.05)] backdrop-blur-xl">
        {cleanDisplayText(product.article)}
      </div>

      {mediaStatus ? (
        <div className="absolute right-4 top-4 z-10 rounded-[8px] border border-[rgba(23,20,18,0.08)] bg-[rgba(255,255,255,0.74)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--foreground-soft)] shadow-[0_10px_26px_rgba(17,17,17,0.05)] backdrop-blur-xl">
          {cleanDisplayText(mediaStatus)}
        </div>
      ) : null}

      <div className="absolute inset-0 flex items-center justify-center p-7">
        <div className="relative h-full w-full overflow-hidden rounded-[8px] bg-[rgba(255,255,255,0.35)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
          <div className="absolute inset-x-[20%] bottom-5 h-10 rounded-full bg-[rgba(23,20,18,0.1)] blur-2xl" />
          <CatalogMediaImage
            src={product.imageUrl}
            alt={cleanDisplayText(product.name)}
            className="object-contain px-6 py-5 transition-transform duration-500 group-hover:scale-[1.035]"
            loading="lazy"
            fallback={<ProductCardFallback article={product.article} name={product.name} />}
          />
        </div>
      </div>
    </div>
  );
}

export function ProductCard({ product }: ProductCardProps) {
  const href = product.categorySlug
    ? `/catalog/${product.categorySlug}/${product.slug}`
    : `/catalog/product/${product.slug}`;

  const threeDInfo = getProductThreeDInfo(product);
  const mediaStatus =
    threeDInfo?.lifecycleStatus === "PUBLISHED"
      ? "3D live"
      : threeDInfo?.lifecycleStatus === "ANNOTATED"
        ? "3D qa"
        : threeDInfo?.hasModelAsset && threeDInfo.renderableInViewer
          ? "3D draft"
          : threeDInfo
            ? "3D source"
            : product.imageUrl || product.gallery.length > 0
              ? "Фото"
              : undefined;

  const chips = [
    product.seriesName ?? product.subcategoryLabel,
    product.ageLabel,
    product.sizeLabel,
  ].filter((chip): chip is string => Boolean(chip));

  return (
    <Link
      href={href as never}
      prefetch={false}
      className="group visual-panel flex h-full min-h-[470px] flex-col rounded-[8px] p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_34px_90px_rgba(24,21,18,0.11)] sm:p-5"
    >
      <div className="relative z-10 flex h-full min-w-0 flex-col">
        <ProductStage product={product} mediaStatus={mediaStatus} />

        {chips.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span key={chip} className="muted-chip safe-text rounded-[8px] px-3 py-1.5 text-[11px]">
                {cleanDisplayText(chip)}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex flex-1 flex-col">
          <div
            className="safe-text text-[1.34rem] font-semibold leading-[1.12] tracking-[-0.045em] text-[var(--foreground)] sm:text-[1.5rem]"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {cleanDisplayText(product.name)}
          </div>

          <div className="mt-auto pt-6">
            <div className="editorial-divider pt-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-soft)]">
                    Цена
                  </div>
                  <div className="mt-2 text-[1.85rem] font-semibold leading-none tracking-[-0.05em] text-[var(--foreground)]">
                    {formatPriceRub(product.basePriceRub)}
                  </div>
                </div>

                <div className="inline-flex h-11 min-w-[132px] items-center justify-center rounded-[8px] border border-[rgba(23,20,18,0.08)] bg-[rgba(255,255,255,0.82)] px-5 text-sm font-semibold text-[var(--foreground)] shadow-[0_14px_34px_rgba(23,20,18,0.04)] transition-transform duration-200 group-hover:translate-x-1">
                  Открыть
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
