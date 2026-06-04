import Link from "next/link";

import { cn } from "@/shared/utils/cn";

type PaginationControlsProps = {
  pathname: string;
  page: number;
  totalPages: number;
  query?: Record<string, string | undefined>;
};

function buildHref(
  pathname: string,
  page: number,
  query?: Record<string, string | undefined>,
) {
  const searchParams = new URLSearchParams();

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    searchParams.set(key, value);
  });

  if (page > 1) {
    searchParams.set("page", String(page));
  }

  const queryString = searchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function getVisiblePages(current: number, total: number) {
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= total)
    .sort((left, right) => left - right);
}

export function PaginationControls({
  pathname,
  page,
  totalPages,
  query,
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-[28px] px-5 py-4">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--foreground-muted)]">
          Навигация по выдаче
        </div>
        <div className="mt-1 text-sm text-[var(--foreground)]">
          Страница {page} из {totalPages}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={buildHref(pathname, Math.max(1, page - 1), query) as never}
          className={cn(
            "rounded-full px-4 py-2 text-sm transition-colors",
            page === 1
              ? "pointer-events-none bg-[rgba(17,17,17,0.06)] text-[rgba(17,17,17,0.28)]"
              : "border border-[rgba(255,255,255,0.64)] bg-[rgba(255,255,255,0.76)] text-[var(--foreground)] hover:border-[rgba(239,100,29,0.32)] hover:text-[var(--accent)]",
          )}
        >
          Назад
        </Link>

        {visiblePages.map((visiblePage) => (
          <Link
            key={visiblePage}
            href={buildHref(pathname, visiblePage, query) as never}
            className={cn(
              "rounded-full px-4 py-2 text-sm transition-colors",
              visiblePage === page
                ? "bg-[linear-gradient(135deg,var(--accent)_0%,#ff7a29_100%)] text-white"
                : "border border-[rgba(255,255,255,0.64)] bg-[rgba(255,255,255,0.76)] text-[var(--foreground)] hover:border-[rgba(239,100,29,0.32)] hover:text-[var(--accent)]",
            )}
          >
            {visiblePage}
          </Link>
        ))}

        <Link
          href={buildHref(pathname, Math.min(totalPages, page + 1), query) as never}
          className={cn(
            "rounded-full px-4 py-2 text-sm transition-colors",
            page === totalPages
              ? "pointer-events-none bg-[rgba(17,17,17,0.06)] text-[rgba(17,17,17,0.28)]"
              : "border border-[rgba(255,255,255,0.64)] bg-[rgba(255,255,255,0.76)] text-[var(--foreground)] hover:border-[rgba(239,100,29,0.32)] hover:text-[var(--accent)]",
          )}
        >
          Дальше
        </Link>
      </div>
    </div>
  );
}
