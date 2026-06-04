import { ReactNode } from "react";

import { ButtonLink } from "@/ui/components/common/button-link";

type InfoPageProps = {
  eyebrow: string;
  title: string;
  description?: string;
  bullets?: string[];
  metrics?: Array<{ label: string; value: string; note?: string }>;
  ctaHref?: string;
  ctaLabel?: string;
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
  aside?: ReactNode;
};

export function InfoPage({
  eyebrow,
  title,
  description,
  bullets,
  metrics,
  ctaHref,
  ctaLabel,
  secondaryCtaHref,
  secondaryCtaLabel,
  aside,
}: InfoPageProps) {
  const hasAside = Boolean(aside);

  return (
    <main className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8">
      <section className="visual-stage rounded-[8px] p-4 sm:p-5 lg:p-6">
        <div
          className={`relative z-10 grid gap-5 ${
            hasAside ? "xl:grid-cols-[minmax(0,1.08fr)_420px]" : ""
          }`}
        >
          <section className="visual-panel rounded-[8px] p-6 sm:p-8 lg:p-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--foreground-muted)]">
              {eyebrow}
            </p>
            <h1 className="safe-heading mt-5 max-w-3xl text-[clamp(2.4rem,4.1vw,4.1rem)] font-semibold leading-[1.02] tracking-normal text-[var(--foreground)]">
              {title}
            </h1>
            {description ? (
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--foreground-muted)]">
                {description}
              </p>
            ) : null}

            {(ctaHref || secondaryCtaHref) && (
              <div className="mt-7 flex flex-wrap gap-3">
                {ctaHref && ctaLabel ? <ButtonLink href={ctaHref}>{ctaLabel}</ButtonLink> : null}
                {secondaryCtaHref && secondaryCtaLabel ? (
                  <ButtonLink href={secondaryCtaHref} variant="secondary">
                    {secondaryCtaLabel}
                  </ButtonLink>
                ) : null}
              </div>
            )}

            {metrics?.length ? (
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-[8px] border border-[rgba(24,21,18,0.1)] bg-white/72 px-5 py-5 backdrop-blur-xl"
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--foreground-muted)]">
                      {metric.label}
                    </div>
                    <div className="mt-3 text-[1.8rem] font-semibold leading-none text-[var(--foreground)]">
                      {metric.value}
                    </div>
                    {metric.note ? (
                      <div className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
                        {metric.note}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {bullets?.length ? (
              <div className="mt-7 flex flex-wrap gap-3">
                {bullets.map((bullet) => (
                  <span
                    key={bullet}
                    className="rounded-[8px] border border-[rgba(24,21,18,0.08)] bg-white/68 px-4 py-2 text-sm text-[var(--foreground)] shadow-[0_8px_24px_rgba(24,21,18,0.04)]"
                  >
                    {bullet}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          {hasAside ? (
            <aside className="visual-panel-dark rounded-[8px] p-6 text-white sm:p-8 lg:p-10">{aside}</aside>
          ) : null}
        </div>
      </section>
    </main>
  );
}
