import { promises as fs } from "node:fs";
import path from "node:path";

import { Prisma } from "@prisma/client";

import {
  demoReadinessBaseTime,
  demoReadinessReferences,
  DEMO_READINESS_SOURCE,
} from "@/application/demo-readiness/constants";
import { buildProposalDraft, ProposalDraft } from "@/application/proposals/build-proposal";
import { GeneratedCatalogData, GeneratedProduct } from "@/import/catalog/types";
import { prisma } from "@/infrastructure/db/prisma";
import { checkOperationalDatabaseReadiness } from "@/infrastructure/db/readiness";
import { userRepository } from "@/infrastructure/db/user-repository";
import { managerWorkspaceReadRepository } from "@/infrastructure/db/manager-workspace-read-repository";

const demoMetadata = { demoSource: DEMO_READINESS_SOURCE };
const catalogDataPath = path.join(process.cwd(), "generated", "catalog-data.json");
const terminalStatuses = ["WON", "LOST", "ARCHIVED"] as const;

type DemoProductLine = {
  article: string;
  slug?: string;
  name: string;
  imageUrl?: string;
  sizeLabel?: string;
  materialLabel?: string;
  ageLabel?: string;
  quantity: number;
  unitPriceRub: number;
  totalPriceRub: number;
};

function dateAt(hours: number) {
  return new Date(new Date(demoReadinessBaseTime).getTime() + hours * 60 * 60 * 1000);
}

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function hasDemoMarker(metadata: Prisma.JsonValue | null | undefined) {
  return (
    Boolean(metadata) &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    (metadata as Record<string, unknown>).demoSource === DEMO_READINESS_SOURCE
  );
}

function assertCondition(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readGeneratedCatalogProducts() {
  let raw: string;

  try {
    raw = await fs.readFile(catalogDataPath, "utf8");
  } catch {
    throw new Error(
      "Demo catalog source is missing. Generate/import catalog data before running demo:seed.",
    );
  }

  const data = JSON.parse(raw) as GeneratedCatalogData;
  const products = data.products
    .filter((product) => product.basePriceRub && product.basePriceRub > 0)
    .slice(0, 12);

  if (products.length < 3) {
    throw new Error(
      "Demo catalog source does not contain enough priced products for Demo Readiness.",
    );
  }

  return products;
}

async function loadDemoLines(): Promise<DemoProductLine[]> {
  const dbProducts = await prisma.product.findMany({
    where: {
      active: true,
      basePriceRub: {
        not: null,
      },
    },
    select: {
      article: true,
      slug: true,
      name: true,
      imageUrl: true,
      sizeLabel: true,
      materials: true,
      ageLabel: true,
      basePriceRub: true,
    },
    orderBy: [{ basePriceRub: "desc" }, { article: "asc" }],
    take: 6,
  });

  if (dbProducts.length >= 3) {
    return dbProducts.map((product, index) => {
      const quantity = index === 0 ? 1 : 2;
      const unitPriceRub = product.basePriceRub?.toNumber() ?? 0;

      return {
        article: product.article,
        slug: product.slug,
        name: product.name,
        imageUrl: product.imageUrl ?? undefined,
        sizeLabel: product.sizeLabel ?? undefined,
        materialLabel: product.materials.join(", "),
        ageLabel: product.ageLabel ?? undefined,
        quantity,
        unitPriceRub,
        totalPriceRub: unitPriceRub * quantity,
      };
    });
  }

  const generatedProducts = await readGeneratedCatalogProducts();

  return generatedProducts.slice(0, 6).map((product: GeneratedProduct, index) => {
    const quantity = index === 0 ? 1 : 2;
    const unitPriceRub = product.basePriceRub ?? 0;

    return {
      article: product.article,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      sizeLabel: product.sizeLabel,
      materialLabel: product.materials.join(", "),
      ageLabel: product.ageLabel,
      quantity,
      unitPriceRub,
      totalPriceRub: unitPriceRub * quantity,
    };
  });
}

async function resetDemoReadiness() {
  const demoRequests = await prisma.clientRequest.findMany({
    where: { source: DEMO_READINESS_SOURCE },
    select: {
      id: true,
      customerCompanyId: true,
      customerContactId: true,
    },
  });
  const requestIds = demoRequests.map((request) => request.id);
  const customerCompanyIds = demoRequests
    .map((request) => request.customerCompanyId)
    .filter((value): value is string => Boolean(value));
  const customerContactIds = demoRequests
    .map((request) => request.customerContactId)
    .filter((value): value is string => Boolean(value));

  if (requestIds.length === 0) {
    return { deletedRequests: 0 };
  }

  const selectionIds = (
    await prisma.selectionSession.findMany({
      where: { clientRequestId: { in: requestIds } },
      select: { id: true },
    })
  ).map((session) => session.id);
  const sceneIds = (
    await prisma.sceneProject.findMany({
      where: { clientRequestId: { in: requestIds } },
      select: { id: true },
    })
  ).map((scene) => scene.id);
  const proposalIds = (
    await prisma.proposal.findMany({
      where: {
        OR: [
          { clientRequestId: { in: requestIds } },
          { selectionSessionId: { in: selectionIds } },
          { sceneProjectId: { in: sceneIds } },
        ],
      },
      select: { id: true },
    })
  ).map((proposal) => proposal.id);
  const versionIds = (
    await prisma.proposalVersion.findMany({
      where: { proposalId: { in: proposalIds } },
      select: { id: true },
    })
  ).map((version) => version.id);
  const actionIds = (
    await prisma.salesAction.findMany({
      where: {
        OR: [
          { clientRequestId: { in: requestIds } },
          { proposalId: { in: proposalIds } },
          { proposalVersionId: { in: versionIds } },
          { sceneProjectId: { in: sceneIds } },
        ],
      },
      select: { id: true },
    })
  ).map((action) => action.id);
  const entityIds = [
    ...requestIds,
    ...selectionIds,
    ...sceneIds,
    ...proposalIds,
    ...versionIds,
    ...actionIds,
  ];

  await prisma.$transaction([
    prisma.eventLog.deleteMany({ where: { entityId: { in: entityIds } } }),
    prisma.salesAction.deleteMany({ where: { id: { in: actionIds } } }),
    prisma.proposalVersionItem.deleteMany({
      where: { proposalVersionId: { in: versionIds } },
    }),
    prisma.proposalVersion.deleteMany({ where: { id: { in: versionIds } } }),
    prisma.proposalItem.deleteMany({ where: { proposalId: { in: proposalIds } } }),
    prisma.proposal.deleteMany({ where: { id: { in: proposalIds } } }),
    prisma.sceneProject.deleteMany({ where: { id: { in: sceneIds } } }),
    prisma.selectionRecommendation.deleteMany({
      where: { sessionId: { in: selectionIds } },
    }),
    prisma.selectionSession.deleteMany({ where: { id: { in: selectionIds } } }),
    prisma.clientRequestAsset.deleteMany({
      where: { clientRequestId: { in: requestIds } },
    }),
    prisma.clientRequest.deleteMany({ where: { id: { in: requestIds } } }),
  ]);

  const contactCandidates = await prisma.customerContact.findMany({
    where: { id: { in: customerContactIds } },
    select: { id: true, metadata: true },
  });
  const safeContactIds: string[] = [];

  for (const contact of contactCandidates) {
    const linkedRequests = await prisma.clientRequest.count({
      where: { customerContactId: contact.id },
    });

    if (linkedRequests === 0 && hasDemoMarker(contact.metadata)) {
      safeContactIds.push(contact.id);
    }
  }

  if (safeContactIds.length > 0) {
    await prisma.customerContact.deleteMany({ where: { id: { in: safeContactIds } } });
  }

  const companyCandidates = await prisma.customerCompany.findMany({
    where: { id: { in: customerCompanyIds } },
    select: { id: true, metadata: true },
  });
  const safeCompanyIds: string[] = [];

  for (const company of companyCandidates) {
    const [linkedRequests, linkedContacts] = await Promise.all([
      prisma.clientRequest.count({ where: { customerCompanyId: company.id } }),
      prisma.customerContact.count({ where: { companyId: company.id } }),
    ]);

    if (linkedRequests === 0 && linkedContacts === 0 && hasDemoMarker(company.metadata)) {
      safeCompanyIds.push(company.id);
    }
  }

  if (safeCompanyIds.length > 0) {
    await prisma.customerCompany.deleteMany({ where: { id: { in: safeCompanyIds } } });
  }

  return { deletedRequests: requestIds.length };
}

async function createDemoCustomer(index: number, companyName: string, contactName: string) {
  const company = await prisma.customerCompany.create({
    data: {
      name: companyName,
      legalName: companyName,
      email: `demo-company-${index}@example.local`,
      phone: "+7 900 000-00-00",
      metadata: demoMetadata,
    },
  });
  const contact = await prisma.customerContact.create({
    data: {
      companyId: company.id,
      fullName: contactName,
      role: "Демо-контакт",
      email: `demo-contact-${index}@example.local`,
      phone: `+7 (900) 000-00-0${index}`,
      metadata: demoMetadata,
    },
  });

  return { company, contact };
}

async function createSelectionSession(input: {
  requestId: string;
  managerId: string;
  lines: DemoProductLine[];
  createdAt: Date;
}) {
  const estimatedTotalRub = input.lines.reduce(
    (sum, line) => sum + line.totalPriceRub,
    0,
  );

  return prisma.selectionSession.create({
    data: {
      dedupeKey: `demo-readiness:${input.requestId}:selection`,
      clientRequestId: input.requestId,
      status: "FINALIZED",
      inputData: toJsonValue({
        source: DEMO_READINESS_SOURCE,
        objectType: "playground",
        segment: "OPTIMUM",
      }),
      constraintsJson: toJsonValue({
        widthM: 12,
        lengthM: 10,
        targetBudgetRub: 3_500_000,
      }),
      recognizedPreferences: toJsonValue({
        usageContext: "municipal",
        ageMin: 3,
        needsDelivery: true,
        needsInstallation: true,
      }),
      filtersApplied: ["demo-source", "age", "budget", "site-size"],
      filteredOutCount: 12,
      rationale:
        "Демо-подбор показывает связку квалификации, состава, сцены и КП без новой бизнес-логики.",
      estimatedTotalRub: decimal(estimatedTotalRub),
      createdByUserId: input.managerId,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      recommendations: {
        create: input.lines.map((line, index) => ({
          rank: index + 1,
          score: decimal(0.92 - index * 0.04),
          productArticle: line.article,
          productSlug: line.slug,
          productName: line.name,
          productImageUrl: line.imageUrl,
          productSnapshot: toJsonValue({
            sizeLabel: line.sizeLabel,
            materialLabel: line.materialLabel,
            ageLabel: line.ageLabel,
            source: "generated-catalog",
          }),
          quantity: line.quantity,
          reasoning: "Подходит для демонстрационного сценария пресейла.",
          highlights: ["подходит по бюджету", "есть в КП", "используется в сцене"],
          scoreBreakdown: toJsonValue({ demo: 1, fit: 0.9 }),
          estimatedLineRub: decimal(line.totalPriceRub),
          createdAt: input.createdAt,
          updatedAt: input.createdAt,
        })),
      },
    },
  });
}

async function createSceneProject(input: {
  requestId: string;
  selectionSessionId: string;
  managerId: string;
  lines: DemoProductLine[];
  title: string;
  createdAt: Date;
}) {
  const items = input.lines.slice(0, 3).map((line, index) => ({
    id: `demo-scene-item-${index + 1}`,
    productSlug: line.slug,
    article: line.article,
    name: line.name,
    colorToken: index === 0 ? "accent" : index === 1 ? "sage" : "graphite",
    placementRole: index === 0 ? "anchor" : "support",
    productKind: "play-equipment",
    positionXM: 2 + index * 3,
    positionYM: 2 + index * 2,
    rotationDeg: index === 1 ? 90 : 0,
    widthM: 2.2 + index,
    lengthM: 2.4 + index,
    safetyWidthM: 5.2 + index,
    safetyLengthM: 5.4 + index,
    basePriceRub: line.unitPriceRub,
  }));

  return prisma.sceneProject.create({
    data: {
      status: "ATTACHED_TO_PROPOSAL",
      clientRequestId: input.requestId,
      selectionSessionId: input.selectionSessionId,
      title: input.title,
      customerName: "Demo customer",
      customerAddress: "Демо-объект, Москва",
      solutionName: "Демо-композиция Smart Presale",
      objectTypeLabel: "Игровая площадка",
      segmentLabel: "Оптимум",
      boundsJson: toJsonValue({
        widthM: 12,
        lengthM: 10,
        areaM2: 120,
        source: "FORM",
      }),
      itemsJson: toJsonValue(items),
      summaryJson: toJsonValue({
        estimatedTotalRub: input.lines.reduce((sum, line) => sum + line.totalPriceRub, 0),
        collisionCount: 0,
        outOfBoundsCount: 0,
        warningCount: 1,
        itemsCount: items.length,
      }),
      notes: [
        "Демо-сцена показывает размещение состава и связь с КП.",
        "Это не 3D-прокси и не замена реальным моделям.",
      ],
      createdByUserId: input.managerId,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    },
  });
}

function proposalSnapshots(draft: ProposalDraft) {
  return {
    clientSnapshot: toJsonValue({
      customerName: draft.customerName,
      customerAddress: draft.customerAddress,
      issueDate: draft.issueDate,
      validityLabel: draft.validityLabel,
      leadTimeLabel: draft.leadTimeLabel,
    }),
    itemsSnapshot: toJsonValue(draft.lines),
    totalsSnapshot: toJsonValue({
      subtotalRub: draft.subtotalRub,
      deliveryRub: draft.deliveryRub,
      installationRub: draft.installationRub,
      totalRub: draft.totalRub,
      commercialMetrics: draft.commercialMetrics,
    }),
    sceneSnapshot: draft.sceneLayout ? toJsonValue(draft.sceneLayout) : undefined,
    draftSnapshot: toJsonValue(draft),
  };
}

async function createProposal(input: {
  requestId: string;
  selectionSessionId: string;
  sceneProjectId: string;
  managerId: string;
  number: string;
  status: "READY" | "SENT";
  title: string;
  customerName: string;
  customerAddress: string;
  lines: DemoProductLine[];
  issueDate: Date;
  sentAt?: Date;
  createdAt: Date;
}) {
  const draft = await buildProposalDraft({
    title: input.title,
    customerName: input.customerName,
    customerAddress: input.customerAddress,
    deliveryRub: 180_000,
    installationRub: 240_000,
    sceneProjectId: input.sceneProjectId,
    customLines: input.lines,
  });
  draft.issueDate = "18.04.2026";

  const snapshots = proposalSnapshots(draft);
  const proposal = await prisma.proposal.create({
    data: {
      dedupeKey: `demo-readiness:proposal:${input.number}`,
      number: input.number,
      status: input.status,
      clientRequestId: input.requestId,
      selectionSessionId: input.selectionSessionId,
      sceneProjectId: input.sceneProjectId,
      title: input.title,
      issueDate: input.issueDate,
      currency: "RUB",
      subtotalRub: decimal(draft.subtotalRub),
      deliveryRub: decimal(draft.deliveryRub),
      installationRub: decimal(draft.installationRub),
      totalRub: decimal(draft.totalRub),
      notes: draft.qualityNote,
      sentAt: input.sentAt,
      metadata: demoMetadata,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      versions: {
        create: {
          versionNumber: 1,
          status: input.status === "SENT" ? "SENT" : "LOCKED",
          dedupeKey: `demo-readiness:proposal-version:${input.number}:v1`,
          title: input.title,
          ...snapshots,
          subtotalRub: decimal(draft.subtotalRub),
          deliveryRub: decimal(draft.deliveryRub),
          installationRub: decimal(draft.installationRub),
          totalRub: decimal(draft.totalRub),
          createdByUserId: input.managerId,
          createdAt: input.createdAt,
          updatedAt: input.createdAt,
          items: {
            create: draft.lines.map((line) => ({
              article: line.article,
              name: line.name,
              imageUrl: line.imageUrl,
              sizeLabel: line.sizeLabel,
              materialLabel: line.materialLabel,
              ageLabel: line.ageLabel,
              quantity: line.quantity,
              unitPriceRub: decimal(line.unitPriceRub),
              totalPriceRub: decimal(line.totalPriceRub),
              metadata: toJsonValue({ source: DEMO_READINESS_SOURCE }),
              createdAt: input.createdAt,
            })),
          },
        },
      },
    },
    include: {
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
      },
    },
  });

  return {
    proposal,
    version: proposal.versions[0],
    draft,
  };
}

async function recordEvent(input: {
  dedupeKey: string;
  actorUserId?: string;
  eventType:
    | "CLIENT_REQUEST_CREATED"
    | "SELECTION_RECOMMENDATION_CREATED"
    | "SCENE_PROJECT_CREATED"
    | "PROPOSAL_CREATED"
    | "PROPOSAL_VERSION_CREATED"
    | "SALES_ACTION_CREATED"
    | "PROPOSAL_PDF_EXPORTED"
    | "STATUS_CHANGED";
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
}) {
  await prisma.eventLog.create({
    data: {
      dedupeKey: input.dedupeKey,
      actorUserId: input.actorUserId,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: toJsonValue({
        source: DEMO_READINESS_SOURCE,
        ...input.payload,
      }),
      createdAt: input.createdAt,
    },
  });
}

async function seedDemoReadiness() {
  await resetDemoReadiness();

  const manager = await userRepository.ensureDefaultInternalUser();
  const lines = await loadDemoLines();

  const scenarioOneCustomer = await createDemoCustomer(
    1,
    "Демо ЖК Северный квартал",
    "Анна Кузнецова",
  );
  const scenarioOne = await prisma.clientRequest.create({
    data: {
      reference: demoReadinessReferences[0],
      source: DEMO_READINESS_SOURCE,
      status: "NEEDS_REVIEW",
      customerName: scenarioOneCustomer.contact.fullName,
      companyName: scenarioOneCustomer.company.name,
      email: scenarioOneCustomer.contact.email,
      phone: scenarioOneCustomer.contact.phone,
      projectName: "Новая заявка требует внимания",
      location: "Москва, двор ЖК",
      objectType: "playground",
      segment: "OPTIMUM",
      widthM: decimal(8),
      lengthM: decimal(6),
      targetBudgetRub: decimal(2_800_000),
      needsDelivery: true,
      needsInstallation: true,
      notes: "Демо: заявка без владельца и без следующего действия.",
      estimateJson: toJsonValue({ source: DEMO_READINESS_SOURCE }),
      modelBriefJson: toJsonValue({ source: DEMO_READINESS_SOURCE }),
      qualificationJson: toJsonValue({
        source: DEMO_READINESS_SOURCE,
        attention: ["NO_OWNER", "NO_NEXT_ACTION"],
      }),
      qualificationSummary:
        "Заявка требует первичной квалификации: нет ответственного и следующего шага.",
      qualificationConfidence: decimal(0.82),
      qualificationWarnings: ["Нет назначенного менеджера", "Нет следующего действия"],
      customerCompanyId: scenarioOneCustomer.company.id,
      customerContactId: scenarioOneCustomer.contact.id,
      createdAt: dateAt(0),
      updatedAt: dateAt(0),
      submittedAt: dateAt(0),
    },
  });
  await recordEvent({
    dedupeKey: "demo-readiness:request:DEMO-DR-001:created",
    eventType: "CLIENT_REQUEST_CREATED",
    entityType: "ClientRequest",
    entityId: scenarioOne.id,
    payload: { reference: scenarioOne.reference },
    createdAt: dateAt(0),
  });

  const scenarioTwoCustomer = await createDemoCustomer(
    2,
    "Демо Администрация парка",
    "Игорь Смирнов",
  );
  const scenarioTwo = await prisma.clientRequest.create({
    data: {
      reference: demoReadinessReferences[1],
      source: DEMO_READINESS_SOURCE,
      status: "IN_SALES",
      customerName: scenarioTwoCustomer.contact.fullName,
      companyName: scenarioTwoCustomer.company.name,
      email: scenarioTwoCustomer.contact.email,
      phone: scenarioTwoCustomer.contact.phone,
      projectName: "КП готово к отправке",
      location: "Брянск, городской парк",
      objectType: "playground",
      segment: "OPTIMUM",
      widthM: decimal(12),
      lengthM: decimal(10),
      targetBudgetRub: decimal(3_500_000),
      needsDelivery: true,
      needsInstallation: true,
      notes: "Демо: есть подбор, сцена и готовое КП.",
      estimateJson: toJsonValue({ source: DEMO_READINESS_SOURCE }),
      modelBriefJson: toJsonValue({ source: DEMO_READINESS_SOURCE }),
      qualificationJson: toJsonValue({ source: DEMO_READINESS_SOURCE }),
      qualificationSummary:
        "Клиенту подходит готовая игровая композиция; требуется отправить КП.",
      qualificationConfidence: decimal(0.93),
      customerCompanyId: scenarioTwoCustomer.company.id,
      customerContactId: scenarioTwoCustomer.contact.id,
      assignedManagerId: manager.id,
      nextActionLabel: "Отправить КП клиенту",
      nextActionDueAt: dateAt(72),
      lastSalesActionAt: dateAt(8),
      createdAt: dateAt(1),
      updatedAt: dateAt(8),
      submittedAt: dateAt(1),
      qualifiedAt: dateAt(2),
    },
  });
  const selectionTwo = await createSelectionSession({
    requestId: scenarioTwo.id,
    managerId: manager.id,
    lines: lines.slice(0, 3),
    createdAt: dateAt(3),
  });
  const sceneTwo = await createSceneProject({
    requestId: scenarioTwo.id,
    selectionSessionId: selectionTwo.id,
    managerId: manager.id,
    lines: lines.slice(0, 3),
    title: "Демо-сцена: парк",
    createdAt: dateAt(4),
  });
  const proposalTwo = await createProposal({
    requestId: scenarioTwo.id,
    selectionSessionId: selectionTwo.id,
    sceneProjectId: sceneTwo.id,
    managerId: manager.id,
    number: "DEMO-KP-002",
    status: "READY",
    title: "КП готово к отправке",
    customerName: scenarioTwoCustomer.company.name,
    customerAddress: "Брянск, городской парк",
    lines: lines.slice(0, 3),
    issueDate: dateAt(5),
    createdAt: dateAt(5),
  });
  const actionTwo = await prisma.salesAction.create({
    data: {
      dedupeKey: "demo-readiness:DEMO-DR-002:open-action",
      clientRequestId: scenarioTwo.id,
      proposalId: proposalTwo.proposal.id,
      proposalVersionId: proposalTwo.version?.id,
      sceneProjectId: sceneTwo.id,
      assignedManagerId: manager.id,
      actorUserId: manager.id,
      type: "FOLLOW_UP",
      status: "OPEN",
      title: "Отправить КП клиенту",
      nextActionLabel: "Отправить КП клиенту",
      dueAt: dateAt(72),
      metadata: demoMetadata,
      createdAt: dateAt(8),
      updatedAt: dateAt(8),
    },
  });

  for (const [eventType, entityType, entityId, createdAt] of [
    ["CLIENT_REQUEST_CREATED", "ClientRequest", scenarioTwo.id, dateAt(1)],
    ["SELECTION_RECOMMENDATION_CREATED", "SelectionSession", selectionTwo.id, dateAt(3)],
    ["SCENE_PROJECT_CREATED", "SceneProject", sceneTwo.id, dateAt(4)],
    ["PROPOSAL_CREATED", "Proposal", proposalTwo.proposal.id, dateAt(5)],
    ["PROPOSAL_VERSION_CREATED", "ProposalVersion", proposalTwo.version?.id, dateAt(5)],
    ["SALES_ACTION_CREATED", "SalesAction", actionTwo.id, dateAt(8)],
  ] as const) {
    if (entityId) {
      await recordEvent({
        dedupeKey: `demo-readiness:${entityType}:${entityId}:${eventType}`,
        actorUserId: manager.id,
        eventType,
        entityType,
        entityId,
        createdAt,
      });
    }
  }

  const scenarioThreeCustomer = await createDemoCustomer(
    3,
    "Демо Частный заказчик",
    "Мария Орлова",
  );
  const scenarioThree = await prisma.clientRequest.create({
    data: {
      reference: demoReadinessReferences[2],
      source: DEMO_READINESS_SOURCE,
      status: "PROPOSAL_SENT",
      customerName: scenarioThreeCustomer.contact.fullName,
      companyName: scenarioThreeCustomer.company.name,
      email: scenarioThreeCustomer.contact.email,
      phone: scenarioThreeCustomer.contact.phone,
      projectName: "КП отправлено, нужен итог",
      location: "Московская область, частный участок",
      objectType: "playground",
      segment: "PREMIUM",
      widthM: decimal(10),
      lengthM: decimal(9),
      targetBudgetRub: decimal(4_200_000),
      needsDelivery: true,
      needsInstallation: true,
      notes: "Демо: КП отправлено, outcome еще не зафиксирован.",
      estimateJson: toJsonValue({ source: DEMO_READINESS_SOURCE }),
      modelBriefJson: toJsonValue({ source: DEMO_READINESS_SOURCE }),
      qualificationJson: toJsonValue({ source: DEMO_READINESS_SOURCE }),
      qualificationSummary:
        "КП уже отправлено; менеджеру нужно довести follow-up до результата.",
      qualificationConfidence: decimal(0.91),
      customerCompanyId: scenarioThreeCustomer.company.id,
      customerContactId: scenarioThreeCustomer.contact.id,
      assignedManagerId: manager.id,
      nextActionLabel: "Получить решение по КП",
      nextActionDueAt: dateAt(96),
      lastSalesActionAt: dateAt(13),
      createdAt: dateAt(2),
      updatedAt: dateAt(13),
      submittedAt: dateAt(2),
      qualifiedAt: dateAt(3),
    },
  });
  const selectionThree = await createSelectionSession({
    requestId: scenarioThree.id,
    managerId: manager.id,
    lines: lines.slice(3, 6),
    createdAt: dateAt(6),
  });
  const sceneThree = await createSceneProject({
    requestId: scenarioThree.id,
    selectionSessionId: selectionThree.id,
    managerId: manager.id,
    lines: lines.slice(3, 6),
    title: "Демо-сцена: частный участок",
    createdAt: dateAt(7),
  });
  const proposalThree = await createProposal({
    requestId: scenarioThree.id,
    selectionSessionId: selectionThree.id,
    sceneProjectId: sceneThree.id,
    managerId: manager.id,
    number: "DEMO-KP-003",
    status: "SENT",
    title: "КП отправлено, нужен итог",
    customerName: scenarioThreeCustomer.company.name,
    customerAddress: "Московская область, частный участок",
    lines: lines.slice(3, 6),
    issueDate: dateAt(8),
    sentAt: dateAt(11),
    createdAt: dateAt(8),
  });
  const sentAction = await prisma.salesAction.create({
    data: {
      dedupeKey: "demo-readiness:DEMO-DR-003:proposal-sent",
      clientRequestId: scenarioThree.id,
      proposalId: proposalThree.proposal.id,
      proposalVersionId: proposalThree.version?.id,
      sceneProjectId: sceneThree.id,
      assignedManagerId: manager.id,
      actorUserId: manager.id,
      type: "PROPOSAL_SENT",
      status: "COMPLETED",
      title: "КП отправлено клиенту",
      outcome: "PROPOSAL_SENT",
      completedAt: dateAt(11),
      metadata: demoMetadata,
      createdAt: dateAt(11),
      updatedAt: dateAt(11),
    },
  });
  const actionThree = await prisma.salesAction.create({
    data: {
      dedupeKey: "demo-readiness:DEMO-DR-003:open-follow-up",
      clientRequestId: scenarioThree.id,
      proposalId: proposalThree.proposal.id,
      proposalVersionId: proposalThree.version?.id,
      sceneProjectId: sceneThree.id,
      assignedManagerId: manager.id,
      actorUserId: manager.id,
      type: "FOLLOW_UP",
      status: "OPEN",
      title: "Получить решение по КП",
      nextActionLabel: "Получить решение по КП",
      dueAt: dateAt(96),
      metadata: demoMetadata,
      createdAt: dateAt(13),
      updatedAt: dateAt(13),
    },
  });

  for (const [eventType, entityType, entityId, createdAt] of [
    ["CLIENT_REQUEST_CREATED", "ClientRequest", scenarioThree.id, dateAt(2)],
    ["SELECTION_RECOMMENDATION_CREATED", "SelectionSession", selectionThree.id, dateAt(6)],
    ["SCENE_PROJECT_CREATED", "SceneProject", sceneThree.id, dateAt(7)],
    ["PROPOSAL_CREATED", "Proposal", proposalThree.proposal.id, dateAt(8)],
    ["PROPOSAL_VERSION_CREATED", "ProposalVersion", proposalThree.version?.id, dateAt(8)],
    ["SALES_ACTION_CREATED", "SalesAction", sentAction.id, dateAt(11)],
    ["SALES_ACTION_CREATED", "SalesAction", actionThree.id, dateAt(13)],
  ] as const) {
    if (entityId) {
      await recordEvent({
        dedupeKey: `demo-readiness:${entityType}:${entityId}:${eventType}`,
        actorUserId: manager.id,
        eventType,
        entityType,
        entityId,
        createdAt,
      });
    }
  }

  return { seededRequests: 3 };
}

async function verifyDemoReadiness() {
  const requests = await prisma.clientRequest.findMany({
    where: { source: DEMO_READINESS_SOURCE },
    include: {
      salesActions: true,
      selectionSessions: true,
      sceneProjects: true,
      proposals: {
        include: {
          versions: true,
        },
      },
    },
    orderBy: { reference: "asc" },
  });

  assertCondition(requests.length === 3, `Expected 3 demo requests, found ${requests.length}`);
  assertCondition(
    requests.map((request) => request.reference).join(",") ===
      demoReadinessReferences.join(","),
    "Demo request references are not deterministic",
  );

  const [scenarioOne, scenarioTwo, scenarioThree] = requests;
  assertCondition(scenarioOne?.status === "NEEDS_REVIEW", "DEMO-DR-001 status mismatch");
  assertCondition(!scenarioOne?.assignedManagerId, "DEMO-DR-001 must not have owner");
  assertCondition(
    scenarioOne?.salesActions.filter((action) => action.status === "OPEN").length === 0,
    "DEMO-DR-001 must not have OPEN action",
  );

  assertCondition(scenarioTwo?.status === "IN_SALES", "DEMO-DR-002 status mismatch");
  assertCondition(Boolean(scenarioTwo?.assignedManagerId), "DEMO-DR-002 must have owner");
  assertCondition(
    scenarioTwo?.selectionSessions.length === 1,
    "DEMO-DR-002 must have one selection session",
  );
  assertCondition(scenarioTwo?.sceneProjects.length === 1, "DEMO-DR-002 must have scene");
  assertCondition(
    scenarioTwo?.proposals.length === 1 &&
      scenarioTwo.proposals[0]?.status === "READY" &&
      scenarioTwo.proposals[0]?.versions.length === 1,
    "DEMO-DR-002 must have READY proposal with version",
  );
  assertCondition(
    scenarioTwo?.salesActions.filter((action) => action.status === "OPEN").length === 1,
    "DEMO-DR-002 must have exactly one OPEN action",
  );

  assertCondition(
    scenarioThree?.status === "PROPOSAL_SENT",
    "DEMO-DR-003 status mismatch",
  );
  assertCondition(Boolean(scenarioThree?.assignedManagerId), "DEMO-DR-003 must have owner");
  assertCondition(
    scenarioThree?.salesOutcome === null && scenarioThree?.salesOutcomeAt === null,
    "DEMO-DR-003 must not have terminal outcome",
  );
  assertCondition(
    scenarioThree?.proposals.length === 1 &&
      scenarioThree.proposals[0]?.status === "SENT" &&
      Boolean(scenarioThree.proposals[0]?.sentAt) &&
      scenarioThree.proposals[0]?.versions.length === 1,
    "DEMO-DR-003 must have SENT proposal with version",
  );
  assertCondition(
    scenarioThree?.salesActions.filter((action) => action.status === "OPEN").length === 1,
    "DEMO-DR-003 must have exactly one OPEN action",
  );

  const queue = await managerWorkspaceReadRepository.getManagerQueue({
    scope: "all",
    nextAction: "any",
    attention: "any",
    sort: "priority",
  });
  const demoQueueItems = queue.items.filter((item) => item.isDemo);
  assertCondition(demoQueueItems.length === 3, "Manager queue must expose 3 demo rows");
  assertCondition(
    queue.commercialBaseline.activeRequests ===
      (await prisma.clientRequest.count({
        where: {
          source: { not: DEMO_READINESS_SOURCE },
          status: { notIn: [...terminalStatuses] },
        },
      })),
    "Commercial baseline must exclude DEMO_READINESS requests",
  );

  const workspaces = await Promise.all(
    requests.map((request) =>
      managerWorkspaceReadRepository.getRequestWorkspace(request.id),
    ),
  );
  assertCondition(
    workspaces.every((workspace) => workspace?.request.isDemo),
    "Demo workspace marker is missing",
  );
  assertCondition(
    scenarioTwo?.proposals[0]?.versions[0]?.id &&
      scenarioThree?.proposals[0]?.versions[0]?.id,
    "Demo proposal versions must be available for PDF access",
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        source: DEMO_READINESS_SOURCE,
        checked: [
          "three-deterministic-scenarios",
          "demo-reset-seed-idempotency-shape",
          "queue-workspace-demo-markers",
          "baseline-excludes-demo-data",
          "persisted-proposal-versions",
        ],
      },
      null,
      2,
    ),
  );
}

async function main() {
  const readiness = await checkOperationalDatabaseReadiness();

  if (!readiness.ok) {
    throw new Error(
      `Operational DB is not ready: ${readiness.code}. ${readiness.action}`,
    );
  }

  const command = process.argv[2];

  if (command === "reset") {
    const result = await resetDemoReadiness();
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
    return;
  }

  if (command === "seed") {
    const result = await seedDemoReadiness();
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
    return;
  }

  if (command === "verify") {
    await verifyDemoReadiness();
    return;
  }

  throw new Error("Usage: demo-readiness.ts <reset|seed|verify>");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
