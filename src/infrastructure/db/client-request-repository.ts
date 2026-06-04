import { Prisma } from "@prisma/client";

import {
  ClientRequestRepository,
  SaveClientRequestInput,
} from "@/application/client-intake/repository";
import {
  ClientRequestPhoto,
  ClientRequestRecord,
  ClientRequestStatus,
  clientRequestStatuses,
} from "@/application/client-intake/types";
import { prisma } from "@/infrastructure/db/prisma";
import { withOperationalDatabase } from "@/infrastructure/db/readiness";

type PrismaClientRequestWithAssets = Prisma.ClientRequestGetPayload<{
  include: {
    assets: true;
  };
}>;

const supportedClientRequestStatuses = new Set<string>(clientRequestStatuses);

function optionalDecimal(value?: number) {
  return value === undefined ? undefined : new Prisma.Decimal(value);
}

function decimalToNumber(value: Prisma.Decimal | null) {
  return value === null ? undefined : value.toNumber();
}

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toClientRequestStatus(status: string): ClientRequestStatus {
  if (supportedClientRequestStatuses.has(status)) {
    return status as ClientRequestStatus;
  }

  if (status === "QUALIFIED") {
    return "QUALIFIED";
  }

  if (status === "RECOMMENDATION_READY") {
    return "RECOMMENDATION_READY";
  }

  return "SUBMITTED";
}

function toPhoto(asset: PrismaClientRequestWithAssets["assets"][number]): ClientRequestPhoto {
  return {
    id: asset.id,
    url: asset.publicUrl,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    uploadedAt: asset.createdAt.toISOString(),
  };
}

function toRecord(request: PrismaClientRequestWithAssets): ClientRequestRecord {
  return {
    id: request.id,
    reference: request.reference,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    status: toClientRequestStatus(request.status),
    customerName: request.customerName,
    companyName: request.companyName ?? undefined,
    email: request.email ?? undefined,
    phone: request.phone ?? undefined,
    projectName: request.projectName ?? undefined,
    location: request.location ?? undefined,
    objectType: request.objectType as ClientRequestRecord["objectType"],
    segment: request.segment as ClientRequestRecord["segment"],
    widthM: decimalToNumber(request.widthM),
    lengthM: decimalToNumber(request.lengthM),
    heightM: decimalToNumber(request.heightM),
    targetBudgetRub: decimalToNumber(request.targetBudgetRub),
    needsDelivery: request.needsDelivery,
    needsInstallation: request.needsInstallation,
    notes: request.notes ?? undefined,
    photos: request.assets.map(toPhoto),
    estimate: request.estimateJson as ClientRequestRecord["estimate"],
    modelBrief: request.modelBriefJson as ClientRequestRecord["modelBrief"],
  };
}

async function resolveCustomerIds(input: SaveClientRequestInput) {
  const { request } = input;
  const companyName = request.companyName?.trim();

  if (!companyName) {
    return {};
  }

  const company =
    (await prisma.customerCompany.findFirst({
      where: { name: companyName },
      select: { id: true },
    })) ??
    (await prisma.customerCompany.create({
      data: {
        name: companyName,
        legalName: companyName,
        email: request.email,
        phone: request.phone,
      },
      select: { id: true },
    }));

  const contact =
    (await prisma.customerContact.findFirst({
      where: {
        companyId: company.id,
        OR: [
          request.email ? { email: request.email } : undefined,
          request.phone ? { phone: request.phone } : undefined,
          { fullName: request.customerName },
        ].filter(Boolean) as Prisma.CustomerContactWhereInput[],
      },
      select: { id: true },
    })) ??
    (await prisma.customerContact.create({
      data: {
        companyId: company.id,
        fullName: request.customerName,
        email: request.email,
        phone: request.phone,
      },
      select: { id: true },
    }));

  return {
    customerCompanyId: company.id,
    customerContactId: contact.id,
  };
}

function buildRequestData(input: SaveClientRequestInput) {
  const { request, qualification } = input;

  return {
    reference: request.reference,
    status: request.status,
    customerName: request.customerName,
    companyName: request.companyName,
    email: request.email,
    phone: request.phone,
    projectName: request.projectName,
    location: request.location,
    objectType: request.objectType,
    segment: request.segment,
    widthM: optionalDecimal(request.widthM),
    lengthM: optionalDecimal(request.lengthM),
    heightM: optionalDecimal(request.heightM),
    targetBudgetRub: optionalDecimal(request.targetBudgetRub),
    needsDelivery: request.needsDelivery,
    needsInstallation: request.needsInstallation,
    notes: request.notes,
    estimateJson: toJsonValue(request.estimate),
    modelBriefJson: toJsonValue(request.modelBrief),
    qualificationJson: qualification
      ? toJsonValue(qualification.parsedRequirements)
      : undefined,
    qualificationSummary: qualification?.summary,
    qualificationConfidence:
      qualification?.confidence === undefined
        ? undefined
        : new Prisma.Decimal(qualification.confidence),
    qualificationWarnings: qualification?.warnings ?? [],
    qualifiedAt: qualification ? new Date() : undefined,
    createdByUserId: input.createdByUserId,
    assignedManagerId: input.assignedManagerId,
  };
}

function buildAssetCreateData(photos: ClientRequestPhoto[]) {
  return photos.map((photo) => ({
    id: photo.id,
    kind: "PHOTO" as const,
    fileName: photo.fileName,
    mimeType: photo.mimeType,
    sizeBytes: photo.sizeBytes,
    publicUrl: photo.url,
    metadata: {
      uploadedAt: photo.uploadedAt,
    },
  }));
}

export const clientRequestRepository: ClientRequestRepository = {
  async list() {
    const requests = await withOperationalDatabase(() =>
      prisma.clientRequest.findMany({
        include: { assets: true },
        orderBy: { createdAt: "desc" },
      }),
    );

    return requests.map(toRecord);
  },

  async findById(requestId: string) {
    const request = await withOperationalDatabase(() =>
      prisma.clientRequest.findUnique({
        where: { id: requestId },
        include: { assets: true },
      }),
    );

    return request ? toRecord(request) : null;
  },

  async findByReference(reference: string) {
    const request = await withOperationalDatabase(() =>
      prisma.clientRequest.findUnique({
        where: { reference },
        include: { assets: true },
      }),
    );

    return request ? toRecord(request) : null;
  },

  async save(input: SaveClientRequestInput) {
    const saved = await withOperationalDatabase(async () => {
      const customerIds = await resolveCustomerIds(input);
      const requestData = buildRequestData(input);

      return prisma.clientRequest.upsert({
        where: { id: input.request.id },
        create: {
          id: input.request.id,
          ...requestData,
          ...customerIds,
          assets: {
            create: buildAssetCreateData(input.request.photos),
          },
        },
        update: {
          ...requestData,
          ...customerIds,
          assets: {
            deleteMany: {},
            create: buildAssetCreateData(input.request.photos),
          },
        },
        include: { assets: true },
      });
    });

    return toRecord(saved);
  },

  async attachPhotos(requestId: string, photos: ClientRequestPhoto[]) {
    await withOperationalDatabase(() =>
      prisma.clientRequestAsset.createMany({
        data: photos.map((photo) => ({
          id: photo.id,
          clientRequestId: requestId,
          kind: "PHOTO",
          fileName: photo.fileName,
          mimeType: photo.mimeType,
          sizeBytes: photo.sizeBytes,
          publicUrl: photo.url,
          metadata: {
            uploadedAt: photo.uploadedAt,
          },
        })),
        skipDuplicates: true,
      }),
    );
  },
};
