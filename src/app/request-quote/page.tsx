import { ButtonLink } from "@/ui/components/common/button-link";

const fields = [
  ["Компания / клиент", "text", "ООО Атмосфера"],
  ["Контактное лицо", "text", "Иван Иванов"],
  ["Эл. почта", "email", "sales@example.com"],
  ["Телефон", "tel", "+7 (___) ___-__-__"],
  ["Адрес объекта", "text", "г. Казань, ..."],
] as const;

export default function RequestQuotePage() {
  return (
    <main className="mx-auto max-w-[1580px] px-6 py-8 lg:px-8">
      <section className="surface-shell rounded-[42px] p-5 lg:p-6">
        <div className="relative z-10 grid gap-5 lg:grid-cols-[1.02fr_0.98fr]">
          <section className="glass-panel rounded-[34px] p-8 lg:p-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--foreground-muted)]">
              Запрос КП
            </p>
            <h1 className="mt-4 max-w-3xl font-sans text-[clamp(2.2rem,4vw,3.7rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-[var(--foreground)]">
              Старт коммерческого запроса
            </h1>

            <form className="mt-8 grid gap-4">
              {fields.map(([label, type, placeholder]) => (
                <label key={label} className="block space-y-2">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                    {label}
                  </span>
                  <input
                    type={type}
                    placeholder={placeholder}
                    className="h-12 w-full rounded-[18px] border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.58)] px-4 text-[var(--foreground)]"
                  />
                </label>
              ))}

              <label className="block space-y-2">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
                  Комментарий
                </span>
                <textarea
                  rows={5}
                  placeholder="Объект, пожелания, бюджет, сроки"
                  className="w-full rounded-[24px] border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.58)] px-4 py-3 text-[var(--foreground)]"
                />
              </label>

              <div className="mt-2 flex flex-wrap gap-3">
                <ButtonLink href="/proposals/new">Генератор КП</ButtonLink>
                <ButtonLink href="/configurator" variant="secondary">
                  Подбор объекта
                </ButtonLink>
              </div>
            </form>
          </section>

          <aside className="dark-panel rounded-[34px] p-8 text-white lg:p-10">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[rgba(255,255,255,0.62)]">
              Дальше
            </div>
            <h2 className="mt-4 max-w-lg font-sans text-[2rem] font-semibold leading-[1.02] tracking-[-0.06em] text-white">
              Запрос сразу уходит в подбор, КП и клиентский контур.
            </h2>
            <div className="mt-8 flex flex-wrap gap-3">
              {["Клиент", "Объект", "Подбор", "Документ"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm text-[rgba(255,255,255,0.82)]"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/client">Кабинет клиента</ButtonLink>
              <ButtonLink
                href="/catalog"
                variant="secondary"
                className="bg-white/92 !text-[#181613] hover:!text-[#181613]"
              >
                Каталог
              </ButtonLink>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
