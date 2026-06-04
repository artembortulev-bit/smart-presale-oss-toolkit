import { CatalogSort } from "@/application/catalog/queries";

type CatalogFiltersProps = {
  categorySlug?: string;
  currentQuery?: string;
  currentMaterial?: string;
  currentSort?: CatalogSort;
  materials: string[];
};

const sortOptions: Array<{ value: CatalogSort; label: string }> = [
  { value: "featured", label: "Сначала ключевые" },
  { value: "name", label: "По названию" },
  { value: "price_asc", label: "Цена по возрастанию" },
  { value: "price_desc", label: "Цена по убыванию" },
];

export function CatalogFilters({
  categorySlug,
  currentQuery,
  currentMaterial,
  currentSort,
  materials,
}: CatalogFiltersProps) {
  return (
    <form className="glass-panel grid gap-4 rounded-[30px] p-5 sm:p-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--foreground-muted)]">
          Каталоговый отбор
        </div>
        <div className="mt-3 text-[1.3rem] font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--foreground)]">
          Поиск, материалы и сортировка в одном control-слое
        </div>
        <p className="mt-3 text-sm leading-7 text-[var(--foreground-muted)]">
          Фильтры собраны как рабочая панель менеджера, а не как обычный
          сайдбар маркетплейса.
        </p>
      </div>

      {categorySlug ? <input type="hidden" name="category" value={categorySlug} /> : null}

      <label className="flex flex-col gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
          Поиск
        </span>
        <input
          type="search"
          name="q"
          defaultValue={currentQuery}
          placeholder="Артикул, серия, категория, наименование"
          className="h-12 rounded-[20px] border border-[rgba(255,255,255,0.64)] bg-[rgba(255,255,255,0.76)] px-4 text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--foreground-muted)] focus:border-[rgba(239,100,29,0.34)]"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
            Материал
          </span>
          <select
            name="material"
            defaultValue={currentMaterial}
            className="h-12 rounded-[20px] border border-[rgba(255,255,255,0.64)] bg-[rgba(255,255,255,0.76)] px-4 text-[var(--foreground)] outline-none transition-colors focus:border-[rgba(239,100,29,0.34)]"
          >
            <option value="">Все материалы</option>
            {materials.map((material) => (
              <option key={material} value={material}>
                {material}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
            Сортировка
          </span>
          <select
            name="sort"
            defaultValue={currentSort ?? "featured"}
            className="h-12 rounded-[20px] border border-[rgba(255,255,255,0.64)] bg-[rgba(255,255,255,0.76)] px-4 text-[var(--foreground)] outline-none transition-colors focus:border-[rgba(239,100,29,0.34)]"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-[24px] border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.54)] px-4 py-4 text-sm leading-7 text-[var(--foreground-muted)]">
        Сначала применяются структурные фильтры, а затем каталог выдает более
        релевантные позиции в нужном коммерческом порядке.
      </div>

      <button
        type="submit"
        className="mt-1 h-12 rounded-full bg-[linear-gradient(135deg,var(--accent)_0%,#ff7a29_100%)] px-6 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(239,100,29,0.24)] transition-transform duration-200 hover:-translate-y-0.5"
      >
        Применить отбор
      </button>
    </form>
  );
}
