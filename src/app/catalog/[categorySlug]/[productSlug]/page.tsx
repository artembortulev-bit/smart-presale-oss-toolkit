import { notFound } from "next/navigation";

import { getProductDetail } from "@/application/catalog/queries";
import { getProductThreeDInfo } from "@/application/catalog/three-d";
import { cleanDisplayText } from "@/shared/utils/display-text";
import { PriceMatrix } from "@/ui/components/catalog/price-matrix";
import { ProductCard } from "@/ui/components/catalog/product-card";
import { ProductViewer } from "@/ui/components/catalog/product-viewer";
import { SpecGrid } from "@/ui/components/catalog/spec-grid";
import { ButtonLink } from "@/ui/components/common/button-link";
import {
  DocumentBlock,
  Eyebrow,
  MetricBlock,
  Pill,
  ProofPanel,
  SectionHeader,
  Stage,
} from "@/ui/components/common/visual-system";

type ProductPageProps = {
  params: Promise<{ categorySlug: string; productSlug: string }>;
};

function clean(value?: string) {
  return value ? cleanDisplayText(value) : value;
}

function formatDimension(value?: number) {
  return value ? `${value.toLocaleString("ru-RU")} м` : "по запросу";
}

function getVisualProofLabel(threeDInfo: ReturnType<typeof getProductThreeDInfo>) {
  if (!threeDInfo?.hasModelAsset) {
    return "3D готовится";
  }

  if (threeDInfo.publishStatus === "LIVE" && threeDInfo.qualityGate === "APPROVED") {
    return "3D-модель изделия";
  }

  return "3D на проверке";
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  const detail = await getProductDetail(resolvedParams.productSlug);

  if (!detail) {
    notFound();
  }

  const { product, relatedProducts, primaryPriceLabel } = detail;
  const threeDInfo = getProductThreeDInfo(product);
  const visualProofLabel = getVisualProofLabel(threeDInfo);
  const specItems = [
    ["Категория", clean(product.categoryName) ?? "Каталог"],
    ["Серия", clean(product.seriesName ?? product.subcategoryLabel) ?? "Базовая"],
    ["Размер", clean(product.sizeLabel) ?? "по проекту"],
    ["Материалы", product.materials.map(cleanDisplayText).join(", ") || "уточняются"],
  ];

  return (
    <main className="mx-auto max-w-[1620px] px-4 py-8 sm:px-6 lg:px-8">
      <Stage className="p-4 sm:p-5 lg:p-6">
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.12fr)_460px]">
          <div className="min-w-0">
            <ProductViewer product={product} confidenceModeLabel={visualProofLabel} />
          </div>

          <aside className="flex min-w-0 flex-col gap-5">
            <ProofPanel dark className="p-7 lg:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="accent">{product.article}</Pill>
                <Pill tone="muted">{clean(product.categoryName) ?? "Каталог"}</Pill>
              </div>

              <h1 className="safe-heading mt-6 text-[clamp(2.4rem,4vw,4.8rem)] font-semibold leading-[0.95] tracking-[-0.07em] text-white">
                {clean(product.name)}
              </h1>

              <p className="safe-text mt-5 text-sm leading-7 text-white/66">
                Карточка изделия для подбора, визуального согласования и формирования
                коммерческого предложения.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="/proposals/new">Собрать КП</ButtonLink>
                <ButtonLink href="/configurator" variant="secondary">
                  Добавить в подбор
                </ButtonLink>
              </div>
            </ProofPanel>

            <div className="grid gap-4 sm:grid-cols-2">
              <MetricBlock label="Базовая цена" value={clean(primaryPriceLabel) ?? primaryPriceLabel} className="sm:col-span-2" />
              <MetricBlock label="Длина" value={formatDimension(product.lengthM)} />
              <MetricBlock label="Ширина" value={formatDimension(product.widthM)} />
              <MetricBlock label="Высота" value={formatDimension(product.heightM)} />
              <MetricBlock
                label="Визуальный proof"
                value={visualProofLabel}
                hint={threeDInfo?.annotationCount ? `${threeDInfo.annotationCount} узла` : undefined}
              />
            </div>

            <DocumentBlock
              title="Коммерческий контур"
              number="proposal ready"
              amount={clean(primaryPriceLabel) ?? primaryPriceLabel}
              status={<Pill tone="accent">КП / PDF</Pill>}
            >
              <p className="safe-text text-sm leading-7 text-[var(--foreground-muted)]">
                Изделие можно включить в подбор или коммерческое предложение. Цена, размеры,
                медиа и 3D-слой остаются связанными с карточкой.
              </p>
            </DocumentBlock>
          </aside>
        </div>
      </Stage>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <Stage className="p-5 sm:p-6">
          <SectionHeader
            eyebrow="Паспорт изделия"
            title="Технические параметры"
            description="Ключевые характеристики вынесены в чистую структуру без служебного шума и внутренних asset-статусов."
          />
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {specItems.map(([label, value]) => (
              <ProofPanel key={label}>
                <Eyebrow>{label}</Eyebrow>
                <div className="safe-text mt-3 text-lg font-semibold leading-7 text-[var(--foreground)]">
                  {value}
                </div>
              </ProofPanel>
            ))}
          </div>
          <div className="mt-6">
            <SpecGrid product={product} />
          </div>
        </Stage>

        <Stage className="p-5 sm:p-6">
          <SectionHeader
            eyebrow="Цены и варианты"
            title="Материалы и уровни цены"
            description="Матрица сохраняет исходную коммерческую структуру и остается источником для КП."
          />
          <div className="mt-7">
            <PriceMatrix prices={product.prices} />
          </div>
        </Stage>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="mt-8">
          <Stage>
            <SectionHeader
              eyebrow="Похожие изделия"
              title="Соседние решения"
              description="Быстрый переход к альтернативам внутри того же коммерческого контекста."
            />
            <div className="mt-7 grid gap-5 lg:grid-cols-2 2xl:grid-cols-4">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </Stage>
        </section>
      ) : null}
    </main>
  );
}
