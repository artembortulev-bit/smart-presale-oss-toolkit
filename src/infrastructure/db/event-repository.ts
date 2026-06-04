import { Prisma } from "@prisma/client";

import {
  EventRepository,
  RecordOperationalEventInput,
} from "@/application/events/repository";
import { prisma } from "@/infrastructure/db/prisma";
import {
  OperationalDatabaseError,
  withOperationalDatabase,
} from "@/infrastructure/db/readiness";
import { logger } from "@/infrastructure/logging/logger";

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function unwrapOperationalDatabaseCause(error: unknown) {
  return error instanceof OperationalDatabaseError ? error.cause : error;
}

function isUniqueConflict(error: unknown) {
  const cause = unwrapOperationalDatabaseCause(error);

  return (
    cause instanceof Prisma.PrismaClientKnownRequestError &&
    cause.code === "P2002"
  );
}

export const eventRepository: EventRepository = {
  async hasDedupeKey(dedupeKey: string) {
    const event = await withOperationalDatabase(() =>
      prisma.eventLog.findUnique({
        where: { dedupeKey },
        select: { id: true },
      }),
    );

    return Boolean(event);
  },

  async record(input: RecordOperationalEventInput) {
    try {
      await withOperationalDatabase(async () => {
        const data = {
          dedupeKey: input.dedupeKey,
          actorUserId: input.actorUserId,
          eventType: input.eventType,
          entityType: input.entityType,
          entityId: input.entityId,
          payload: input.payload ? toJsonValue(input.payload) : undefined,
        };

        if (input.dedupeKey) {
          await prisma.eventLog.upsert({
            where: { dedupeKey: input.dedupeKey },
            create: data,
            update: {},
          });
          return;
        }

        await prisma.eventLog.create({ data });
      });
    } catch (error) {
      if (input.dedupeKey && isUniqueConflict(error)) {
        return;
      }

      logger.warn({ error, event: input }, "Failed to record operational event");
    }
  },
};
