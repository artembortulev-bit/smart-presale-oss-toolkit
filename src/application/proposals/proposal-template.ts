export type ProposalTemplateKind = "MODERN" | "CLASSIC_GRID";

export type ProposalTemplateDefinition = {
  kind: ProposalTemplateKind;
  label: string;
  description: string;
  headerBannerUrl: string;
  qrTileUrl: string;
  fixedCollageUrl?: string;
  managerName: string;
  secondaryManagerName?: string;
  managerPhone: string;
  officePhone: string;
  email: string;
  leadTimeLabel: string;
  validityLabel: string;
  qualityNote: string;
  introText: string;
};

export const proposalTemplates: Record<
  ProposalTemplateKind,
  ProposalTemplateDefinition
> = {
  MODERN: {
    kind: "MODERN",
    label: "Современный шаблон",
    description:
      "Фирменная шапка, таблица, итоги, схема площадки и коллаж для уверенной B2B-подачи.",
    headerBannerUrl: "/proposal-template/header-banner.png",
    qrTileUrl: "/proposal-template/contact-qr.png",
    managerName: "Шатохина Варвара Сергеевна",
    managerPhone: "+7 900 000-00-00",
    officePhone: "+7 900 000-00-00",
    email: "sales@example.com",
    leadTimeLabel: "30 календарных дней",
    validityLabel: "Коммерческое предложение действительно в течение 1 месяца",
    qualityNote:
      "Все оборудование отвечает стандартам ГОСТ, имеет паспорта и сертификаты качества.",
    introText:
      "Предлагаем вам детское игровое и спортивное оборудование. Все оборудование отвечает стандартам ГОСТ, имеет паспорта и сертификаты качества.",
  },
  CLASSIC_GRID: {
    kind: "CLASSIC_GRID",
    label: "Строгий XLSX-шаблон",
    description:
      "Строгий табличный формат по образцу Excel-шаблона Smart Presale, включая фиксированный коллаж из шаблона 1.",
    headerBannerUrl: "/proposal-template/classic-grid-banner.png",
    qrTileUrl: "/proposal-template/contact-qr.png",
    fixedCollageUrl: "/proposal-template/classic-grid-collage.png",
    managerName: "Андреенкова Ирина",
    secondaryManagerName: "Симонова Наталья",
    managerPhone: "+7 900 000-00-00",
    officePhone: "+7 900 000-00-00",
    email: "sales@example.com",
    leadTimeLabel: "по согласованию",
    validityLabel: "Срок коммерческого предложения 3 мес.",
    qualityNote:
      "Предлагаем вам детское игровое и спортивное оборудование. Все оборудование отвечает стандартам ГОСТ, имеет паспорта и сертификаты качества.",
    introText:
      "Предлагаем вам детское игровое и спортивное оборудование. Все оборудование отвечает стандартам ГОСТ, имеет паспорта и сертификаты качества.",
  },
};

export function getProposalTemplate(kind?: ProposalTemplateKind) {
  return proposalTemplates[kind ?? "CLASSIC_GRID"];
}

export function getProposalTemplateOptions() {
  return Object.values(proposalTemplates).map((template) => ({
    id: template.kind,
    label: template.label,
    description: template.description,
  }));
}

export function formatProposalAmount(value: number) {
  const sign = value < 0 ? "-" : "";
  const normalized = Math.abs(value);
  const [integerPart = "0", decimalPart = "00"] = normalized
    .toFixed(2)
    .split(".");

  const integerWithSpaces = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    "\u202F",
  );
  return `${sign}${integerWithSpaces}.${decimalPart}`;
}

export function formatProposalAmountWithSuffix(value: number) {
  return `${formatProposalAmount(value)}\u202Fруб.`;
}
