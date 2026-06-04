import { randomUUID } from "node:crypto";

import {
  buildClientRequestEstimate,
  buildClientRequestModelBrief,
} from "@/application/client-intake/estimate-engine";
import { buildClientRequestQualificationSnapshot } from "@/application/client-intake/qualification";
import {
  ClientObjectType,
  ClientRequestPhoto,
  ClientRequestRecord,
  ClientRequestStatus,
  ClientRequestSubmission,
  clientObjectTypeLabels,
  clientRequestStatusLabels,
} from "@/application/client-intake/types";
import { buildProposalDraft } from "@/application/proposals/build-proposal";
import { getCatalogProducts } from "@/infrastructure/data/generated-catalog";
import { clientRequestRepository } from "@/infrastructure/db/client-request-repository";
import { eventRepository } from "@/infrastructure/db/event-repository";

const objectTypeSearchTerms: Record<ClientObjectType, string[]> = {
  PLAYGROUND_COMPLEX: ["игров", "комплекс", "площадк", "горк"],
  SLIDE: ["горк", "скат", "подиум"],
  SWING: ["кач", "подвес"],
  WORKOUT: ["воркаут", "турник", "спорт", "тренаж"],
  PARK_EQUIPMENT: ["скам", "урн", "пергол", "бесед", "маф", "парк"],
  CUSTOM: ["игров", "спорт", "маф", "парк"],
};

function buildReference() {
  const datePart = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
    .format(new Date())
    .replace(/\./g, "");
  const tail = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `REQ-${datePart}-${tail}`;
}

function getLifecycleStatus(): ClientRequestStatus {
  return "QUALIFIED";
}

function matchesAnyTerm(value: string, terms: string[]) {
  const haystack = value.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function toSubmission(request: ClientRequestRecord): ClientRequestSubmission {
  return {
    customerName: request.customerName,
    companyName: request.companyName,
    email: request.email,
    phone: request.phone,
    projectName: request.projectName,
    location: request.location,
    objectType: request.objectType,
    segment: request.segment,
    widthM: request.widthM,
    lengthM: request.lengthM,
    heightM: request.heightM,
    targetBudgetRub: request.targetBudgetRub,
    needsDelivery: request.needsDelivery,
    needsInstallation: request.needsInstallation,
    notes: request.notes,
  };
}

function needsDerivedRefresh(
  request: ClientRequestRecord,
  nextEstimate: ClientRequestRecord["estimate"],
  nextModelBrief: ClientRequestRecord["modelBrief"],
) {
  return (
    JSON.stringify(request.estimate) !== JSON.stringify(nextEstimate) ||
    JSON.stringify(request.modelBrief) !== JSON.stringify(nextModelBrief)
  );
}

async function refreshClientRequestRecord(
  request: ClientRequestRecord,
  catalogProducts: Awaited<ReturnType<typeof getCatalogProducts>>,
) {
  const submission = toSubmission(request);
  const nextEstimate = buildClientRequestEstimate(
    submission,
    request.photos.length,
    catalogProducts,
    request.photos.map((photo) => photo.fileName),
  );
  const nextModelBrief = buildClientRequestModelBrief(
    submission,
    nextEstimate,
    request.photos.length,
  );

  if (!needsDerivedRefresh(request, nextEstimate, nextModelBrief)) {
    return request;
  }

  return {
    ...request,
    updatedAt: new Date().toISOString(),
    estimate: nextEstimate,
    modelBrief: nextModelBrief,
  };
}

function pickBenchmarkProducts(
  request: ClientRequestRecord,
  catalogProducts: Awaited<ReturnType<typeof getCatalogProducts>>,
) {
  const benchmarkArticles = request.estimate.benchmarkProducts.map((product) => product.article);

  if (benchmarkArticles.length === 0) {
    return [];
  }

  const benchmarkIndex = new Map(
    benchmarkArticles.map((article, index) => [article, index] as const),
  );

  return catalogProducts
    .filter((product) => benchmarkIndex.has(product.article))
    .sort(
      (left, right) =>
        (benchmarkIndex.get(left.article) ?? Number.MAX_SAFE_INTEGER) -
        (benchmarkIndex.get(right.article) ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 4);
}

function pickFallbackSimilarProducts(
  request: ClientRequestRecord,
  catalogProducts: Awaited<ReturnType<typeof getCatalogProducts>>,
) {
  const resolvedObjectType = request.estimate.resolvedObjectType ?? request.objectType;
  const searchTerms = objectTypeSearchTerms[resolvedObjectType];

  return catalogProducts
    .filter((product) =>
      matchesAnyTerm(
        [product.name, product.categoryName, product.subcategoryLabel, product.seriesName]
          .filter(Boolean)
          .join(" "),
        searchTerms,
      ),
    )
    .slice(0, 8);
}

export async function createClientRequest(
  requestId: string,
  submission: ClientRequestSubmission,
  photos: ClientRequestPhoto[],
  actorUserId?: string,
) {
  const catalogProducts = await getCatalogProducts();
  const estimate = buildClientRequestEstimate(
    submission,
    photos.length,
    catalogProducts,
    photos.map((photo) => photo.fileName),
  );
  const modelBrief = buildClientRequestModelBrief(submission, estimate, photos.length);
  const qualification = buildClientRequestQualificationSnapshot(submission, estimate);
  const now = new Date().toISOString();

  const request: ClientRequestRecord = {
    id: requestId || randomUUID(),
    reference: buildReference(),
    createdAt: now,
    updatedAt: now,
    status: getLifecycleStatus(),
    customerName: submission.customerName,
    companyName: submission.companyName,
    email: submission.email,
    phone: submission.phone,
    projectName: submission.projectName,
    location: submission.location,
    objectType: submission.objectType,
    segment: submission.segment,
    widthM: submission.widthM,
    lengthM: submission.lengthM,
    heightM: submission.heightM,
    targetBudgetRub: submission.targetBudgetRub,
    needsDelivery: submission.needsDelivery,
    needsInstallation: submission.needsInstallation,
    notes: submission.notes,
    photos,
    estimate,
    modelBrief,
  };

  const saved = await clientRequestRepository.save({
    request,
    qualification,
    createdByUserId: actorUserId,
    assignedManagerId: actorUserId,
  });

  await eventRepository.record({
    dedupeKey: `client-request:${saved.id}:created`,
    actorUserId,
    eventType: "CLIENT_REQUEST_CREATED",
    entityType: "ClientRequest",
    entityId: saved.id,
    payload: {
      reference: saved.reference,
      objectType: saved.objectType,
      segment: saved.segment,
      photoCount: saved.photos.length,
    },
  });
  await eventRepository.record({
    dedupeKey: `client-request:${saved.id}:qualified`,
    actorUserId,
    eventType: "CLIENT_REQUEST_QUALIFIED",
    entityType: "ClientRequest",
    entityId: saved.id,
    payload: {
      confidence: qualification.confidence,
      summary: qualification.summary,
      warnings: qualification.warnings,
    },
  });

  return saved;
}

export async function listClientRequests() {
  const [requests, catalogProducts] = await Promise.all([
    clientRequestRepository.list(),
    getCatalogProducts(),
  ]);

  return Promise.all(
    requests.map((request) => refreshClientRequestRecord(request, catalogProducts)),
  );
}

function buildProposalCustomLine(request: ClientRequestRecord) {
  return {
    article: request.reference,
    name:
      request.projectName ??
      `${clientObjectTypeLabels[request.objectType]} по фото клиента`,
    imageUrl: request.photos[0]?.url,
    sizeLabel:
      request.lengthM && request.widthM && request.heightM
        ? `${request.lengthM} x ${request.widthM} x ${request.heightM} м`
        : request.lengthM && request.widthM
          ? `${request.lengthM} x ${request.widthM} м`
          : "По фото и уточняющим размерам",
    materialLabel: request.estimate.assumedMaterials.join(", "),
    ageLabel: "По проекту",
    quantity: 1,
    unitPriceRub: request.estimate.equipmentRub,
    totalPriceRub: request.estimate.equipmentRub,
  };
}

export async function getClientRequestDetail(requestId: string) {
  const request = await clientRequestRepository.findById(requestId);

  if (!request) {
    return null;
  }

  const catalogProducts = await getCatalogProducts();
  const refreshedRequest = await refreshClientRequestRecord(request, catalogProducts);
  const proposalDraft = await buildProposalDraft({
    customerName: refreshedRequest.companyName ?? refreshedRequest.customerName,
    customerAddress: refreshedRequest.location,
    deliveryRub: refreshedRequest.estimate.deliveryRub,
    installationRub: refreshedRequest.estimate.installationRub,
    title: `Коммерческое предложение по фото-заявке ${refreshedRequest.reference}`,
    showcaseImages: refreshedRequest.photos.map((photo) => photo.url),
    customLines: [buildProposalCustomLine(refreshedRequest)],
  });

  const benchmarkProducts = pickBenchmarkProducts(refreshedRequest, catalogProducts);
  const fallbackSimilarProducts = pickFallbackSimilarProducts(refreshedRequest, catalogProducts);
  const similarProducts = [
    ...benchmarkProducts,
    ...fallbackSimilarProducts.filter(
      (product) => !benchmarkProducts.some((benchmarkProduct) => benchmarkProduct.id === product.id),
    ),
  ].slice(0, 4);

  const pipeline = [
    {
      id: "photos",
      label: clientRequestStatusLabels.UPLOADED,
      state: "done" as const,
      note: `${refreshedRequest.photos.length} фото приняты в работу.`,
    },
    {
      id: "estimate",
      label: clientRequestStatusLabels.PRELIMINARY_ESTIMATE_READY,
      state: "done" as const,
      note:
        refreshedRequest.estimate.benchmarkSourceCount > 0
          ? `Черновая вилка ${new Intl.NumberFormat("ru-RU").format(refreshedRequest.estimate.estimatedMinRub)} – ${new Intl.NumberFormat("ru-RU").format(refreshedRequest.estimate.estimatedMaxRub)} ₽ собрана по фото и ${refreshedRequest.estimate.benchmarkSourceCount} каталожным аналогам.`
          : `Черновая вилка ${new Intl.NumberFormat("ru-RU").format(refreshedRequest.estimate.estimatedMinRub)} – ${new Intl.NumberFormat("ru-RU").format(refreshedRequest.estimate.estimatedMaxRub)} ₽.`,
    },
    {
      id: "materials",
      label: clientRequestStatusLabels.WAITING_MATERIAL_COSTS,
      state: "current" as const,
      note:
        "Benchmark-оценка уже работает, следующий слой — точный калькулятор себестоимости после загрузки матрицы материалов.",
    },
    {
      id: "model",
      label: clientRequestStatusLabels.MODEL_BRIEF_READY,
      state: "done" as const,
      note: "Бриф на интерактивную 3D-модель уже сформирован.",
    },
    {
      id: "proposal",
      label: clientRequestStatusLabels.PROPOSAL_DRAFT_READY,
      state: "done" as const,
      note:
        refreshedRequest.estimate.benchmarkSourceCount > 0
          ? "Черновик КП собран по фото и benchmark-оценке от каталожных аналогов."
          : "Черновик КП собран по фото и предварительной оценке.",
    },
  ];

  return {
    request: refreshedRequest,
    similarProducts,
    proposalDraft,
    pipeline,
  };
}

export async function getClientPortalSummary() {
  const requests = await listClientRequests();

  return {
    total: requests.length,
    waitingForMaterialCosts: requests.filter(
      (request) => request.estimate.waitingForMaterialMatrix,
    ).length,
    averageConfidence:
      requests.length > 0
        ? Math.round(
            (requests.reduce((sum, request) => sum + request.estimate.confidence, 0) /
              requests.length) *
              100,
          )
        : 0,
    latestRequests: requests.slice(0, 5),
  };
}
