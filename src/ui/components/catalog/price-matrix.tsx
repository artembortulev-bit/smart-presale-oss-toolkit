import { GeneratedPrice } from "@/import/catalog/types";
import { cleanDisplayText } from "@/shared/utils/display-text";
import { formatPriceRub } from "@/shared/utils/money";

type PriceMatrixProps = {
  prices: GeneratedPrice[];
};

export function PriceMatrix({ prices }: PriceMatrixProps) {
  if (!prices.length) {
    return (
      <section className="glass-panel rounded-[32px] p-6 lg:p-7">
        <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-[var(--foreground-soft)]">
          Цена
        </div>
        <div className="mt-5 rounded-[24px] border border-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.68)] px-5 py-5 text-sm leading-7 text-[var(--foreground-muted)]">
          Цена уточняется через КП.
        </div>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-[32px] p-6 lg:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-[var(--foreground-soft)]">
          Цены
        </div>
        <div className="muted-chip rounded-full px-4 py-2 text-sm">
          {prices.length} строк
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {prices.map((price, index) => (
          <div
            key={`${price.material}-${price.level}-${price.source}-${index}`}
            className="rounded-[24px] border border-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.68)] px-5 py-5 shadow-[0_10px_28px_rgba(17,17,17,0.03)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="safe-text font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-soft)]">
                {cleanDisplayText(price.material)}
              </div>
              <span className="muted-chip safe-text rounded-full px-3 py-1 text-[11px]">
                {cleanDisplayText(price.level)}
              </span>
            </div>

            <div className="mt-4 text-[2rem] font-semibold leading-none tracking-[-0.04em] text-[var(--foreground)]">
              {formatPriceRub(price.amountRub)}
            </div>

            <div className="safe-text mt-4 text-sm leading-6 text-[var(--foreground-muted)]">
              {cleanDisplayText(price.sourceLabel ?? price.source)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
