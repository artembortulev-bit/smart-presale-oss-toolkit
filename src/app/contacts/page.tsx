import { InfoPage } from "@/ui/components/common/info-page";

export default function ContactsPage() {
  return (
    <InfoPage
      eyebrow="Контакты"
      title="Коммерческий контур"
      metrics={[
        { label: "Почта", value: "sales@example.com" },
        { label: "Телефон", value: "+7 900 000-00-00" },
        { label: "Канал", value: "Фото-заявка" },
      ]}
      bullets={["Запрос КП", "Подбор объекта", "Клиентский кабинет", "Сопровождение сделки"]}
      ctaHref="/request-quote"
      ctaLabel="Запросить КП"
      secondaryCtaHref="/auth/sign-in"
      secondaryCtaLabel="Войти"
      aside={
        <>
          <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-[rgba(255,255,255,0.56)]">
            Связь
          </div>
          <h2 className="mt-4 text-[2rem] font-semibold leading-[1.04] text-white">
            Один вход для запроса, подбора и коммерческого предложения.
          </h2>
          <div className="mt-7 space-y-3">
            {[
              ["Почта", "sales@example.com"],
              ["Телефон", "+7 900 000-00-00"],
              ["Режим", "клиент / сотрудник"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] px-4 py-4"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[rgba(255,255,255,0.5)]">
                  {label}
                </div>
                <div className="mt-2 text-base font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
        </>
      }
    />
  );
}
