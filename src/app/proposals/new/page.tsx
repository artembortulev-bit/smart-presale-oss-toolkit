import { requireInternalUser } from "@/application/auth/portal-access";
import { redirect } from "next/navigation";
import {
  buildProposalDraft,
  getProposalDocumentTemplateOptions,
  getProposalScenarioOptions,
} from "@/application/proposals/build-proposal";
import { formatProposalAmountWithSuffix } from "@/application/proposals/proposal-template";
import { proposalRepository } from "@/infrastructure/db/proposal-repository";
import { ButtonLink } from "@/ui/components/common/button-link";
import { ProposalDocumentPreview } from "@/ui/components/proposals/proposal-document-preview";

type ProposalPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

function normalizeTemplateKind(value?: string) {
  return value === "MODERN" ? "MODERN" : "CLASSIC_GRID";
}

function formatCompact(value: number) {
  if (value >= 1_000_000) {
    return `${new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: value >= 10_000_000 ? 0 : 1,
    }).format(value / 1_000_000)} млн ₽`;
  }

  return formatProposalAmountWithSuffix(value);
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

async function saveProposalVersionAction(formData: FormData) {
  "use server";

  const internalUser = await requireInternalUser(["ADMIN", "MANAGER"], "/proposals/new");
  const products = getFormValue(formData, "products");
  const sceneWidthM = Number(getFormValue(formData, "sceneWidthM") ?? 0) || undefined;
  const sceneLengthM = Number(getFormValue(formData, "sceneLengthM") ?? 0) || undefined;
  const sceneProjectId = getFormValue(formData, "sceneProjectId");
  const draft = await buildProposalDraft({
    scenarioId: getFormValue(formData, "scenario"),
    productSlugs: products?.split(",").filter(Boolean) ?? [],
    customerName: getFormValue(formData, "customer"),
    customerAddress: getFormValue(formData, "address"),
    deliveryRub: Number(getFormValue(formData, "delivery") ?? 0),
    installationRub: Number(getFormValue(formData, "installation") ?? 0),
    templateKind: normalizeTemplateKind(getFormValue(formData, "template")),
    sceneProjectId,
    scenePayload: getFormValue(formData, "scenePayload"),
    sceneWidthM,
    sceneLengthM,
  });
  const savedProposal = await proposalRepository.saveDraftVersion({
    draft,
    sceneProjectId,
    createdByUserId: internalUser.id,
    source: "proposal-generator-explicit-save",
  });

  redirect(`/proposals/new?proposalVersionId=${savedProposal.proposalVersionId}`);
}

export default async function ProposalGeneratorPage({
  searchParams,
}: ProposalPageProps) {
  await requireInternalUser(["ADMIN", "MANAGER"], "/proposals/new");
  const params = (await searchParams) ?? {};
  const scenarioId = getParam(params, "scenario");
  const products = getParam(params, "products");
  const customer = getParam(params, "customer");
  const address = getParam(params, "address");
  const delivery = Number(getParam(params, "delivery") ?? 0);
  const installation = Number(getParam(params, "installation") ?? 0);
  const templateKind = normalizeTemplateKind(getParam(params, "template"));
  const sceneProjectId = getParam(params, "sceneProjectId");
  const scenePayload = getParam(params, "scenePayload");
  const sceneWidthM = Number(getParam(params, "sceneWidthM") ?? 0) || undefined;
  const sceneLengthM = Number(getParam(params, "sceneLengthM") ?? 0) || undefined;
  const proposalVersionId = getParam(params, "proposalVersionId");

  const [scenarios, templates, savedVersion] = await Promise.all([
    getProposalScenarioOptions(),
    getProposalDocumentTemplateOptions(),
    proposalVersionId ? proposalRepository.findVersion(proposalVersionId) : null,
  ]);
  const draft =
    savedVersion?.draft ??
    (await buildProposalDraft({
      scenarioId,
      productSlugs: products?.split(",").filter(Boolean) ?? [],
      customerName: customer,
      customerAddress: address,
      deliveryRub: delivery,
      installationRub: installation,
      templateKind,
      sceneProjectId,
      scenePayload,
      sceneWidthM,
      sceneLengthM,
    }));

  const pdfHref = savedVersion
    ? `/api/proposals/pdf?${new URLSearchParams({
        proposalVersionId: savedVersion.proposalVersionId,
      }).toString()}`
    : undefined;

  return (
    <main className="mx-auto max-w-[1580px] px-4 py-8 sm:px-6 lg:px-8">
      <section className="surface-shell rounded-[40px] p-4 sm:p-5 lg:p-6">
        <div className="grid gap-5 2xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="dark-panel rounded-[34px] p-6 text-white 2xl:sticky 2xl:top-24 2xl:h-fit">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[rgba(255,255,255,0.5)]">
                КП
              </p>
              <h1 className="mt-4 text-[2.1rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white">
                Генератор
              </h1>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 2xl:grid-cols-1">
              <div className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.44)]">
                  Позиции
                </div>
                <div className="mt-2 text-[1.9rem] font-semibold text-white">{draft.lines.length}</div>
              </div>
              <div className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.44)]">
                  Итог
                </div>
                <div className="mt-2 text-[1.4rem] font-semibold text-white">
                  {formatCompact(draft.totalRub)}
                </div>
              </div>
              <div className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.44)]">
                  Costing
                </div>
                <div className="mt-2 text-[1.4rem] font-semibold text-white">
                  {draft.commercialMetrics.linesWithCost}/{draft.lines.length}
                </div>
              </div>
            </div>

            {draft.sceneLayout ? (
              <div className="mt-5 rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[rgba(255,255,255,0.46)]">
                  Сцена
                </div>
                <div className="mt-3 text-base font-semibold text-white">{draft.sceneLayout.plotLabel}</div>
                <div className="mt-2 text-sm leading-6 text-[rgba(255,255,255,0.72)]">
                  {draft.sceneLayout.itemsCount} позиций · {draft.sceneLayout.warningCount} предупреждений
                </div>
              </div>
            ) : null}

            <form className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[rgba(255,255,255,0.5)]">
                  Шаблон
                </span>
                <select
                  name="template"
                  defaultValue={draft.templateKind}
                  className="h-12 w-full rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-4 text-white backdrop-blur-xl"
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id} className="text-[#111111]">
                      {template.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[rgba(255,255,255,0.5)]">
                  Сценарий
                </span>
                <select
                  name="scenario"
                  defaultValue={scenarioId}
                  className="h-12 w-full rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-4 text-white backdrop-blur-xl"
                >
                  {scenarios.map((scenario) => (
                    <option key={scenario.id} value={scenario.id} className="text-[#111111]">
                      {scenario.customerName} / {scenario.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[rgba(255,255,255,0.5)]">
                  Клиент
                </span>
                <input
                  name="customer"
                  defaultValue={draft.customerName}
                  className="h-12 w-full rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-4 text-white backdrop-blur-xl"
                />
              </label>

              <label className="block space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[rgba(255,255,255,0.5)]">
                  Адрес
                </span>
                <input
                  name="address"
                  defaultValue={draft.customerAddress}
                  className="h-12 w-full rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-4 text-white backdrop-blur-xl"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[rgba(255,255,255,0.5)]">
                    Доставка
                  </span>
                  <input
                    name="delivery"
                    type="number"
                    defaultValue={delivery}
                    className="h-12 w-full rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-4 text-white backdrop-blur-xl"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[rgba(255,255,255,0.5)]">
                    Монтаж
                  </span>
                  <input
                    name="installation"
                    type="number"
                    defaultValue={installation}
                    className="h-12 w-full rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-4 text-white backdrop-blur-xl"
                  />
                </label>
              </div>

              {products ? <input type="hidden" name="products" value={products} /> : null}
              {sceneProjectId ? <input type="hidden" name="sceneProjectId" value={sceneProjectId} /> : null}
              {scenePayload ? <input type="hidden" name="scenePayload" value={scenePayload} /> : null}
              {sceneWidthM ? <input type="hidden" name="sceneWidthM" value={String(sceneWidthM)} /> : null}
              {sceneLengthM ? <input type="hidden" name="sceneLengthM" value={String(sceneLengthM)} /> : null}

              <button
                type="submit"
                className="h-12 w-full rounded-full bg-[linear-gradient(135deg,var(--accent)_0%,#ff7a29_100%)] text-sm font-semibold text-white shadow-[0_18px_48px_rgba(239,100,29,0.26)] transition-transform hover:-translate-y-0.5"
              >
                Обновить
              </button>
            </form>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {pdfHref ? (
                <ButtonLink href={pdfHref} target="_blank">
                  PDF
                </ButtonLink>
              ) : (
                <form action={saveProposalVersionAction}>
                  {scenarioId ? <input type="hidden" name="scenario" value={scenarioId} /> : null}
                  {products ? <input type="hidden" name="products" value={products} /> : null}
                  <input type="hidden" name="customer" value={draft.customerName} />
                  {draft.customerAddress ? (
                    <input type="hidden" name="address" value={draft.customerAddress} />
                  ) : null}
                  <input type="hidden" name="delivery" value={String(delivery)} />
                  <input type="hidden" name="installation" value={String(installation)} />
                  <input type="hidden" name="template" value={draft.templateKind} />
                  {sceneProjectId ? (
                    <input type="hidden" name="sceneProjectId" value={sceneProjectId} />
                  ) : null}
                  {scenePayload ? (
                    <input type="hidden" name="scenePayload" value={scenePayload} />
                  ) : null}
                  {sceneWidthM ? (
                    <input type="hidden" name="sceneWidthM" value={String(sceneWidthM)} />
                  ) : null}
                  {sceneLengthM ? (
                    <input type="hidden" name="sceneLengthM" value={String(sceneLengthM)} />
                  ) : null}
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent)_0%,#ff7a29_100%)] px-5 py-3 text-sm font-semibold tracking-[0.01em] whitespace-nowrap text-white shadow-[0_18px_46px_rgba(239,100,29,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(239,100,29,0.3)]"
                  >
                    Сохранить версию
                  </button>
                </form>
              )}
              <ButtonLink href="/catalog" variant="secondary">
                Каталог
              </ButtonLink>
            </div>
          </section>

          <section className="glass-panel min-w-0 overflow-hidden rounded-[34px] p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[26px] bg-[rgba(255,255,255,0.58)] px-5 py-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--foreground-soft)]">
                  Документ
                </div>
                <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                  {draft.title}
                </div>
              </div>
              <div className="text-right text-sm leading-6 text-[var(--foreground-muted)]">
                <div>{draft.customerName}</div>
                <div>{draft.issueDate}</div>
              </div>
            </div>

            <div className="rounded-[30px] bg-[linear-gradient(180deg,#ddd5cb_0%,#d2c9be_100%)] p-3 sm:p-4 lg:p-5 shadow-[0_24px_60px_rgba(17,17,17,0.06)]">
              <div className="rounded-[24px] border border-[rgba(255,255,255,0.66)] bg-[rgba(255,255,255,0.64)] p-2 sm:p-3">
                <ProposalDocumentPreview draft={draft} />
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
