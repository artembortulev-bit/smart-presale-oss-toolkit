import { GeneratedProduct } from "@/import/catalog/types";
import { cleanDisplayText } from "@/shared/utils/display-text";

type SpecGridProps = {
  product: GeneratedProduct;
};

const rows = (product: GeneratedProduct) =>
  [
    ["Артикул", product.article],
    ["Категория", product.categoryName],
    ["Подкатегория", product.subcategoryLabel],
    ["Серия", product.seriesName],
    ["Размер", product.sizeLabel],
    ["Длина", product.lengthM ? `${product.lengthM} м` : undefined],
    ["Ширина", product.widthM ? `${product.widthM} м` : undefined],
    ["Высота", product.heightM ? `${product.heightM} м` : undefined],
    ["Вес", product.weightKg ? `${product.weightKg} кг` : undefined],
    ["Материалы", product.materials.map(cleanDisplayText).join(", ") || undefined],
    ["Возраст", product.ageLabel],
    ["Варианты", `${product.variants.length}`],
  ].filter((row) => row[1]);

export function SpecGrid({ product }: SpecGridProps) {
  return (
    <section className="glass-panel rounded-[32px] p-6 lg:p-7">
      <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-[var(--foreground-soft)]">
        Параметры
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows(product).map(([label, value]) => (
          <div
            key={label}
            className="rounded-[24px] border border-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.68)] px-5 py-5 shadow-[0_10px_28px_rgba(17,17,17,0.03)]"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-soft)]">
              {label}
            </div>
            <div className="safe-text mt-3 text-[1rem] leading-7 text-[var(--foreground)]">
              {cleanDisplayText(String(value))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
