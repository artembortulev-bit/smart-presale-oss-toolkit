import { InfoPage } from "@/ui/components/common/info-page";

export default function SolutionsPage() {
  return (
    <InfoPage
      eyebrow="Решения"
      title="Сценарии под объект"
      metrics={[
        { label: "Подбор", value: "Rule-based" },
        { label: "Вход", value: "Текст + параметры" },
        { label: "Контур", value: "3D-ready" },
      ]}
      bullets={["Частный дом", "ЖК", "Детский сад", "Парк и спорт"]}
      ctaHref="/configurator"
      ctaLabel="Подбор объекта"
      secondaryCtaHref="/catalog"
      secondaryCtaLabel="Каталог"
      aside={
        <>
          <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-[rgba(255,255,255,0.56)]">
            Сценарии
          </div>
          <h2 className="mt-4 text-[2rem] font-semibold leading-[1.04] text-white">
            Частный, муниципальный и коммерческий контур.
          </h2>
          <div className="mt-7 space-y-3">
            {["Частный сегмент", "ЖК и двор", "Детский сад", "Парк и спорт"].map((item) => (
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
