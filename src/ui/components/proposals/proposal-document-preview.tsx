/* eslint-disable @next/next/no-img-element */

import { ProposalDraft } from "@/application/proposals/build-proposal";
import {
  formatProposalAmount,
  formatProposalAmountWithSuffix,
} from "@/application/proposals/proposal-template";
import { cn } from "@/shared/utils/cn";

type ProposalDocumentPreviewProps = {
  draft: ProposalDraft;
};

function PreviewImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

function ProposalLineImage({
  imageUrl,
  title,
}: {
  imageUrl?: string;
  title: string;
}) {
  if (!imageUrl) {
    return (
      <div className="flex h-16 items-center justify-center bg-[var(--surface-muted)] text-[10px] text-[var(--foreground-muted)]">
        Без фото
      </div>
    );
  }

  return (
    <div className="relative h-16 overflow-hidden bg-[var(--surface-muted)]">
      <PreviewImage src={imageUrl} alt={title} />
    </div>
  );
}

function SceneLayoutBlock({ draft }: ProposalDocumentPreviewProps) {
  if (!draft.sceneLayout) {
    return null;
  }

  return (
    <section className="mt-6 rounded-[26px] border border-[rgba(20,18,16,0.08)] bg-[rgba(248,244,238,0.65)] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--foreground-muted)]">
            План размещения
          </div>
          <h3 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-[#1f1f1f]">
            {draft.sceneLayout.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            {draft.sceneLayout.sourceLabel}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[300px]">
          <div className="rounded-[18px] border border-[rgba(20,18,16,0.08)] bg-white px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
              Контур
            </div>
            <div className="mt-2 text-sm font-semibold text-[#1f1f1f]">
              {draft.sceneLayout.plotLabel}
            </div>
          </div>
          <div className="rounded-[18px] border border-[rgba(20,18,16,0.08)] bg-white px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
              Позиции
            </div>
            <div className="mt-2 text-sm font-semibold text-[#1f1f1f]">
              {draft.sceneLayout.itemsCount}
            </div>
          </div>
          <div className="rounded-[18px] border border-[rgba(20,18,16,0.08)] bg-white px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
              Предупреждения
            </div>
            <div className="mt-2 text-sm font-semibold text-[#1f1f1f]">
              {draft.sceneLayout.warningCount}
            </div>
          </div>
          <div className="rounded-[18px] border border-[rgba(20,18,16,0.08)] bg-white px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
              Коллизии
            </div>
            <div className="mt-2 text-sm font-semibold text-[#1f1f1f]">
              {draft.sceneLayout.collisionCount}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="overflow-hidden rounded-[22px] border border-[rgba(20,18,16,0.08)] bg-white p-3">
          {draft.sceneLayout.diagramUrl ? (
            <PreviewImage
              src={draft.sceneLayout.diagramUrl}
              alt="Схема площадки"
              className="rounded-[16px] object-contain"
            />
          ) : (
            <div className="flex min-h-[180px] items-center justify-center rounded-[16px] bg-[var(--surface-muted)] text-sm text-[var(--foreground-muted)]">
              Схема будет добавлена после сохранения сцены.
            </div>
          )}
        </div>

        <div className="space-y-2">
          {(draft.sceneLayout.notes.length > 0
            ? draft.sceneLayout.notes
            : ["Сцена добавлена в документ как рабочая схема."]).map((note) => (
            <div
              key={note}
              className="rounded-[18px] border border-[rgba(20,18,16,0.08)] bg-white px-4 py-3 text-sm leading-6 text-[var(--foreground-muted)]"
            >
              {note}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ModernProposalPreview({ draft }: ProposalDocumentPreviewProps) {
  const tiles = [...draft.showcaseImages.slice(0, 5), draft.qrTileUrl];

  return (
    <div className="space-y-8 bg-[#e8e5e1] p-4 sm:p-6">
      <section className="mx-auto w-full max-w-[920px] bg-white shadow-[0_24px_80px_rgba(16,16,16,0.12)]">
        <div className="relative aspect-[100/20] w-full">
          <PreviewImage src={draft.headerBannerUrl} alt="Шапка КП" />
        </div>

        <div className="border-t border-[#7f7f7f] px-6 py-4">
          <div className="space-y-1 text-right text-sm text-[var(--foreground)]">
            <div>Дата: {draft.issueDate}</div>
            <div>Заказчик: {draft.customerName}</div>
            {draft.customerAddress ? <div>Адрес: {draft.customerAddress}</div> : null}
          </div>
        </div>

        <div className="border-y border-[#7f7f7f] py-2 text-center text-lg font-medium text-[#2e2e2e]">
          {draft.title}
        </div>

        <SceneLayoutBlock draft={draft} />

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-[11px] text-[#1f1f1f]">
            <thead>
              <tr className="bg-[#efefef] text-center font-medium">
                <th className="border border-[#8c8c8c] px-2 py-2">№</th>
                <th className="border border-[#8c8c8c] px-2 py-2">Артикул</th>
                <th className="border border-[#8c8c8c] px-2 py-2">Наименование</th>
                <th className="border border-[#8c8c8c] px-2 py-2">Изображение</th>
                <th className="border border-[#8c8c8c] px-2 py-2">Размер</th>
                <th className="border border-[#8c8c8c] px-2 py-2">Материалы</th>
                <th className="border border-[#8c8c8c] px-2 py-2">Возраст</th>
                <th className="border border-[#8c8c8c] px-2 py-2">Кол-во</th>
                <th className="border border-[#8c8c8c] px-2 py-2">Цена с НДС</th>
                <th className="border border-[#8c8c8c] px-2 py-2">Стоимость</th>
              </tr>
            </thead>
            <tbody>
              {draft.lines.map((line, index) => (
                <tr key={`${line.article}-${index}`} className="align-top">
                  <td className="border border-[#8c8c8c] px-2 py-2 text-center">{index + 1}</td>
                  <td className="border border-[#8c8c8c] px-2 py-2 text-center">{line.article}</td>
                  <td className="border border-[#8c8c8c] px-2 py-2 font-medium">{line.name}</td>
                  <td className="border border-[#8c8c8c] px-2 py-2">
                    <ProposalLineImage imageUrl={line.imageUrl} title={line.name} />
                  </td>
                  <td className="border border-[#8c8c8c] px-2 py-2 text-center">
                    {line.sizeLabel ?? "По запросу"}
                  </td>
                  <td className="border border-[#8c8c8c] px-2 py-2">
                    {line.materialLabel ?? "Уточняется"}
                  </td>
                  <td className="border border-[#8c8c8c] px-2 py-2 text-center">
                    {line.ageLabel ?? "По проекту"}
                  </td>
                  <td className="border border-[#8c8c8c] px-2 py-2 text-center">{line.quantity}</td>
                  <td className="border border-[#8c8c8c] px-2 py-2 text-right">
                    {formatProposalAmount(line.unitPriceRub)}
                  </td>
                  <td className="border border-[#8c8c8c] px-2 py-2 text-right">
                    {formatProposalAmount(line.totalPriceRub)}
                  </td>
                </tr>
              ))}
              <tr className="bg-[#b6b6b6] font-medium">
                <td className="border border-[#7f7f7f] px-3 py-2 text-right" colSpan={9}>
                  Общая стоимость оборудования
                </td>
                <td className="border border-[#7f7f7f] px-3 py-2 text-right">
                  {formatProposalAmountWithSuffix(draft.subtotalRub)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[920px] bg-white px-6 py-5 shadow-[0_24px_80px_rgba(16,16,16,0.12)]">
        <div className="ml-auto max-w-[420px] border border-[#7f7f7f]">
          <div className="flex items-center justify-between border-b border-[#7f7f7f] bg-[#b6b6b6] px-4 py-2 text-sm">
            <span>Доставка</span>
            <span>{formatProposalAmountWithSuffix(draft.deliveryRub)}</span>
          </div>
          <div className="flex items-center justify-between border-b border-[#7f7f7f] bg-[#b6b6b6] px-4 py-2 text-sm">
            <span>Монтаж</span>
            <span>{formatProposalAmountWithSuffix(draft.installationRub)}</span>
          </div>
          <div className="flex items-center justify-between bg-[#9c9c9c] px-4 py-2 text-base font-semibold text-[#1f1f1f]">
            <span>ИТОГО</span>
            <span>{formatProposalAmountWithSuffix(draft.totalRub)}</span>
          </div>
        </div>

        <div className="border-b border-[#7f7f7f] py-4 text-center text-sm font-medium">
          Срок изготовления: {draft.leadTimeLabel}
        </div>

        <div className="pt-4">
          <div className="grid grid-cols-3 gap-2 border border-[#9b9b9b] bg-white p-2">
            {tiles.map((imageUrl, index) => (
              <div
                key={`${imageUrl}-${index}`}
                className={cn(
                  "relative min-h-[100px] overflow-hidden border border-[#a8a8a8] bg-[#d9d9d9]",
                  index === 4 && "col-span-2",
                )}
              >
                <PreviewImage src={imageUrl} alt={`Коллаж ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-1 text-sm text-[#262626]">
          <div>Исполнитель: {draft.managerName}</div>
          <div>{draft.managerPhone}</div>
          <div>{draft.officePhone}</div>
          <div>{draft.email}</div>
          <div className="pt-1">{draft.validityLabel}</div>
        </div>
      </section>
    </div>
  );
}

function ClassicProposalPreview({ draft }: ProposalDocumentPreviewProps) {
  return (
    <div className="bg-[#e8e5e1] p-4 sm:p-6">
      <section
        className="mx-auto w-full max-w-[980px] bg-white px-8 py-6 shadow-[0_24px_80px_rgba(16,16,16,0.12)]"
        style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
      >
        <div className="overflow-hidden border border-[#6f6f6f]">
          <PreviewImage
            src={draft.headerBannerUrl}
            alt="Шапка шаблона 1"
            className="object-contain"
          />
        </div>

        <div className="mt-1 border-b border-t border-[#6f6f6f] px-4 py-1 text-center text-[12px] italic leading-5 text-[var(--foreground)]">
          {draft.introText}
        </div>

        <h2 className="mt-2 text-center text-[18px] font-semibold italic text-[var(--foreground)]">
          Коммерческое предложение
        </h2>

        <div className="mt-1 grid gap-2 text-[13px] italic text-[var(--foreground)] md:grid-cols-[1fr_320px]">
          <div />
          <div className="space-y-1">
            <div className="grid grid-cols-[88px_1fr] gap-2">
              <span className="text-right">Заказчик:</span>
              <span>{draft.customerName}</span>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2">
              <span className="text-right">Адрес:</span>
              <span>{draft.customerAddress ?? "уточняется"}</span>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2">
              <span className="text-right">Дата:</span>
              <span>{draft.issueDate}</span>
            </div>
          </div>
        </div>

        <SceneLayoutBlock draft={draft} />

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full table-fixed border-collapse text-[12px] leading-5 text-[#111111]">
            <colgroup>
              <col style={{ width: "5%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "19%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <thead>
              <tr className="text-center font-semibold italic">
                <th className="border border-[#5f5f5f] px-1 py-2">№ п/п</th>
                <th className="border border-[#5f5f5f] px-1 py-2">Артикул</th>
                <th className="border border-[#5f5f5f] px-1 py-2">Наименование</th>
                <th className="border border-[#5f5f5f] px-1 py-2">Материалы</th>
                <th className="border border-[#5f5f5f] px-1 py-2">Изображение</th>
                <th className="border border-[#5f5f5f] px-1 py-2">Размер (м)</th>
                <th className="border border-[#5f5f5f] px-1 py-2">Кол-во</th>
                <th className="border border-[#5f5f5f] px-1 py-2">Цена с НДС</th>
                <th className="border border-[#5f5f5f] px-1 py-2">Стоимость</th>
              </tr>
            </thead>
            <tbody>
              {draft.lines.map((line, index) => (
                <tr key={`${line.article}-${index}`} className="align-top">
                  <td className="border border-[#5f5f5f] px-1 py-2 text-center align-middle">
                    {index + 1}
                  </td>
                  <td className="border border-[#5f5f5f] px-1 py-2 text-center">{line.article}</td>
                  <td className="border border-[#5f5f5f] px-2 py-2 font-semibold leading-5">{line.name}</td>
                  <td className="border border-[#5f5f5f] px-2 py-2 leading-5">
                    {line.materialLabel ?? "Уточняется"}
                  </td>
                  <td className="border border-[#5f5f5f] px-1 py-2">
                    <ProposalLineImage imageUrl={line.imageUrl} title={line.name} />
                  </td>
                  <td className="border border-[#5f5f5f] px-1 py-2 text-center">
                    {line.sizeLabel ?? "По запросу"}
                  </td>
                  <td className="border border-[#5f5f5f] px-1 py-2 text-center">{line.quantity}</td>
                  <td className="whitespace-nowrap border border-[#5f5f5f] px-1 py-2 text-right text-[10px] tabular-nums">
                    {formatProposalAmount(line.unitPriceRub)}
                  </td>
                  <td className="whitespace-nowrap border border-[#5f5f5f] px-1 py-2 text-right text-[10px] tabular-nums">
                    {formatProposalAmount(line.totalPriceRub)}
                  </td>
                </tr>
              ))}
              <tr className="bg-[#d9d9d9] italic">
                <td className="border border-[#5f5f5f] px-3 py-2 text-right font-semibold" colSpan={7}>
                  Стоимость оборудования без учета доставки, сборки и монтажа
                </td>
                <td
                  className="whitespace-nowrap border border-[#5f5f5f] px-2 py-2 text-right text-[10px] font-semibold tabular-nums"
                  colSpan={2}
                >
                  {formatProposalAmount(draft.subtotalRub)}
                </td>
              </tr>
              <tr className="bg-[#efefef] italic">
                <td className="border border-[#5f5f5f] px-3 py-2 text-right font-semibold" colSpan={7}>
                  Доставка, сборка и монтаж оборудования
                </td>
                <td
                  className="whitespace-nowrap border border-[#5f5f5f] px-2 py-2 text-right text-[10px] font-semibold tabular-nums"
                  colSpan={2}
                >
                  {formatProposalAmount(draft.deliveryRub + draft.installationRub)}
                </td>
              </tr>
              <tr className="bg-[#d9d9d9] italic">
                <td className="border border-[#5f5f5f] px-3 py-2 text-right text-[15px] font-semibold" colSpan={7}>
                  Итого стоимость оборудования
                </td>
                <td
                  className="whitespace-nowrap border border-[#5f5f5f] px-2 py-2 text-right text-[11px] font-semibold tabular-nums"
                  colSpan={2}
                >
                  {formatProposalAmount(draft.totalRub)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {draft.fixedCollageUrl ? (
          <div className="mt-4 border border-[#8c8c8c] p-2">
            <div className="overflow-hidden border border-[#d0d0d0]">
              <PreviewImage
                src={draft.fixedCollageUrl}
                alt="Коллаж из шаблона 1"
                className="object-contain"
              />
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 text-[13px] text-[var(--foreground)] md:grid-cols-[1fr_1fr]">
          <div>
            <div className="italic">Исполнитель:</div>
            <div className="mt-2">{draft.managerName}</div>
            {draft.secondaryManagerName ? <div>{draft.secondaryManagerName}</div> : null}
            <div className="mt-3">ООО «Smart Presale»</div>
            <div>{draft.email}</div>
            <div>Тел: {draft.officePhone}</div>
          </div>
          <div className="md:text-right italic">
            <div>{draft.validityLabel}</div>
            <div className="mt-2">Срок изготовления: {draft.leadTimeLabel}</div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function ProposalDocumentPreview({ draft }: ProposalDocumentPreviewProps) {
  if (draft.templateKind === "CLASSIC_GRID") {
    return <ClassicProposalPreview draft={draft} />;
  }

  return <ModernProposalPreview draft={draft} />;
}
