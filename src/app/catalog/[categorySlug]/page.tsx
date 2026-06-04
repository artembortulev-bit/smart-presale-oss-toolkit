import { notFound } from "next/navigation";

import { getCategoryDetail, queryCatalogProducts } from "@/application/catalog/queries";
import { CatalogFilters } from "@/ui/components/catalog/catalog-filters";
import { PaginationControls } from "@/ui/components/catalog/pagination-controls";
import { ProductCard } from "@/ui/components/catalog/product-card";

type CategoryPageProps = {
  params: Promise<{ categorySlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const q = typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : undefined;
  const material =
    typeof resolvedSearchParams.material === "string"
      ? resolvedSearchParams.material
      : undefined;
  const sort =
    typeof resolvedSearchParams.sort === "string"
      ? resolvedSearchParams.sort
      : undefined;
  const page = Number(typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : 1);

  const [currentCategory, catalog] = await Promise.all([
    getCategoryDetail(resolvedParams.categorySlug),
    queryCatalogProducts({
      categorySlug: resolvedParams.categorySlug,
      q,
      material,
      sort: sort as never,
      page,
    }),
  ]);

  if (!currentCategory) {
    notFound();
  }

  const metrics = [
    { label: "SKU", value: String(catalog.total) },
    { label: "Материалы", value: String(catalog.materials.length) },
    { label: "Страница", value: `${catalog.page} / ${catalog.totalPages}` },
  ];

  return (
    <main className="mx-auto max-w-[1580px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="surface-shell rounded-[40px] p-4 sm:p-5 lg:p-6">
        <div className="relative z-10 space-y-5">
          <section className="glass-panel rounded-[36px] p-6 sm:p-7">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--foreground-muted)]">
                  Категория
                </div>
                <h1 className="mt-4 max-w-4xl text-[clamp(2.3rem,4vw,3.5rem)] font-semibold leading-[0.96] tracking-[-0.06em] text-[var(--foreground)]">
                  {currentCategory.name}
                </h1>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-[24px] border border-[rgba(20,18,16,0.08)] bg-[rgba(255,255,255,0.58)] px-4 py-4 backdrop-blur-xl"
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                      {metric.label}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <CatalogFilters
                categorySlug={resolvedParams.categorySlug}
                currentQuery={q}
                currentMaterial={material}
                currentSort={sort as never}
                materials={catalog.materials}
              />
            </aside>

            <div className="space-y-4">
              <PaginationControls
                pathname={`/catalog/${resolvedParams.categorySlug}`}
                page={catalog.page}
                totalPages={catalog.totalPages}
                query={{ q, material, sort }}
              />

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
                {catalog.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
