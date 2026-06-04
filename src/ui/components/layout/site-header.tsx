import Link from "next/link";

import {
  buildSignInHref,
  getPortalContext,
  type PortalRole,
} from "@/application/auth/portal-access";
import { cleanDisplayText } from "@/shared/utils/display-text";
import { ButtonLink } from "@/ui/components/common/button-link";

function getNavigation(role: PortalRole) {
  if (role === "employee") {
    return [
      { href: "/admin/manager", label: "Очередь" },
      { href: "/catalog", label: "Каталог" },
      { href: "/configurator", label: "Подбор" },
      { href: "/showcase/3d-visual-confidence", label: "3D proof" },
      { href: "/proposals/new", label: "КП" },
    ];
  }

  if (role === "client") {
    return [
      { href: "/catalog", label: "Каталог" },
      { href: "/solutions", label: "Решения" },
      { href: "/client", label: "Кабинет" },
      { href: "/contacts", label: "Контакты" },
    ];
  }

  return [
    { href: "/catalog", label: "Каталог" },
    { href: "/solutions", label: "Решения" },
    { href: "/projects", label: "Проекты" },
    { href: "/showcase/3d-visual-confidence", label: "3D proof" },
    { href: "/contacts", label: "Контакты" },
  ];
}

function getPrimaryAction(role: PortalRole) {
  if (role === "employee") {
    return { href: "/proposals/new", label: "Собрать КП" };
  }

  if (role === "client") {
    return { href: "/client", label: "Фото-заявка" };
  }

  return { href: buildSignInHref(), label: "Войти" };
}

export async function SiteHeader() {
  const portal = await getPortalContext();
  const navigation = getNavigation(portal.role);
  const primaryAction = getPrimaryAction(portal.role);

  return (
    <header className="sticky top-0 z-40 w-full max-w-full overflow-hidden px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1480px]">
        <div className="premium-header-shell w-full rounded-[8px] px-3 py-3 sm:px-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-4 xl:grid-cols-[250px_minmax(0,1fr)_auto]">
            <Link
              href="/"
              className="grid min-w-0 grid-cols-[48px_1fr] items-center gap-3"
              aria-label="Smart Presale"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#c85f27] text-base font-bold text-white shadow-[0_18px_40px_rgba(200,95,39,0.18)]">
                Ю
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--foreground-soft)]">
                  Smart Presale
                </div>
                <div className="safe-text mt-1 text-sm font-semibold text-[var(--foreground)]">
                  Smart Presale
                </div>
              </div>
            </Link>

            <nav className="order-3 col-span-2 hidden min-w-0 max-w-full overflow-hidden sm:block xl:order-none xl:col-span-1 xl:overflow-visible">
              <div className="flex min-w-0 flex-wrap items-center gap-1 xl:flex-nowrap xl:justify-center">
                {navigation.map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href as never}
                    className={`premium-nav-link rounded-[8px] px-3 py-2 text-[12px] font-semibold transition-colors sm:px-4 sm:py-2.5 sm:text-[13px] ${index >= 4 ? "hidden sm:inline-flex" : ""}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>

            <div className="order-2 flex min-w-0 flex-nowrap items-center justify-end gap-2.5 sm:w-auto xl:order-none">
              <span className="hidden max-w-[180px] truncate rounded-[8px] border border-[var(--border)] bg-white/70 px-4 py-2 text-sm font-medium text-[var(--foreground-muted)] lg:inline-flex">
                {cleanDisplayText(portal.shortLabel)}
              </span>
              {portal.role === "employee" ? (
                <ButtonLink href="/admin/manager" variant="secondary" className="hidden lg:inline-flex">
                  Очередь
                </ButtonLink>
              ) : portal.role === "client" ? (
                <ButtonLink href="/client" variant="secondary" className="hidden md:inline-flex">
                  Кабинет
                </ButtonLink>
              ) : (
                <ButtonLink href="/catalog" variant="secondary" className="hidden lg:inline-flex">
                  Каталог
                </ButtonLink>
              )}
              <ButtonLink
                href={primaryAction.href}
                className="px-4 py-2.5 text-sm sm:px-6 sm:py-3"
              >
                {primaryAction.label}
              </ButtonLink>
              <ButtonLink href={buildSignInHref()} variant="ghost" className="hidden 2xl:inline-flex">
                Сменить режим
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
