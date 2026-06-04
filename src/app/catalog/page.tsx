import Link from "next/link";

import { getCatalogTree, queryCatalogProducts } from "@/application/catalog/queries";
import { CatalogFilters } from "@/ui/components/catalog/catalog-filters";
import { PaginationControls } from "@/ui/components/catalog/pagination-controls";
import { ProductCard } from "@/ui/components/catalog/product-card";

type CatalogPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = (await searchParams) ?? {};
  const q = typeof params.q === "string" ? params.q : undefined;
  const material = typeof params.material === "string" ? params.material : undefined;
  const sort = typeof params.sort === "string" ? params.sort : undefined;
  const page = Number(typeof params.page === "string" ? params.page : 1);

  const [tree, catalog] = await Promise.all([
    getCatalogTree(),
    queryCatalogProducts({ q, material, sort: sort as never, page }),
  ]);

  const metrics = [
    { label: "SKU", value: String(catalog.total) },
    { label: "Материалы", value: String(catalog.materials.length) },
    { label: "Страница", value: `${catalog.page} / ${catalog.totalPages}` },
  ];

  return (
    <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="visual-stage rounded-[8px] p-4 sm:p-5 lg:p-6">
        <div className="relative z-10 space-y-5">
          <section className="visual-panel rounded-[8px] p-6 sm:p-7">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--foreground-muted)]">
                  Каталог
                </div>
                <h1 className="safe-heading mt-4 max-w-4xl text-[clamp(2.3rem,4vw,3.7rem)] font-semibold leading-[1.02] tracking-normal text-[var(--foreground)]">
                  Продукция Smart Presale
                </h1>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  {tree.slice(0, 10).map((category) => (
                    <Link
                      key={category.slug}
                      href={`/catalog/${category.slug}` as never}
                      className="rounded-[8px] border border-[rgba(24,21,18,0.08)] bg-white/62 px-4 py-2 text-sm text-[var(--foreground)] backdrop-blur-xl transition-colors hover:border-[#c85f27]/30 hover:text-[var(--accent)]"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-[8px] border border-[rgba(20,18,16,0.08)] bg-white/62 px-4 py-4 backdrop-blur-xl"
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
                currentQuery={q}
                currentMaterial={material}
                currentSort={sort as never}
                materials={catalog.materials}
              />
            </aside>

            <div className="space-y-4">
              <PaginationControls
                pathname="/catalog"
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
