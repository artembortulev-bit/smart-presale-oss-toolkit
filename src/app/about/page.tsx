import { InfoPage } from "@/ui/components/common/info-page";

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="О компании"
      title="Smart Presale"
      metrics={[
        { label: "Профиль", value: "Производитель" },
        { label: "Каталог", value: "2231 SKU" },
        { label: "Контур", value: "Presale" },
      ]}
      bullets={["Игровые комплексы", "МАФ", "Спорт", "КП и подбор"]}
      ctaHref="/catalog"
      ctaLabel="Каталог"
      secondaryCtaHref="/projects"
      secondaryCtaLabel="Проекты"
      aside={
        <>
          <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-[rgba(255,255,255,0.56)]">
            Платформа
          </div>
          <h2 className="mt-4 text-[2rem] font-semibold leading-[1.04] text-white">
            Каталог, подбор, 3D и КП в одном контуре.
          </h2>
          <div className="mt-7 space-y-3">
            {[
              "Единый каталог производителя",
              "Сценарии под объект",
              "Связка с документным слоем",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] px-4 py-3 text-sm text-[rgba(255,255,255,0.84)]"
              >
                {item}
              </div>
            ))}
          </div>
        </>
      }
    />
  );
}
