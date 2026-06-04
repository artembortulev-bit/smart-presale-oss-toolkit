import { format } from "date-fns";

import { buildSceneDiagramDataUri } from "@/application/scene-projects/scene-diagram";
import { getSceneProject } from "@/application/scene-projects/service";
import {
  getProposalTemplate,
  getProposalTemplateOptions,
  ProposalTemplateKind,
} from "@/application/proposals/proposal-template";
import {
  getCatalogProducts,
  getProposalScenarios,
} from "@/infrastructure/data/generated-catalog";
import { normalizeCode } from "@/import/shared/normalizers";

type ProposalScenePayload = {
  title?: string;
  bounds: {
    widthM: number;
    lengthM: number;
    areaM2: number;
    source: "FORM" | "TEXT" | "DERIVED";
  };
  items: Array<{
    productSlug?: string;
    article: string;
    name: string;
    colorToken: "accent" | "graphite" | "sand" | "sage" | "copper";
    positionXM: number;
    positionYM: number;
    widthM: number;
    lengthM: number;
    safetyWidthM: number;
    safetyLengthM: number;
    rotationDeg: 0 | 90 | 180 | 270;
  }>;
  summary?: {
    warningCount?: number;
    collisionCount?: number;
  };
  notes?: string[];
};

export type ProposalDraft = {
  templateKind: ProposalTemplateKind;
  title: string;
  customerName: string;
  customerAddress?: string;
  issueDate: string;
  introText: string;
  managerName: string;
  secondaryManagerName?: string;
  managerPhone: string;
  officePhone: string;
  email: string;
  leadTimeLabel: string;
  validityLabel: string;
  qualityNote: string;
  headerBannerUrl: string;
  qrTileUrl: string;
  fixedCollageUrl?: string;
  showcaseImages: string[];
  sceneLayout?: {
    sceneProjectId?: string;
    title: string;
    plotLabel: string;
    plotAreaM2: number;
    itemsCount: number;
    warningCount: number;
    collisionCount: number;
    sourceLabel: string;
    notes: string[];
    diagramUrl?: string;
  };
  lines: Array<{
    article: string;
    name: string;
    imageUrl?: string;
    sizeLabel?: string;
    materialLabel?: string;
    ageLabel?: string;
    quantity: number;
    unitPriceRub: number;
    totalPriceRub: number;
    costRub?: number;
    totalCostRub?: number;
    grossMarginRub?: number;
    grossMarginPercent?: number;
    costAvailability?: "DIRECT" | "INFERRED" | "NONE";
  }>;
  deliveryRub: number;
  installationRub: number;
  subtotalRub: number;
  totalRub: number;
  commercialMetrics: {
    subtotalCostRub: number;
    totalCostRub: number;
    grossMarginRub: number;
    grossMarginPercent?: number;
    linesWithCost: number;
  };
};

type ProposalSceneLayout = NonNullable<ProposalDraft["sceneLayout"]>;

export type ProposalDraftInput = {
  scenarioId?: string;
  productSlugs?: string[];
  customerName?: string;
  customerAddress?: string;
  deliveryRub?: number;
  installationRub?: number;
  templateKind?: ProposalTemplateKind;
  title?: string;
  showcaseImages?: string[];
  customLines?: ProposalDraft["lines"];
  sceneProjectId?: string;
  scenePayload?: string;
  sceneWidthM?: number;
  sceneLengthM?: number;
};

function parseScenePayload(value?: string) {
  if (!value) {
    return undefined;
  }

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    return JSON.parse(decoded) as ProposalScenePayload;
  } catch {
    return undefined;
  }
}

function formatPlotLabel(widthM: number, lengthM: number) {
  return `${widthM} × ${lengthM} м`;
}

function buildSceneLayoutFromProject(
  project: Awaited<ReturnType<typeof getSceneProject>>,
): ProposalSceneLayout | undefined {
  if (!project) {
    return undefined;
  }

  return {
    sceneProjectId: project.id,
    title: project.title,
    plotLabel: formatPlotLabel(project.bounds.widthM, project.bounds.lengthM),
    plotAreaM2: project.bounds.areaM2,
    itemsCount: project.summary.itemsCount,
    warningCount: project.summary.warningCount,
    collisionCount: project.summary.collisionCount,
    sourceLabel:
      project.bounds.source === "DERIVED"
        ? "Контур рассчитан автоматически"
        : "Контур задан менеджером",
    notes: project.notes.slice(0, 3),
    diagramUrl: buildSceneDiagramDataUri(project.bounds, project.items),
  };
}

function buildSceneLayoutFromPayload(
  payload?: ProposalScenePayload,
): ProposalSceneLayout | undefined {
  if (!payload) {
    return undefined;
  }

  return {
    title: payload.title ?? "Сцена размещения",
    plotLabel: formatPlotLabel(payload.bounds.widthM, payload.bounds.lengthM),
    plotAreaM2: payload.bounds.areaM2,
    itemsCount: payload.items.length,
    warningCount: payload.summary?.warningCount ?? 0,
    collisionCount: payload.summary?.collisionCount ?? 0,
    sourceLabel:
      payload.bounds.source === "DERIVED"
        ? "Контур рассчитан автоматически"
        : "Контур передан из configurator",
    notes: payload.notes?.slice(0, 3) ?? [],
    diagramUrl: buildSceneDiagramDataUri(payload.bounds, payload.items),
  };
}

function buildSceneLayoutFromDimensions(
  widthM?: number,
  lengthM?: number,
  itemsCount = 0,
): ProposalSceneLayout | undefined {
  if (!widthM || !lengthM) {
    return undefined;
  }

  return {
    title: "Контур площадки",
    plotLabel: formatPlotLabel(widthM, lengthM),
    plotAreaM2: Number((widthM * lengthM).toFixed(2)),
    itemsCount,
    warningCount: 0,
    collisionCount: 0,
    sourceLabel: "Контур передан из сценария подбора",
    notes: ["Сцена добавлена в документ как рабочая схема размещения."],
    diagramUrl: undefined,
  };
}

export async function getProposalScenarioOptions() {
  return getProposalScenarios();
}

export function getProposalDocumentTemplateOptions() {
  return getProposalTemplateOptions();
}

export async function buildProposalDraft(input: ProposalDraftInput) {
  const [scenarios, products, sceneProject] = await Promise.all([
    getProposalScenarios(),
    getCatalogProducts(),
    input.sceneProjectId ? getSceneProject(input.sceneProjectId) : undefined,
  ]);

  const parsedScenePayload = parseScenePayload(input.scenePayload);
  const productByArticle = new Map(
    products.map((product) => [normalizeCode(product.article), product] as const),
  );

  const sceneProductSlugs =
    sceneProject?.items
      .map((item) => item.productSlug)
      .filter((value): value is string => Boolean(value)) ??
    parsedScenePayload?.items
      .map((item) => item.productSlug)
      .filter((value): value is string => Boolean(value)) ??
    [];

  const requestedProductSlugs =
    input.productSlugs && input.productSlugs.length > 0
      ? input.productSlugs
      : sceneProductSlugs;

  const scenario = input.scenarioId
    ? scenarios.find((item) => item.id === input.scenarioId)
    : scenarios[0];
  const template = getProposalTemplate(input.templateKind);

  const selectedProducts = requestedProductSlugs
    .map((slug) => products.find((product) => product.slug === slug))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));

  const lines =
    input.customLines && input.customLines.length > 0
      ? input.customLines
      : selectedProducts.length > 0
        ? selectedProducts.map((product) => ({
            article: product.article,
            name: product.name,
            imageUrl: product.imageUrl,
            sizeLabel: product.sizeLabel,
            materialLabel: product.materials.join(", "),
            ageLabel: product.ageLabel,
            quantity: 1,
            unitPriceRub: product.basePriceRub ?? 0,
            totalPriceRub: product.basePriceRub ?? 0,
            costRub: product.costing?.defaultCostRub,
            totalCostRub: product.costing?.defaultCostRub,
            grossMarginRub: product.costing?.defaultMarginRub,
            grossMarginPercent: product.costing?.defaultMarginPercent,
            costAvailability: product.costing?.availability ?? "NONE",
          }))
        : (scenario?.lines.map((line) => {
            const matchedProduct = line.article
              ? productByArticle.get(normalizeCode(line.article))
              : undefined;

            return {
              article: line.article ?? "DEMO",
              name: line.name,
              imageUrl: matchedProduct?.imageUrl,
              sizeLabel: line.sizeLabel ?? matchedProduct?.sizeLabel,
              materialLabel: line.materialLabel ?? matchedProduct?.materials.join(", "),
              ageLabel: matchedProduct?.ageLabel,
              quantity: line.quantity ?? 1,
              unitPriceRub: line.unitPriceRub ?? line.totalPriceRub ?? 0,
              totalPriceRub:
                line.totalPriceRub ??
                (line.unitPriceRub ?? 0) * (line.quantity ?? 1),
              costRub: matchedProduct?.costing?.defaultCostRub,
              totalCostRub: matchedProduct?.costing?.defaultCostRub
                ? matchedProduct.costing.defaultCostRub * (line.quantity ?? 1)
                : undefined,
              grossMarginRub: matchedProduct?.costing?.defaultMarginRub
                ? matchedProduct.costing.defaultMarginRub * (line.quantity ?? 1)
                : undefined,
              grossMarginPercent: matchedProduct?.costing?.defaultMarginPercent,
              costAvailability: matchedProduct?.costing?.availability ?? "NONE",
            };
          }) ?? []);

  const subtotalRub = lines.reduce((sum, line) => sum + line.totalPriceRub, 0);
  const subtotalCostRub = lines.reduce(
    (sum, line) => sum + (line.totalCostRub ?? 0),
    0,
  );
  const deliveryRub = input.deliveryRub ?? 0;
  const installationRub = input.installationRub ?? 0;
  const sceneLayout =
    buildSceneLayoutFromProject(sceneProject) ??
    buildSceneLayoutFromPayload(parsedScenePayload) ??
    buildSceneLayoutFromDimensions(input.sceneWidthM, input.sceneLengthM, lines.length);

  const rawShowcaseImages = Array.from(
    new Set(
      [
        ...(input.showcaseImages ?? []),
        sceneLayout?.diagramUrl,
        ...lines.map((line) => line.imageUrl),
        ...selectedProducts.map((product) => product.imageUrl),
        ...products
          .filter((product) => product.imageUrl)
          .slice(0, 12)
          .map((product) => product.imageUrl),
      ].filter(Boolean) as string[],
    ),
  ).slice(0, 5);
  const showcaseFallback = rawShowcaseImages[0] ?? template.headerBannerUrl;
  const showcaseImages = Array.from(
    { length: 5 },
    (_, index) => rawShowcaseImages[index] ?? showcaseFallback,
  );

  return {
    templateKind: template.kind,
    title:
      input.title ??
      sceneProject?.title ??
      scenario?.title ??
      "Коммерческое предложение",
    customerName:
      input.customerName ??
      sceneProject?.customerName ??
      scenario?.customerName ??
      "Демо-клиент",
    customerAddress:
      input.customerAddress ?? sceneProject?.customerAddress ?? scenario?.address,
    issueDate: scenario?.issueDate ?? format(new Date(), "dd.MM.yyyy"),
    introText: template.introText,
    managerName: template.managerName,
    secondaryManagerName: template.secondaryManagerName,
    managerPhone: template.managerPhone,
    officePhone: template.officePhone,
    email: template.email,
    leadTimeLabel: template.leadTimeLabel,
    validityLabel: template.validityLabel,
    qualityNote: template.qualityNote,
    headerBannerUrl: template.headerBannerUrl,
    qrTileUrl: template.qrTileUrl,
    fixedCollageUrl: template.fixedCollageUrl,
    showcaseImages,
    sceneLayout,
    lines,
    deliveryRub,
    installationRub,
    subtotalRub,
    totalRub: subtotalRub + deliveryRub + installationRub,
    commercialMetrics: {
      subtotalCostRub,
      totalCostRub: subtotalCostRub + deliveryRub + installationRub,
      grossMarginRub: subtotalRub - subtotalCostRub,
      grossMarginPercent:
        subtotalRub > 0
          ? Number(
              (((subtotalRub - subtotalCostRub) / subtotalRub) * 100).toFixed(2),
            )
          : undefined,
      linesWithCost: lines.filter((line) => typeof line.totalCostRub === "number")
        .length,
    },
  } satisfies ProposalDraft;
}
