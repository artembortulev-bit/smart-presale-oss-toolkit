import { randomUUID } from "node:crypto";

import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { requireManagerWorkspacePageUser } from "@/application/manager-workspace/access";
import { ManagerAttentionFlagCode } from "@/application/manager-workspace/read-models";
import { ClientRequestStatus } from "@/application/sales-process/types";
import { managerWorkspaceReadRepository } from "@/infrastructure/db/manager-workspace-read-repository";
import { cleanDisplayText } from "@/shared/utils/display-text";
import { formatPriceRub } from "@/shared/utils/money";
import {
  DocumentBlock,
  Eyebrow,
  MetricBlock,
  Pill,
  ProofPanel,
  SectionHeader,
  Stage,
} from "@/ui/components/common/visual-system";
import { ActionSubmitButton } from "@/ui/components/manager-workspace/action-submit-button";

import {
  archiveRequestAction,
  assignManagerAction,
  cancelSalesActionAction,
  completeSalesActionAction,
  createSalesActionAction,
  recordOutcomeAction,
  recordProposalSentAction,
  rescheduleSalesActionAction,
} from "../actions";

export const dynamic = "force-dynamic";

type RequestWorkspacePageProps = {
  params: Promise<{ requestId: string }>;
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
  OVERDUE_NEXT_ACTION: "Просрочен следующий шаг",
  NO_OWNER: "Нет владельца",
  NO_NEXT_ACTION: "Нет следующего шага",
  ACTIVE_PROPOSAL_NOT_SENT: "КП активно, но не отправлено",
  PROPOSAL_READY_NOT_SENT: "КП готово к отправке",
  SENT_WITHOUT_OUTCOME: "КП отправлено, итог не зафиксирован",
  PROCESS_OK: "Критичных сигналов нет",
};

const actionTypeOptions = [
  ["CALL", "Звонок"],
  ["EMAIL", "Письмо"],
  ["MEETING", "Встреча"],
  ["FOLLOW_UP", "Follow-up"],
  ["INTERNAL_NOTE", "Внутренняя заметка"],
] as const;

const inputClass =
  "mt-2 h-11 w-full rounded-2xl border border-[var(--border)] bg-white/82 px-4 text-sm outline-none";
const textareaClass =
  "mt-2 min-h-24 w-full rounded-2xl border border-[var(--border)] bg-white/82 px-4 py-3 text-sm outline-none";

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function clean(value?: string | null) {
  return value ? cleanDisplayText(value) : value;
}

function safeManagerFrom(value?: string) {
  if (!value || value.startsWith("//") || value.includes("://")) {
    return "/admin/manager";
  }

  return value === "/admin/manager" || value.startsWith("/admin/manager?")
    ? value
    : "/admin/manager";
}

function formatDateTime(value?: string) {
  if (!value) {
    return "не задано";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function dateTimeLocalValue(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16);
}

function quickDateTimeLocal(hoursFromNow: number) {
  return dateTimeLocalValue(new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString());
}

function HiddenContext({
  requestId,
  returnTo,
  commandId,
  proposalId,
  proposalVersionId,
  sceneProjectId,
}: {
  requestId: string;
  returnTo: string;
  commandId: string;
  proposalId?: string;
  proposalVersionId?: string;
  sceneProjectId?: string;
}) {
  return (
    <>
      <input type="hidden" name="clientRequestId" value={requestId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="commandId" value={commandId} />
      {proposalId ? <input type="hidden" name="proposalId" value={proposalId} /> : null}
      {proposalVersionId ? (
        <input type="hidden" name="proposalVersionId" value={proposalVersionId} />
      ) : null}
      {sceneProjectId ? <input type="hidden" name="sceneProjectId" value={sceneProjectId} /> : null}
    </>
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
      {cleanDisplayText(message)}
    </div>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Eyebrow>{children}</Eyebrow>;
}

function attentionTone(code: ManagerAttentionFlagCode) {
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

export default async function RequestWorkspacePage({
  params,
  searchParams,
}: RequestWorkspacePageProps) {
  noStore();
  const { requestId } = await params;
  const query = await searchParams;
  await requireManagerWorkspacePageUser(`/admin/manager/${requestId}`);
  const workspace = await managerWorkspaceReadRepository.getRequestWorkspace(requestId);

  if (!workspace) {
    notFound();
  }

  const backHref = safeManagerFrom(firstValue(query?.from));
  const returnTo = `/admin/manager/${requestId}?from=${encodeURIComponent(backHref)}`;
  const latestVersion = workspace.proposalVersions[0];
  const activeProposal = workspace.activeProposal;
  const activeProposalVersionId = activeProposal?.latestVersionId ?? latestVersion?.id;
  const sceneProjectId = workspace.scene?.id;
  const okMessage = firstValue(query?.ok);
  const errorMessage = firstValue(query?.error);
  const openAction = workspace.process.openAction;
  const commandIds = {
    assign: randomUUID(),
    create: randomUUID(),
    quickContact: randomUUID(),
    quickFollowUp: randomUUID(),
    complete: randomUUID(),
    reschedule: randomUUID(),
    cancel: randomUUID(),
    proposalSent: randomUUID(),
    proposalSentFromBlock: randomUUID(),
    won: randomUUID(),
    lost: randomUUID(),
    outcome: randomUUID(),
    archive: randomUUID(),
  };

  return (
    <main className="mx-auto max-w-[1620px] px-4 py-8 sm:px-6 lg:px-8">
      <Stage>
        <div className="space-y-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <Link href={backHref}>
              <Pill tone="default">Назад в очередь</Pill>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="muted">{workspace.request.reference}</Pill>
              {workspace.request.isDemo ? <Pill tone="accent">DEMO</Pill> : null}
            </div>
          </div>

          <Notice message={okMessage} tone="ok" />
          <Notice message={errorMessage} tone="error" />

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="proof-panel min-w-0 rounded-[34px] p-7">
              <Eyebrow>Request workspace</Eyebrow>
              <h1 className="safe-heading mt-4 max-w-5xl text-[clamp(2.5rem,5vw,5.4rem)] font-semibold leading-[0.94] tracking-[-0.07em] text-[var(--foreground)]">
                {clean(workspace.request.title)}
              </h1>
              <div className="mt-7 grid gap-3 md:grid-cols-5">
                <MetricBlock label="Статус" value={statusLabels[workspace.request.status]} />
                <MetricBlock
                  label="Owner"
                  value={clean(workspace.process.assignedManagerName) ?? "не назначен"}
                />
                <MetricBlock
                  label="Next action"
                  value={clean(workspace.process.nextActionLabel) ?? "нет"}
                />
                <MetricBlock label="Due" value={formatDateTime(workspace.process.nextActionAt)} />
                <MetricBlock label="Outcome" value={workspace.process.outcome ?? "не задан"} />
              </div>
            </div>

            <aside className="proof-panel--dark min-w-0 max-w-[310px] overflow-hidden rounded-[34px] p-6 text-white sm:max-w-none">
              <Eyebrow className="text-white/48">Быстрые действия</Eyebrow>
              <div className="mt-5 grid gap-3">
                <form action={createSalesActionAction}>
                  <HiddenContext
                    requestId={requestId}
                    returnTo={returnTo}
                    commandId={commandIds.quickContact}
                    proposalId={activeProposal?.id}
                    proposalVersionId={activeProposalVersionId}
                    sceneProjectId={sceneProjectId}
                  />
                  <input type="hidden" name="type" value="CALL" />
                  <input type="hidden" name="title" value="Связаться с клиентом" />
                  <input type="hidden" name="nextActionLabel" value="Связаться с клиентом" />
                  <input type="hidden" name="dueAt" value={quickDateTimeLocal(2)} />
                  <ActionSubmitButton variant="primary" className="w-full">
                    Связаться
                  </ActionSubmitButton>
                </form>

                <form action={createSalesActionAction}>
                  <HiddenContext
                    requestId={requestId}
                    returnTo={returnTo}
                    commandId={commandIds.quickFollowUp}
                    proposalId={activeProposal?.id}
                    proposalVersionId={activeProposalVersionId}
                    sceneProjectId={sceneProjectId}
                  />
                  <input type="hidden" name="type" value="FOLLOW_UP" />
                  <input type="hidden" name="title" value="Follow-up завтра" />
                  <input type="hidden" name="nextActionLabel" value="Follow-up с клиентом" />
                  <input type="hidden" name="dueAt" value={quickDateTimeLocal(24)} />
                  <ActionSubmitButton variant="secondary" className="w-full">
                    Follow-up завтра
                  </ActionSubmitButton>
                </form>

                {activeProposal ? (
                  <form action={recordProposalSentAction}>
                    <HiddenContext
                      requestId={requestId}
                      returnTo={returnTo}
                      commandId={commandIds.proposalSent}
                      proposalId={activeProposal.id}
                      proposalVersionId={activeProposalVersionId}
                      sceneProjectId={sceneProjectId}
                    />
                    <input
                      type="hidden"
                      name="nextActionLabel"
                      value="Проверить реакцию клиента"
                    />
                    <input type="hidden" name="dueAt" value={quickDateTimeLocal(48)} />
                    <ActionSubmitButton variant="secondary" className="w-full">
                      КП отправлено
                    </ActionSubmitButton>
                  </form>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <form action={recordOutcomeAction}>
                    <HiddenContext
                      requestId={requestId}
                      returnTo={returnTo}
                      commandId={commandIds.won}
                      proposalId={activeProposal?.id}
                      proposalVersionId={activeProposalVersionId}
                      sceneProjectId={sceneProjectId}
                    />
                    <input type="hidden" name="outcome" value="WON" />
                    <ActionSubmitButton variant="secondary" className="w-full">
                      Выиграли
                    </ActionSubmitButton>
                  </form>
                  <form action={recordOutcomeAction}>
                    <HiddenContext
                      requestId={requestId}
                      returnTo={returnTo}
                      commandId={commandIds.lost}
                      proposalId={activeProposal?.id}
                      proposalVersionId={activeProposalVersionId}
                      sceneProjectId={sceneProjectId}
                    />
                    <input type="hidden" name="outcome" value="LOST" />
                    <ActionSubmitButton variant="secondary" className="w-full">
                      Проиграли
                    </ActionSubmitButton>
                  </form>
                </div>
              </div>
            </aside>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
            <div className="space-y-5">
              <ProofPanel>
                <SectionHeader
                  eyebrow="Commercial state"
                  title="Что требует внимания"
                  description="Сигналы процесса собраны в одном месте: владелец, следующий шаг, КП, отправка и итог."
                />
                <div className="mt-5 flex flex-wrap gap-2">
                  {workspace.attentionFlags.map((flag) => (
                    <Pill key={flag.code} tone={attentionTone(flag.code)}>
                      {attentionLabels[flag.code]}
                    </Pill>
                  ))}
                </div>
              </ProofPanel>

              <DocumentBlock
                title={activeProposal?.title ?? "Коммерческое предложение еще не создано"}
                number={activeProposal?.number ?? "proposal"}
                amount={activeProposal ? formatPriceRub(activeProposal.totalRub) : undefined}
                status={
                  activeProposal ? (
                    <Pill tone={activeProposal.sentAt ? "success" : "warning"}>
                      {activeProposal.sentAt ? "отправлено" : activeProposal.status}
                    </Pill>
                  ) : (
                    <Pill tone="muted">нет активного КП</Pill>
                  )
                }
              >
                {activeProposal ? (
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                    <div className="safe-text text-sm leading-7 text-[var(--foreground-muted)]">
                      Последняя версия: v{activeProposal.latestVersionNumber ?? latestVersion?.versionNumber ?? "—"}.
                      Обновлено: {formatDateTime(activeProposal.updatedAt)}.
                      {activeProposal.sentAt ? ` Отправлено: ${formatDateTime(activeProposal.sentAt)}.` : ""}
                    </div>
                    {activeProposalVersionId ? (
                      <Link
                        href={`/api/proposals/pdf?proposalVersionId=${activeProposalVersionId}`}
                        className="inline-flex items-center justify-center rounded-full bg-[var(--surface-dark)] px-5 py-3 text-sm font-semibold text-white"
                      >
                        Открыть PDF
                      </Link>
                    ) : null}
                    {!workspace.commercialState.proposalSentAt ? (
                      <form
                        action={recordProposalSentAction}
                        className="rounded-[24px] border border-amber-100 bg-amber-50 p-4 lg:col-span-2"
                      >
                        <HiddenContext
                          requestId={requestId}
                          returnTo={returnTo}
                          commandId={commandIds.proposalSentFromBlock}
                          proposalId={activeProposal.id}
                          proposalVersionId={activeProposalVersionId}
                          sceneProjectId={sceneProjectId}
                        />
                        <input
                          type="hidden"
                          name="nextActionLabel"
                          value="Проверить реакцию клиента"
                        />
                        <input type="hidden" name="dueAt" value={quickDateTimeLocal(48)} />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-amber-950">
                              КП готово к отправке
                            </div>
                            <div className="mt-1 text-xs text-amber-800">
                              Отметка отправки запускает существующий process command.
                            </div>
                          </div>
                          <ActionSubmitButton variant="primary">
                            Отметить отправку
                          </ActionSubmitButton>
                        </div>
                      </form>
                    ) : null}
                  </div>
                ) : (
                  <p className="safe-text text-sm leading-7 text-[var(--foreground-muted)]">
                    После создания КП здесь появятся статус, сумма, версия и ссылка на PDF.
                  </p>
                )}
              </DocumentBlock>

              <ProofPanel>
                <SectionHeader
                  eyebrow="Next action"
                  title="Рабочее действие"
                  description="Один канонический OPEN SalesAction управляет следующим шагом менеджера."
                />

                {openAction ? (
                  <div className="mt-5 rounded-[26px] border border-[var(--border)] bg-white/76 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Eyebrow>{openAction.type}</Eyebrow>
                        <div className="safe-text mt-2 text-2xl font-semibold tracking-[-0.05em]">
                          {clean(openAction.title)}
                        </div>
                        <div className="mt-2 text-sm text-[var(--foreground-muted)]">
                          Дедлайн: {formatDateTime(openAction.dueAt)}
                        </div>
                      </div>
                      <Pill tone={workspace.commercialState.canonicalOpenActionOverdue ? "danger" : "success"}>
                        {openAction.status}
                      </Pill>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                      <form action={completeSalesActionAction} className="space-y-3">
                        <input type="hidden" name="actionId" value={openAction.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <input type="hidden" name="commandId" value={commandIds.complete} />
                        <select name="outcome" className={inputClass} defaultValue="CONTACTED">
                          <option value="CONTACTED">Контакт состоялся</option>
                          <option value="FOLLOW_UP_REQUIRED">Нужен follow-up</option>
                          <option value="NO_RESPONSE">Нет ответа</option>
                        </select>
                        <ActionSubmitButton variant="secondary" className="w-full">
                          Завершить
                        </ActionSubmitButton>
                      </form>

                      <form action={rescheduleSalesActionAction} className="space-y-3">
                        <input type="hidden" name="actionId" value={openAction.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <input type="hidden" name="commandId" value={commandIds.reschedule} />
                        <input
                          name="nextActionLabel"
                          required
                          className={inputClass}
                          defaultValue={clean(openAction.nextActionLabel ?? openAction.title) ?? ""}
                        />
                        <input
                          name="dueAt"
                          type="datetime-local"
                          className={inputClass}
                          defaultValue={dateTimeLocalValue(openAction.dueAt)}
                        />
                        <ActionSubmitButton variant="secondary" className="w-full">
                          Перенести
                        </ActionSubmitButton>
                      </form>

                      <form action={cancelSalesActionAction} className="space-y-3">
                        <input type="hidden" name="actionId" value={openAction.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <input type="hidden" name="commandId" value={commandIds.cancel} />
                        <textarea name="notes" placeholder="Причина отмены" className={textareaClass} />
                        <ActionSubmitButton variant="danger" className="w-full">
                          Отменить
                        </ActionSubmitButton>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="safe-text mt-5 rounded-[24px] border border-[var(--border)] bg-white/72 p-4 text-sm text-[var(--foreground-muted)]">
                    Открытого действия нет. Создайте следующий шаг через быстрые или secondary actions.
                  </div>
                )}
              </ProofPanel>
            </div>

            <aside className="space-y-5">
              <ProofPanel>
                <Eyebrow>Клиент и объект</Eyebrow>
                <div className="mt-4 grid gap-3">
                  {[
                    ["Компания", clean(workspace.request.companyName) ?? "не указана"],
                    ["Контакт", clean(workspace.request.contactName) ?? "не указан"],
                    ["Телефон", clean(workspace.request.phone) ?? "не указан"],
                    ["Локация", clean(workspace.request.location) ?? "не указана"],
                    ["Объект", clean(workspace.request.objectType) ?? "не указан"],
                    ["Сегмент", clean(workspace.request.segment) ?? "не указан"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[20px] bg-white/72 px-4 py-3">
                      <Eyebrow>{label}</Eyebrow>
                      <div className="safe-text mt-1 text-sm font-semibold text-[var(--foreground)]">{value}</div>
                    </div>
                  ))}
                </div>
              </ProofPanel>

              {workspace.recommendation ? (
                <ProofPanel>
                  <Eyebrow>Подбор</Eyebrow>
                  <div className="mt-3 text-2xl font-semibold tracking-[-0.05em]">
                    {workspace.recommendation.recommendationCount} позиций
                  </div>
                  <p className="safe-text mt-3 text-sm leading-7 text-[var(--foreground-muted)]">
                    {clean(workspace.recommendation.rationale) ?? "Рекомендация сохранена в контуре заявки."}
                  </p>
                </ProofPanel>
              ) : null}

              {workspace.scene ? (
                <ProofPanel>
                  <Eyebrow>Visual proof</Eyebrow>
                  <div className="safe-text mt-3 text-2xl font-semibold tracking-[-0.05em]">
                    {clean(workspace.scene.title)}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--foreground-muted)]">
                    {workspace.scene.itemsCount} объектов · {formatPriceRub(workspace.scene.estimatedTotalRub)}
                  </p>
                </ProofPanel>
              ) : null}
            </aside>
          </section>

          <details className="proof-panel rounded-[34px] p-6">
            <summary className="cursor-pointer text-2xl font-semibold tracking-[-0.05em]">
              Secondary actions
            </summary>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <form action={assignManagerAction} className="rounded-[26px] bg-white/72 p-4">
                <HiddenContext requestId={requestId} returnTo={returnTo} commandId={commandIds.assign} />
                <FieldLabel>Назначить менеджера</FieldLabel>
                <select
                  name="assignedManagerId"
                  defaultValue={workspace.process.assignedManagerId ?? ""}
                  className={inputClass}
                  required
                >
                  <option value="" disabled>
                    Выберите менеджера
                  </option>
                  {workspace.availableManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {clean(manager.name)}
                    </option>
                  ))}
                </select>
                <input
                  name="nextActionLabel"
                  placeholder="Следующий шаг"
                  className={inputClass}
                  defaultValue={clean(workspace.process.nextActionLabel) ?? "Связаться с клиентом"}
                />
                <input
                  name="dueAt"
                  type="datetime-local"
                  className={inputClass}
                  defaultValue={dateTimeLocalValue(workspace.process.nextActionAt)}
                />
                <div className="mt-4">
                  <ActionSubmitButton variant="primary">Назначить</ActionSubmitButton>
                </div>
              </form>

              <form action={createSalesActionAction} className="rounded-[26px] bg-white/72 p-4">
                <HiddenContext
                  requestId={requestId}
                  returnTo={returnTo}
                  commandId={commandIds.create}
                  proposalId={activeProposal?.id}
                  proposalVersionId={activeProposalVersionId}
                  sceneProjectId={sceneProjectId}
                />
                <FieldLabel>Создать действие</FieldLabel>
                <select name="type" className={inputClass} defaultValue="FOLLOW_UP">
                  {actionTypeOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input name="title" placeholder="Название действия" className={inputClass} />
                <input name="nextActionLabel" placeholder="Следующий шаг" className={inputClass} />
                <input name="dueAt" type="datetime-local" className={inputClass} />
                <textarea name="notes" placeholder="Комментарий" className={textareaClass} />
                <div className="mt-4">
                  <ActionSubmitButton variant="primary">Создать действие</ActionSubmitButton>
                </div>
              </form>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <form action={recordOutcomeAction} className="rounded-[26px] bg-white/72 p-4">
                <HiddenContext
                  requestId={requestId}
                  returnTo={returnTo}
                  commandId={commandIds.outcome}
                  proposalId={activeProposal?.id}
                  proposalVersionId={activeProposalVersionId}
                  sceneProjectId={sceneProjectId}
                />
                <FieldLabel>Итог</FieldLabel>
                <select name="outcome" className={inputClass} defaultValue="WON">
                  <option value="WON">Выиграли</option>
                  <option value="LOST">Проиграли</option>
                  <option value="NOT_A_FIT">Не подходит</option>
                </select>
                <textarea name="outcomeNote" placeholder="Комментарий по итогу" className={textareaClass} />
                <div className="mt-4">
                  <ActionSubmitButton variant="secondary">Зафиксировать итог</ActionSubmitButton>
                </div>
              </form>

              <form action={archiveRequestAction} className="rounded-[26px] bg-red-50 p-4">
                <HiddenContext requestId={requestId} returnTo={returnTo} commandId={commandIds.archive} />
                <FieldLabel>Архив</FieldLabel>
                <textarea name="notes" placeholder="Причина архивации" className={textareaClass} />
                <div className="mt-4">
                  <ActionSubmitButton variant="danger">Архивировать</ActionSubmitButton>
                </div>
              </form>
            </div>
          </details>

          <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <ProofPanel>
              <SectionHeader eyebrow="Timeline" title="История процесса" />
              <div className="mt-5 space-y-3">
                {workspace.timeline.length === 0 ? (
                  <div className="rounded-[22px] bg-white/72 p-4 text-sm text-[var(--foreground-muted)]">
                    Событий пока нет.
                  </div>
                ) : (
                  workspace.timeline.slice(0, 12).map((event) => (
                    <div key={event.id} className="rounded-[22px] bg-white/72 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="safe-text font-semibold">{clean(event.eventType)}</div>
                        <div className="text-xs text-[var(--foreground-muted)]">
                          {formatDateTime(event.createdAt)}
                        </div>
                      </div>
                      <div className="safe-text mt-1 text-xs text-[var(--foreground-muted)]">
                        {event.entityType} / {clean(event.actorUserName) ?? "system"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ProofPanel>

            <ProofPanel>
              <SectionHeader eyebrow="Sales actions" title="Последние действия" />
              <div className="mt-5 space-y-3">
                {workspace.salesActions.map((action) => (
                  <div key={action.id} className="rounded-[22px] bg-white/72 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="safe-text font-semibold">{clean(action.title)}</div>
                        <div className="mt-1 text-xs text-[var(--foreground-muted)]">
                          {action.type} / {action.status}
                        </div>
                      </div>
                      <div className="text-xs text-[var(--foreground-muted)]">
                        {formatDateTime(action.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ProofPanel>
          </section>
        </div>
      </Stage>
    </main>
  );
}
