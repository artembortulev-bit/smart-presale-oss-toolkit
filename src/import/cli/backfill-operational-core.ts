import { buildClientRequestQualificationSnapshot } from "@/application/client-intake/qualification";
import {
  ClientRequestRecord,
  ClientRequestSubmission,
} from "@/application/client-intake/types";
import { listClientRequestsFromStore } from "@/infrastructure/data/client-intake-store";
import { clientRequestRepository } from "@/infrastructure/db/client-request-repository";
import { eventRepository } from "@/infrastructure/db/event-repository";
import { prisma } from "@/infrastructure/db/prisma";
import { logger } from "@/infrastructure/logging/logger";

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

async function main() {
  const legacyRequests = await listClientRequestsFromStore();
  let inserted = 0;
  let skipped = 0;

  for (const request of legacyRequests) {
    const existing =
      (await clientRequestRepository.findById(request.id)) ??
      (await clientRequestRepository.findByReference(request.reference));

    if (existing) {
      skipped += 1;
      continue;
    }

    const qualification = buildClientRequestQualificationSnapshot(
      toSubmission(request),
      request.estimate,
    );

    await clientRequestRepository.save({
      request,
      qualification,
    });
    await eventRepository.record({
      dedupeKey: `client-request:${request.id}:created`,
      eventType: "CLIENT_REQUEST_CREATED",
      entityType: "ClientRequest",
      entityId: request.id,
      payload: {
        source: "legacy-json-backfill",
        reference: request.reference,
      },
    });
    inserted += 1;
  }

  logger.info(
    {
      inserted,
      skipped,
      total: legacyRequests.length,
    },
    "Operational core backfill completed",
  );
}

main()
  .catch((error) => {
    logger.error({ error }, "Operational core backfill failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
