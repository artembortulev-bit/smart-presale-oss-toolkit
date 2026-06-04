import Link from "next/link";
import { notFound } from "next/navigation";

import {
  TRACK_V_DEMO_READY_SKU,
  TRACK_V_SCENE_PRESET,
  getTrackVReadiness,
} from "@/application/visual-confidence/showcase";
import { getCatalogProductBySlug } from "@/infrastructure/data/generated-catalog";
import { cleanDisplayText } from "@/shared/utils/display-text";
import { ProductViewer } from "@/ui/components/catalog/product-viewer";
import { ButtonLink } from "@/ui/components/common/button-link";
import {
  Eyebrow,
  MetricBlock,
  Pill,
  ProofPanel,
  SectionHeader,
  Stage,
} from "@/ui/components/common/visual-system";
import { VisualConfidenceSceneClient } from "@/ui/components/visual-confidence/visual-confidence-scene-client";

export const metadata = {
  title: "3D Product Proof | Smart Presale",
  description:
    "Коммерческая 3D-демонстрация изделия Smart Presale: модель, материалы, узлы и размещение на площадке.",
};

function clean(value?: string) {
  return value ? cleanDisplayText(value) : value;
}

export default async function VisualConfidenceShowcasePage() {
  const product = await getCatalogProductBySlug(TRACK_V_DEMO_READY_SKU.slug);

  if (!product) {
    notFound();
  }

  const readiness = getTrackVReadiness(product);
  const catalogHref = `/catalog/${product.categorySlug}/${product.slug}`;

  return (
    <main className="mx-auto max-w-[1620px] px-4 py-8 sm:px-6 lg:px-8">
      <Stage>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.08fr)_420px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <Pill tone="accent">3D product proof</Pill>
              <Pill tone="default">Материалы · узлы · размещение</Pill>
            </div>

            <h1
              className="safe-heading mt-8 max-w-[330px] text-[clamp(2.35rem,8.3vw,6.6rem)] font-semibold leading-[0.96] text-[var(--foreground)] sm:max-w-5xl"
              style={{ letterSpacing: "-0.018em", wordSpacing: "0.18em" }}
            >
              Изделие видно до выхода на площадку
            </h1>
            <p className="body-lead safe-text mt-7 max-w-[330px] sm:max-w-3xl">
              Клиент видит не только фото и таблицу, а цифровое доказательство:
              как устроен объект, где находятся материалы и какой контур он занимает
              на участке.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={catalogHref}>Открыть карточку изделия</ButtonLink>
              <ButtonLink href="/configurator" variant="secondary">
                Подобрать решение
              </ButtonLink>
            </div>
          </div>

          <ProofPanel dark className="min-w-0 max-w-[330px] p-7 sm:max-w-none">
            <Eyebrow className="text-white/48">Демонстрационный SKU</Eyebrow>
            <h2 className="safe-heading mt-4 text-[2.5rem] font-semibold leading-none tracking-[-0.07em] text-white">
              {clean(product.article)}
            </h2>
            <p className="safe-text mt-4 text-lg font-semibold leading-7 text-white">
              {clean(product.name)}
            </p>
            <div className="mt-7 grid gap-3">
              <div className="rounded-[24px] bg-white/[0.055] px-4 py-4">
                <Eyebrow className="text-white/42">Готовность показа</Eyebrow>
                <div className="mt-2 text-lg font-semibold">
                  {readiness.demoReady
                    ? "3D-модель подключена"
                    : "3D-модель готовится"}
                </div>
              </div>
              <div className="rounded-[24px] bg-white/[0.055] px-4 py-4">
                <Eyebrow className="text-white/42">Площадка</Eyebrow>
                <div className="mt-2 text-lg font-semibold">
                  {TRACK_V_SCENE_PRESET.bounds.widthM}×{TRACK_V_SCENE_PRESET.bounds.lengthM} м
                </div>
              </div>
            </div>
          </ProofPanel>
        </div>
      </Stage>

      <section id="product-3d-proof" className="mt-8">
        <Stage>
          <SectionHeader
            eyebrow="Изделие в 3D"
            title="Кликабельная модель с материалами и узлами"
            description="Модель можно вращать и приближать. Выбранный узел показывает материал, назначение и исполнение в боковой панели, не перекрывая само изделие."
            action={<Pill tone="accent">3D-модель изделия</Pill>}
          />
          <div className="mt-7">
            <ProductViewer
              product={product}
              requireRealAsset
              confidenceModeLabel="3D-модель изделия"
            />
          </div>
        </Stage>
      </section>

      <section id="scene-proof" className="mt-8">
        <Stage tone="warm">
          <SectionHeader
            eyebrow="Контекст площадки"
            title="Размещение на участке клиента"
            description="Фиксированная сцена показывает footprint изделия и ориентировочную зону безопасности без превращения демо в тяжелый редактор."
            action={
              <Link
                href={catalogHref}
                className="rounded-full border border-[var(--border)] bg-white/76 px-5 py-3 text-sm font-semibold text-[var(--foreground)]"
              >
                Паспорт изделия
              </Link>
            }
          />

          <div className="mt-7">
            <VisualConfidenceSceneClient product={product} />
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <MetricBlock
              label="Участок"
              value={`${TRACK_V_SCENE_PRESET.bounds.widthM}×${TRACK_V_SCENE_PRESET.bounds.lengthM} м`}
            />
            <MetricBlock
              label="Контур изделия"
              value={`${TRACK_V_SCENE_PRESET.footprint.widthM}×${TRACK_V_SCENE_PRESET.footprint.lengthM} м`}
            />
            <MetricBlock
              label="Зона безопасности"
              value={`${TRACK_V_SCENE_PRESET.safetyZone.widthM}×${TRACK_V_SCENE_PRESET.safetyZone.lengthM} м`}
            />
          </div>
        </Stage>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <ProofPanel>
          <Eyebrow>Что видит клиент</Eyebrow>
          <h3 className="safe-heading mt-3 text-3xl font-semibold tracking-[-0.06em] text-[var(--foreground)]">
            Не инженерную кухню, а понятное доказательство
          </h3>
          <p className="safe-text mt-4 text-sm leading-7 text-[var(--foreground-muted)]">
            Внешний слой показывает изделие, материалы, назначение узлов и габаритный
            контекст. Внутренние статусы asset pipeline остаются в технической зоне.
          </p>
        </ProofPanel>

        <ProofPanel>
          <Eyebrow>Честное состояние</Eyebrow>
          <h3 className="safe-heading mt-3 text-3xl font-semibold tracking-[-0.06em] text-[var(--foreground)]">
            Если 3D не готово, мы не показываем подмену
          </h3>
          <p className="safe-text mt-4 text-sm leading-7 text-[var(--foreground-muted)]">
            В публичном демо fake/proxy-модель не используется как готовая capability.
            Если реальный asset отсутствует, интерфейс показывает аккуратное состояние подготовки.
          </p>
        </ProofPanel>
      </section>
    </main>
  );
}
