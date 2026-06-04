import {
  getPortalContext,
  getPortalHomeHref,
} from "@/application/auth/portal-access";

type SignInPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getNextParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

const roleCards = [
  {
    role: "guest",
    title: "Гостевой режим",
    subtitle: "Публичная витрина",
    text: "Просмотр каталога, решений, кейсов и общей информации о платформе без рабочего контура.",
  },
  {
    role: "client",
    title: "Клиент",
    subtitle: "Фото-заявки и статусы",
    text: "Доступ к кабинету клиента, созданию фото-заявок, просмотру оценки и черновиков коммерческого предложения.",
  },
  {
    role: "employee",
    title: "Сотрудник",
    subtitle: "Presale workbench",
    text: "Подбор по объекту, сцены размещения, менеджерский контур, генератор КП и внутренние инструменты.",
  },
] as const;

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = getNextParam(params, "next");
  const currentRole = (await getPortalContext()).role;

  return (
    <main className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <section className="surface-shell rounded-[40px] p-5 sm:p-6 lg:p-7">
        <div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_380px]">
          <section className="glass-panel rounded-[34px] p-7 sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--foreground-muted)]">
              Доступ к платформе
            </p>
            <h1 className="mt-4 max-w-4xl text-[clamp(2.3rem,5vw,4.4rem)] font-semibold leading-[0.94] tracking-[-0.06em] text-[var(--foreground)]">
              Разделяем контуры клиента, сотрудника и публичной витрины
            </h1>
            <p className="mt-5 max-w-3xl text-[15px] leading-8 text-[var(--foreground-muted)]">
              Сейчас это управляемый MVP-слой доступа. Он уже разделяет
              сценарии работы, навигацию и защищенные разделы, а следующим
              этапом может быть подключение полноценной авторизации с ролями.
            </p>

            <div className="mt-7 grid gap-4 lg:grid-cols-3">
              {roleCards.map((item) => (
                <form
                  key={item.role}
                  action="/api/session/role"
                  method="post"
                  className="rounded-[28px] border border-[rgba(255,255,255,0.62)] bg-[rgba(255,255,255,0.58)] p-5 backdrop-blur-xl"
                >
                  <input type="hidden" name="role" value={item.role} />
                  <input
                    type="hidden"
                    name="next"
                    value={nextPath || getPortalHomeHref(item.role)}
                  />
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--foreground-muted)]">
                    {item.subtitle}
                  </div>
                  <div className="mt-3 text-[1.65rem] font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--foreground)]">
                    {item.title}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[var(--foreground-muted)]">
                    {item.text}
                  </p>
                  <button
                    type="submit"
                    className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent)_0%,#ff7a29_100%)] px-5 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(239,100,29,0.22)] transition hover:-translate-y-0.5"
                  >
                    {item.role === currentRole ? "Текущий режим" : "Открыть контур"}
                  </button>
                </form>
              ))}
            </div>
          </section>

          <aside className="dark-panel rounded-[34px] p-6 text-white">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[rgba(255,255,255,0.48)]">
              Контур доступа
            </div>
            <h2 className="mt-4 text-[2rem] font-semibold leading-[0.96] tracking-[-0.05em] text-white">
              Текущий режим:{" "}
              {currentRole === "employee"
                ? "сотрудник"
                : currentRole === "client"
                  ? "клиент"
                  : "гость"}
            </h2>
            <div className="mt-6 space-y-3">
              {[
                "Гость видит только публичную витрину и может изучать каталог.",
                "Клиент получает кабинет с фото-заявками, оценками и статусами.",
                "Сотрудник работает в подборе, сценах, КП и менеджерском контуре.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm leading-7 text-[rgba(255,255,255,0.72)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
