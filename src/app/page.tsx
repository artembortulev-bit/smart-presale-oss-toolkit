import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  FileText,
  Layers3,
  LayoutDashboard,
  PackageSearch,
  Route,
} from "lucide-react";

import { getCatalogLandingData, getProductDetail } from "@/application/catalog/queries";
import { cleanDisplayText } from "@/shared/utils/display-text";
import { formatPriceRub } from "@/shared/utils/money";
import { ButtonLink } from "@/ui/components/common/button-link";

const HERO_SKU_SLUG = "skpo021-skpo021-oborudovanie-dlya-skeyt-parka-bank-with-stairs";
const heroProofImage = "/showcase/skpo021-hero-proof.png";
const heroMobileImage = "/showcase/skpo021-hero-mobile.png";
const contextProofImage = "/showcase/skpo021-context-proof.png";

function clean(value?: string) {
  return value ? cleanDisplayText(value) : value;
}

const processSteps = [
  {
    icon: Camera,
    title: "Заявка",
    text: "Фото, объект, площадь и вводные остаются в одном процессе.",
  },
  {
    icon: PackageSearch,
    title: "Каталог",
    text: "SKU, цена, материалы, габариты и медиа собраны вокруг product truth.",
  },
  {
    icon: Route,
    title: "Подбор",
    text: "Рекомендации строятся по правилам, ограничениям и контексту клиента.",
  },
  {
    icon: Layers3,
    title: "3D proof",
    text: "Изделие показывается как визуальный аргумент, а не как техническая вставка.",
  },
  {
    icon: FileText,
    title: "КП",
    text: "Версия, состав, PDF и сумма фиксируются как коммерческий артефакт.",
  },
  {
    icon: LayoutDashboard,
    title: "Sales",
    text: "Owner, next action, sent/outcome и история держат сделку в движении.",
  },
];

const cockpitRows = [
  ["Client request", "Новая заявка", "needs review"],
  ["Qualification", "Сводка требований", "ready"],
  ["Recommendation", "Набор решений", "saved"],
  ["Scene proof", "Площадка + изделие", "visual"],
  ["Proposal", "PDF v1", "ready"],
  ["Sales action", "Follow-up", "due soon"],
];

const demoRoute = [
  "Открыть карточку СКП.О.021",
  "Показать 3D proof и размещение",
  "Запустить подбор под объект",
  "Собрать КП и открыть PDF",
  "Перейти в очередь менеджера",
];

function ProcessLine({
  step,
  index,
}: {
  step: (typeof processSteps)[number];
  index: number;
}) {
  const Icon = step.icon;

  return (
    <div className="landing-rise group grid gap-4 border-t border-[#181512]/10 py-5 first:border-t-0 md:grid-cols-[72px_180px_minmax(0,1fr)] md:items-start">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs font-semibold text-[#c85f27]">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#181512] text-white transition duration-300 group-hover:-translate-y-0.5 group-hover:bg-[#c85f27]">
          <Icon size={18} strokeWidth={1.8} />
        </span>
      </div>
      <h3 className="safe-heading text-2xl font-semibold leading-tight tracking-normal text-[#181512]">
        {step.title}
      </h3>
      <p className="safe-text max-w-[760px] text-base leading-7 text-[#6f6559]">{step.text}</p>
    </div>
  );
}

function ProductRail({
  products,
}: {
  products: Awaited<ReturnType<typeof getCatalogLandingData>>["featuredProducts"];
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
      {products.slice(0, 3).map((product, index) => (
        <Link
          key={product.id}
          href={`/catalog/${product.categorySlug}/${product.slug}` as never}
          className={`group relative min-h-[310px] overflow-hidden rounded-[8px] border border-white/12 bg-white text-[#181512] transition duration-300 hover:-translate-y-1 ${
            index === 0 ? "lg:min-h-[450px]" : ""
          }`}
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(24,21,18,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(24,21,18,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={clean(product.name) ?? product.name}
              fill
              className="object-contain p-8 transition duration-500 group-hover:scale-[1.04]"
              sizes="(max-width: 1024px) 100vw, 520px"
            />
          ) : null}
          <div className="absolute inset-x-4 bottom-4 rounded-[8px] border border-[#181512]/10 bg-white/88 p-4 shadow-[0_18px_50px_rgba(24,21,18,0.12)] backdrop-blur">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#817569]">
              {clean(product.article)}
            </div>
            <h3 className="safe-heading mt-2 text-lg font-semibold leading-snug tracking-normal">
              {clean(product.name)}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-[8px] bg-[#f0e5d6] px-3 py-1 text-[#6f6559]">
                {clean(product.categoryName) ?? "Каталог"}
              </span>
              {product.basePriceRub ? (
                <span className="rounded-[8px] bg-[#181512] px-3 py-1 text-white">
                  {formatPriceRub(product.basePriceRub)}
                </span>
              ) : null}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const [{ featuredProducts, summary }, heroDetail] = await Promise.all([
    getCatalogLandingData(),
    getProductDetail(HERO_SKU_SLUG),
  ]);
  const lead = heroDetail?.product ?? featuredProducts[0];
  const showcaseProducts = (lead
    ? [lead, ...featuredProducts.filter((product) => product.id !== lead.id)]
    : featuredProducts
  ).slice(0, 4);

  return (
    <main className="overflow-hidden">
      <section className="px-3 pt-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-[1620px] overflow-hidden rounded-[8px] bg-[#f2e7d8] shadow-[0_42px_140px_rgba(24,21,18,0.16)]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(24,21,18,0.052)_1px,transparent_1px),linear-gradient(90deg,rgba(24,21,18,0.046)_1px,transparent_1px)] bg-[size:38px_38px]" />
          <div className="relative grid gap-4 p-4 sm:p-6 lg:min-h-[820px] lg:grid-cols-[0.88fr_1.12fr] lg:p-9">
            <div className="order-2 grid min-w-0 rounded-[8px] bg-[#181512] p-6 text-white sm:p-8 lg:order-1 lg:p-10">
              <div className="landing-rise">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-[8px] border border-white/14 bg-white/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/72">
                    Smart Presale
                  </span>
                  <span className="rounded-[8px] border border-[#c85f27]/45 bg-[#c85f27]/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#f09a60]">
                    live demo
                  </span>
                </div>

                <h1 className="safe-heading mt-8 max-w-[780px] text-[clamp(3rem,6vw,7rem)] font-semibold leading-[0.98] tracking-normal">
                  Presale, который выглядит как продукт
                </h1>

                <p className="safe-text mt-6 max-w-[620px] text-lg leading-8 text-white/68">
                  Каталог, подбор, 3D-сцена, КП и менеджерский follow-up собраны
                  в один демонстрационный маршрут. Клиент видит решение,
                  менеджер видит следующий шаг.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <ButtonLink href="/showcase/3d-visual-confidence">
                    Смотреть 3D proof
                  </ButtonLink>
                  <ButtonLink href="/catalog" variant="secondary">
                    Каталог
                  </ButtonLink>
                  <ButtonLink href="/admin/manager" variant="ghost">
                    Очередь менеджера
                  </ButtonLink>
                </div>
              </div>

              <div className="mt-10 grid self-end gap-3 sm:grid-cols-3">
                {[
                  ["SKU", summary.products],
                  ["Разделов", summary.categories],
                  ["Контуров", 6],
                ].map(([label, value]) => (
                  <div key={label} className="border-t border-white/12 pt-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                      {label}
                    </div>
                    <div className="mt-2 text-3xl font-semibold">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 grid gap-4 lg:order-2 lg:grid-rows-[minmax(0,1fr)_auto]">
              <div className="landing-rise relative min-h-[530px] overflow-hidden rounded-[8px] border border-[#181512]/10 bg-[#e7ded2] lg:bg-[#2b2a27]">
                <Image
                  src={heroMobileImage}
                  alt={clean(lead?.name) ?? "СКП.О.021 Bank with stairs"}
                  fill
                  priority
                  className="object-cover object-center lg:hidden"
                  sizes="100vw"
                />
                <Image
                  src={heroProofImage}
                  alt={clean(lead?.name) ?? "СКП.О.021 Bank with stairs"}
                  fill
                  priority
                  className="hidden object-cover object-center lg:block"
                  sizes="54vw"
                />
                <div className="absolute left-4 top-4 rounded-[8px] border border-[#181512]/10 bg-white/88 px-4 py-3 text-[#181512] shadow-[0_20px_50px_rgba(24,21,18,0.14)] backdrop-blur">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#817569]">
                    Hero product
                  </div>
                  <div className="mt-1 text-sm font-semibold">СКП.О.021</div>
                </div>
                <div className="absolute right-4 top-4 grid gap-2">
                  {["3D", "Scene", "PDF"].map((item) => (
                    <span
                      key={item}
                      className="rounded-[8px] bg-[#181512]/92 px-3 py-2 text-xs font-semibold text-white"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <div className="absolute inset-x-4 bottom-4 rounded-[8px] border border-white/14 bg-[#181512]/92 p-4 text-white backdrop-blur">
                  <div className="grid gap-2 sm:grid-cols-3">
                    {["3D-модель", "Материалы", "PDF-КП"].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm font-semibold">
                        <CheckCircle2 size={16} className="text-[#f09a60]" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="hidden gap-4 lg:grid lg:grid-cols-2">
                <div className="rounded-[8px] border border-[#181512]/10 bg-white/72 p-5 backdrop-blur">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#817569]">
                    Proposal
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-[#181512]">КП готово к отправке</div>
                  <div className="mt-4 flex items-center justify-between gap-4 rounded-[8px] bg-[#181512] px-3 py-2 text-sm text-white">
                    <span>Proposal v1</span>
                    <span className="font-semibold text-[#f09a60]">PDF</span>
                  </div>
                </div>
                <div className="rounded-[8px] border border-[#181512]/10 bg-white/72 p-5 backdrop-blur">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#817569]">
                    Manager queue
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-[#181512]">Следующий шаг назначен</div>
                  <div className="mt-4 flex items-center justify-between gap-4 rounded-[8px] bg-[#181512] px-3 py-2 text-sm text-white">
                    <span>Follow-up</span>
                    <span className="font-semibold text-[#f09a60]">due soon</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1620px] gap-10 lg:grid-cols-[minmax(320px,0.38fr)_minmax(0,0.62fr)]">
          <div>
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c85f27]">
              Operational story
            </div>
            <h2 className="safe-heading mt-4 text-[clamp(2.4rem,4.4vw,5.2rem)] font-semibold leading-[1.02] tracking-normal text-[#181512]">
              Все функции считываются как один процесс
            </h2>
            <p className="safe-text mt-6 max-w-xl text-lg leading-8 text-[#6f6559]">
              Редизайн не маскирует продукт. Он показывает реальную механику:
              от клиентского запроса до коммерческого документа и handoff.
            </p>
          </div>

          <div className="rounded-[8px] border border-[#181512]/10 bg-white/76 px-5 py-3 shadow-[0_28px_90px_rgba(24,21,18,0.08)] backdrop-blur sm:px-7">
            {processSteps.map((step, index) => (
              <ProcessLine key={step.title} step={step} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1620px] gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="relative overflow-hidden rounded-[8px] bg-[#181512] p-5 text-white sm:p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_0%,rgba(200,95,39,0.22),transparent_28%),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,34px_34px,34px_34px]" />
            <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f09a60]">
                  Visual confidence
                </div>
                <h2 className="safe-heading mt-4 max-w-3xl text-[clamp(2.4rem,4.4vw,5.4rem)] font-semibold leading-[1.02] tracking-normal">
                  3D и сцена работают как доказательство решения
                </h2>
              </div>
              <ButtonLink href="/showcase/3d-visual-confidence" variant="secondary">
                Открыть 3D proof
              </ButtonLink>
            </div>

            <div className="relative z-10 mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="relative min-h-[410px] overflow-hidden rounded-[8px] border border-white/12 bg-[#f4eadc]">
                <Image
                  src={contextProofImage}
                  alt="Размещение СКП.О.021 на площадке"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 820px"
                />
              </div>
              <div className="grid content-between gap-4 rounded-[8px] border border-white/12 bg-white/[0.07] p-5 backdrop-blur">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/42">
                    Explanation layer
                  </div>
                  <h3 className="safe-heading mt-3 text-2xl font-semibold leading-tight tracking-normal">
                    Смысл рядом с моделью, не поверх нее
                  </h3>
                  <p className="safe-text mt-3 text-sm leading-6 text-white/62">
                    Маркеры остаются маленькими. Основной слой объяснения:
                    деталь, материал, назначение и аргумент для клиента.
                  </p>
                </div>
                <div className="grid gap-2">
                  {["Катальная поверхность", "Металлические кромки", "Зона размещения"].map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-[8px] bg-white/8 px-3 py-2 text-sm"
                    >
                      <span>{item}</span>
                      <span className="h-2 w-2 rounded-full bg-[#f09a60]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="grid gap-4">
            {cockpitRows.map(([type, title, status]) => (
              <div
                key={type}
                className="rounded-[8px] border border-[#181512]/10 bg-white/78 p-5 shadow-[0_18px_60px_rgba(24,21,18,0.06)] backdrop-blur"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#817569]">
                  {type}
                </div>
                <div className="mt-2 flex items-center justify-between gap-4">
                  <div className="text-lg font-semibold text-[#181512]">{title}</div>
                  <span className="rounded-[8px] bg-[#181512] px-3 py-1 text-xs font-semibold text-white">
                    {status}
                  </span>
                </div>
              </div>
            ))}
          </aside>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1620px]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c85f27]">
                Каталог производителя
              </div>
              <h2 className="safe-heading mt-4 max-w-5xl text-[clamp(2.4rem,4.4vw,5.2rem)] font-semibold leading-[1.02] tracking-normal text-[#181512]">
                Реальные изделия ведут в живые карточки, а не в мокап
              </h2>
            </div>
            <ButtonLink href="/catalog" variant="secondary">
              Перейти в каталог
            </ButtonLink>
          </div>

          <div className="mt-8 rounded-[8px] bg-[#181512] p-4 sm:p-5">
            <ProductRail products={showcaseProducts} />
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1620px] overflow-hidden rounded-[8px] bg-[#f1e5d5] lg:grid-cols-[minmax(0,0.74fr)_minmax(0,1fr)]">
          <div className="p-6 sm:p-9 lg:p-12">
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c85f27]">
              Demo script
            </div>
            <h2 className="safe-heading mt-5 text-[clamp(2.4rem,4.8vw,5.8rem)] font-semibold leading-[1] tracking-normal text-[#181512]">
              5-7 минут, чтобы показать весь продукт
            </h2>
            <p className="safe-text mt-6 max-w-xl text-lg leading-8 text-[#6f6559]">
              Это маршрут по работающим контурам, а не декоративная витрина.
              Он быстро объясняет, почему Smart Presale сильнее обычного сайта.
            </p>
          </div>
          <div className="border-t border-[#181512]/10 bg-white/56 p-5 sm:p-7 lg:border-l lg:border-t-0">
            {demoRoute.map((step, index) => (
              <div
                key={step}
                className="grid gap-4 border-t border-[#181512]/10 py-5 first:border-t-0 sm:grid-cols-[70px_minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="font-mono text-sm font-semibold text-[#c85f27]">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="safe-text text-lg font-semibold text-[#181512]">{step}</div>
                <ArrowRight className="text-[#6f6559]" size={20} strokeWidth={1.8} />
              </div>
            ))}
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href="/showcase/3d-visual-confidence">
                Начать с 3D proof
              </ButtonLink>
              <ButtonLink href="/admin/manager" variant="secondary">
                Открыть manager flow
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
