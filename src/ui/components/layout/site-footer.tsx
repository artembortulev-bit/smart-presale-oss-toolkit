import Link from "next/link";

const productLinks = [
  { href: "/catalog", label: "Каталог" },
  { href: "/configurator", label: "Подбор объекта" },
  { href: "/showcase/3d-visual-confidence", label: "3D proof" },
  { href: "/proposals/new", label: "Коммерческое предложение" },
];

const companyLinks = [
  { href: "/solutions", label: "Готовые решения" },
  { href: "/projects", label: "Проекты" },
  { href: "/client", label: "Фото-заявка" },
  { href: "/contacts", label: "Контакты" },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/44">
        {title}
      </div>
      <div className="mt-4 grid gap-2">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href as never}
            className="safe-text text-sm font-semibold text-white/68 transition-colors hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 px-4 pb-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px] overflow-hidden rounded-[8px] bg-[#181512] px-6 py-8 text-white shadow-[0_34px_110px_rgba(24,21,18,0.18)] sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_0.8fr_0.8fr_0.9fr]">
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#c85f27] text-base font-bold text-white">
                Ю
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/44">
                  Smart Presale
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  Smart Presale Platform
                </div>
              </div>
            </div>

            <p className="safe-text mt-6 text-base leading-8 text-white/66">
              Цифровой контур производителя: каталог, подбор решения, 3D-доказательство,
              коммерческое предложение и управляемая работа менеджера.
            </p>
          </div>

          <FooterColumn title="Платформа" links={productLinks} />
          <FooterColumn title="Разделы" links={companyLinks} />

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/44">
              Контакты
            </div>
            <div className="mt-4 space-y-2 text-sm leading-7 text-white/66">
              <div>Брянск, д. Толвинка, ул. Толвинская, д. 47Г</div>
              <a className="block font-semibold text-white" href="mailto:sales@example.com">
                sales@example.com
              </a>
              <a className="block font-semibold text-white" href="tel:+79000000000">
                +7 900 000-00-00
              </a>
            </div>
          </div>
        </div>

        <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
          <span>Smart Presale</span>
          <span>Каталог → подбор → сцена → КП → сделка</span>
        </div>
      </div>
    </footer>
  );
}
