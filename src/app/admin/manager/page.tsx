import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { requireManagerWorkspacePageUser } from "@/application/manager-workspace/access";
import {
  CommercialBaselineReadout,
  CommercialRatioMetric,
  ManagerAttentionFlagCode,
  ManagerQueueAttentionFilter,
  ManagerQueueNextActionFilter,
  ManagerQueueScope,
  ManagerQueueSort,
} from "@/application/manager-workspace/read-models";
import {
  ClientRequestStatus,
  clientRequestStatusTransitions,
} from "@/application/sales-process/types";
import { managerWorkspaceReadRepository } from "@/infrastructure/db/manager-workspace-read-repository";
import { cleanDisplayText } from "@/shared/utils/display-text";
import {
  Eyebrow,
  MetricBlock,
  Pill,
  Stage,
} from "@/ui/components/common/visual-system";

export const dynamic = "force-dynamic";

type ManagerQueuePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const statusLabels: Record<ClientRequestStatus, string> = {
  SUBMITTED: "Получена",
  NEEDS_REVIEW: "Нужна проверка",
  QUALIFIED: "Квалифицирована",
  RECOMMENDATION_READY: "Подбор готов",
  IN_SALES: "В продаже",
  PROPOSAL_SENT: "КП отправлено",
  WON: "Выиграна",
  LOST: "Проиграна",
  ARCHIVED: "Архив",
  UPLOADED: "Фото загружены",
  PRELIMINARY_ESTIMATE_READY: "Оценка готова",
  WAITING_MATERIAL_COSTS: "Ждет себестоимость",
  MODEL_BRIEF_READY: "3D-бриф готов",
  PROPOSAL_DRAFT_READY: "Черновик КП",
};

const attentionLabels: Record<ManagerAttentionFlagCode, string> = {
  OVERDUE_NEXT_ACTION: "Просрочено",
  NO_OWNER: "Без владельца",
  NO_NEXT_ACTION: "Нет next action",
  ACTIVE_PROPOSAL_NOT_SENT: "Активное КП",
  PROPOSAL_READY_NOT_SENT: "КП готово",
  SENT_WITHOUT_OUTCOME: "Нет итога",
  PROCESS_OK: "В норме",
};

const selectableStatuses = Object.keys(clientRequestStatusTransitions) as ClientRequestStatus[];
const attentionOptions: Array<[ManagerQueueAttentionFilter, string]> = [
  ["any", "Все сигналы"],
  ["overdue", "Просроченные"],
  ["no-owner", "Без владельца"],
  ["no-next-action", "Без next action"],
  ["proposal-ready", "КП готово"],
  ["active-proposal", "Активное КП"],
  ["sent-without-outcome", "КП без итога"],
];
const sortOptions: Array<[ManagerQueueSort, string]> = [
  ["priority", "По приоритету"],
  ["dueAsc", "По дедлайну"],
  ["updatedDesc", "Недавно обновленные"],
  ["createdDesc", "Новые сначала"],
];

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function clean(value?: string) {
  return value ? cleanDisplayText(value) : value;
}

function isAttentionFilter(value?: string): value is ManagerQueueAttentionFilter {
  return attentionOptions.some(([option]) => option === value);
}

function isSort(value?: string): value is ManagerQueueSort {
  return sortOptions.some(([option]) => option === value);
}

function normalizeSearchParams(params: Record<string, string | string[] | undefined>) {
  const status = firstValue(params.status);
  const scope: ManagerQueueScope = firstValue(params.scope) === "all" ? "all" : "mine";
  const nextActionValue = firstValue(params.nextAction);
  const attentionValue = firstValue(params.attention);
  const sortValue = firstValue(params.sort);

  return {
    scope,
    status: selectableStatuses.includes(status as ClientRequestStatus)
      ? (status as ClientRequestStatus)
      : undefined,
    overdueOnly: firstValue(params.overdue) === "1",
    nextAction:
      nextActionValue === "with" || nextActionValue === "without"
        ? (nextActionValue as ManagerQueueNextActionFilter)
        : "any",
    attention: isAttentionFilter(attentionValue) ? attentionValue : "any",
    sort: isSort(sortValue) ? sortValue : "priority",
  } as const;
}

function buildQueueHref(
  filters: ReturnType<typeof normalizeSearchParams>,
  overrides: Partial<Record<"scope" | "status" | "overdue" | "nextAction" | "attention" | "sort", string | undefined>>,
) {
  const next = {
    scope: filters.scope,
    status: filters.status,
    overdue: filters.overdueOnly ? "1" : undefined,
    nextAction: filters.nextAction === "any" ? undefined : filters.nextAction,
    attention: filters.attention === "any" ? undefined : filters.attention,
    sort: filters.sort === "priority" ? undefined : filters.sort,
    ...overrides,
  };
  const params = new URLSearchParams();

  Object.entries(next).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `/admin/manager?${query}` : "/admin/manager";
}

function detailHref(requestId: string, queueHref: string) {
  return `/admin/manager/${requestId}?from=${encodeURIComponent(queueHref)}`;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "не задано";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMetric(metric: CommercialRatioMetric) {
  return `${metric.count}/${metric.total} · ${formatPercent(metric.rate)}`;
}

function attentionTone(code?: ManagerAttentionFlagCode) {
  if (code === "OVERDUE_NEXT_ACTION" || code === "NO_OWNER") {
    return "danger";
  }

  if (
    code === "PROPOSAL_READY_NOT_SENT" ||
    code === "NO_NEXT_ACTION" ||
    code === "SENT_WITHOUT_OUTCOME"
  ) {
    return "warning";
  }

  if (code === "ACTIVE_PROPOSAL_NOT_SENT") {
    return "accent";
  }

  return "success";
}

function BaselinePanel({ baseline }: { baseline: CommercialBaselineReadout }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <MetricBlock label="Активные" value={baseline.activeRequests} />
      <MetricBlock label="Без владельца" value={formatMetric(baseline.noOwner)} />
      <MetricBlock label="Без next action" value={formatMetric(baseline.noCanonicalNextAction)} />
      <MetricBlock label="Просрочены" value={formatMetric(baseline.overdueCanonicalNextAction)} />
      <MetricBlock label="КП без итога" value={formatMetric(baseline.sentWithoutOutcome)} />
    </div>
  );
}

function Notice({ message, tone }: { message?: string; tone: "ok" | "error" }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`rounded-[24px] px-5 py-4 text-sm font-semibold ${
        tone === "ok"
          ? "border border-emerald-100 bg-emerald-50 text-emerald-800"
          : "border border-red-100 bg-red-50 text-red-800"
      }`}
    >
      {clean(message)}
    </div>
  );
}

export default async function ManagerQueuePage({ searchParams }: ManagerQueuePageProps) {
  noStore();
  const params = await searchParams;
  const currentUser = await requireManagerWorkspacePageUser("/admin/manager");
  const normalizedParams = normalizeSearchParams(params ?? {});
  const queue = await managerWorkspaceReadRepository.getManagerQueue({
    ...normalizedParams,
    managerId: currentUser.id,
  });
  const queueHref = buildQueueHref(normalizedParams, {});
  const okMessage = firstValue(params?.ok);
  const errorMessage = firstValue(params?.error);

  return (
    <main className="mx-auto max-w-[1620px] px-4 py-8 sm:px-6 lg:px-8">
      <Stage>
        <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside>
            <Eyebrow>Manager workspace</Eyebrow>
            <h1 className="safe-heading mt-4 text-[clamp(2.7rem,5vw,5.6rem)] font-semibold leading-[0.94] tracking-[-0.075em] text-[var(--foreground)]">
              Рабочая очередь
            </h1>
            <p className="safe-text mt-5 text-sm leading-7 text-[var(--foreground-muted)]">
              Один экран для коммерческой дисциплины: владелец, следующий шаг, КП,
              просрочки и итог сделки.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <MetricBlock label="В очереди" value={queue.summary.total} />
              <MetricBlock label="Мои" value={queue.summary.mine} />
              <MetricBlock label="Просрочки" value={queue.summary.overdue} />
              <MetricBlock label="Без owner" value={queue.summary.withoutOwner} />
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              <Link href={buildQueueHref(normalizedParams, { scope: "mine" })}>
                <Pill tone={queue.filters.scope === "mine" ? "dark" : "default"}>Мои</Pill>
              </Link>
              <Link href={buildQueueHref(normalizedParams, { scope: "all" })}>
                <Pill tone={queue.filters.scope === "all" ? "dark" : "default"}>Все</Pill>
              </Link>
              <Link href={buildQueueHref(normalizedParams, { attention: "overdue" })}>
                <Pill tone={queue.filters.attention === "overdue" ? "accent" : "default"}>
                  Просроченные
                </Pill>
              </Link>
            </div>
          </aside>

          <section className="space-y-5">
            <Notice message={okMessage} tone="ok" />
            <Notice message={errorMessage} tone="error" />

            <BaselinePanel baseline={queue.commercialBaseline} />

            <div className="visual-table rounded-[32px] p-4">
              <form action="/admin/manager" className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <select name="scope" defaultValue={queue.filters.scope} className="h-12 rounded-2xl border border-[var(--border)] bg-white/80 px-4 text-sm outline-none">
                  <option value="mine">Мои заявки</option>
                  <option value="all">Все заявки</option>
                </select>
                <select name="status" defaultValue={queue.filters.status ?? ""} className="h-12 rounded-2xl border border-[var(--border)] bg-white/80 px-4 text-sm outline-none">
                  <option value="">Все статусы</option>
                  {selectableStatuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
                <select name="attention" defaultValue={queue.filters.attention ?? "any"} className="h-12 rounded-2xl border border-[var(--border)] bg-white/80 px-4 text-sm outline-none">
                  {attentionOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <select name="sort" defaultValue={queue.filters.sort ?? "priority"} className="h-12 rounded-2xl border border-[var(--border)] bg-white/80 px-4 text-sm outline-none">
                  {sortOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button className="h-12 rounded-full bg-[var(--surface-dark)] px-5 text-sm font-semibold text-white">
                  Применить
                </button>
              </form>
            </div>

            <div className="visual-table overflow-hidden rounded-[34px]">
              <div className="grid grid-cols-[0.9fr_1.2fr_0.85fr_1fr_0.7fr] gap-4 px-5 py-4 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--foreground-soft)] max-lg:hidden">
                <div>Приоритет</div>
                <div>Заявка</div>
                <div>Статус</div>
                <div>Следующий шаг</div>
                <div>Движение</div>
              </div>

              {queue.items.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="text-2xl font-semibold tracking-[-0.05em]">Очередь пустая</div>
                  <p className="safe-text mt-3 text-sm text-[var(--foreground-muted)]">
                    По текущим фильтрам нет активных заявок. Архив скрыт из основной очереди.
                  </p>
                  <Link
                    href="/admin/manager"
                    className="mt-6 inline-flex rounded-full bg-[var(--surface-dark)] px-5 py-3 text-sm font-semibold text-white"
                  >
                    Сбросить фильтры
                  </Link>
                </div>
              ) : (
                <div>
                  {queue.items.map((item) => (
                    <Link
                      key={item.clientRequestId}
                      href={detailHref(item.clientRequestId, queueHref)}
                      className="visual-row grid gap-4 px-5 py-5 transition hover:bg-white/62 lg:grid-cols-[0.9fr_1.2fr_0.85fr_1fr_0.7fr]"
                    >
                      <div>
                        <Pill tone={attentionTone(item.primaryAttentionCode)}>
                          {item.primaryAttentionCode
                            ? attentionLabels[item.primaryAttentionCode]
                            : "В норме"}
                        </Pill>
                        <div className="mt-3 text-xs text-[var(--foreground-muted)]">
                          rank {item.priorityRank}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Eyebrow>{item.requestNumber}</Eyebrow>
                          {item.isDemo ? <Pill tone="accent">DEMO</Pill> : null}
                        </div>
                        <div className="safe-text mt-2 text-lg font-semibold leading-tight tracking-[-0.04em]">
                          {clean(item.title)}
                        </div>
                        <div className="safe-text mt-2 text-sm text-[var(--foreground-muted)]">
                          {clean(item.companyName) ?? "Компания не указана"} / {clean(item.contactName)}
                        </div>
                      </div>
                      <div>
                        <Pill tone="muted">{statusLabels[item.currentStatus]}</Pill>
                        <div className="safe-text mt-3 text-xs leading-5 text-[var(--foreground-muted)]">
                          Owner: {clean(item.assignedManagerName) ?? "не назначен"}
                        </div>
                        {item.hasActiveProposal ? (
                          <div className="safe-text mt-2 text-xs font-semibold text-[var(--accent)]">
                            КП: {item.activeProposalStatus}
                          </div>
                        ) : null}
                      </div>
                      <div className="safe-text text-sm leading-6">
                        <div className={item.overdueFlag ? "font-semibold text-red-700" : "font-semibold"}>
                          {clean(item.nextActionLabel) ?? "не запланирован"}
                        </div>
                        <div className="text-[var(--foreground-muted)]">
                          {formatDateTime(item.nextActionAt)}
                        </div>
                      </div>
                      <div className="text-sm text-[var(--foreground-muted)]">
                        {formatDateTime(item.lastActivityAt)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </Stage>
    </main>
  );
}
