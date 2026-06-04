import { Prisma } from "@prisma/client";

import {
  PersistSelectionRecommendationInput,
  PersistedSelectionRecommendationSet,
  SelectionRepository,
} from "@/application/selection/repository";
import { prisma } from "@/infrastructure/db/prisma";
import { withOperationalDatabase } from "@/infrastructure/db/readiness";

function optionalDecimal(value?: number) {
  return value === undefined ? undefined : new Prisma.Decimal(value);
}

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export const selectionRepository: SelectionRepository = {
  async findLatestSessionByClientRequestId(clientRequestId: string) {
    const session = await withOperationalDatabase(() =>
      prisma.selectionSession.findFirst({
        where: { clientRequestId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          _count: {
            select: {
              recommendations: true,
            },
          },
        },
      }),
    );

    if (!session) {
      return null;
    }

    return {
      sessionId: session.id,
      recommendationCount: session._count.recommendations,
    };
  },

  async saveRecommendationSet(
    input: PersistSelectionRecommendationInput,
  ): Promise<PersistedSelectionRecommendationSet> {
    const { recommendation } = input;
    const dedupeKey = input.clientRequestId
      ? `client-request:${input.clientRequestId}:primary-recommendation`
      : undefined;
    const selectSessionSummary = {
        id: true,
        _count: {
          select: {
            recommendations: true,
          },
        },
      } satisfies Prisma.SelectionSessionSelect;

    const session = await withOperationalDatabase(async () => {
      if (dedupeKey) {
        const existing = await prisma.selectionSession.findUnique({
          where: { dedupeKey },
          select: selectSessionSummary,
        });

        if (existing) {
          return existing;
        }
      }

      try {
        return await prisma.selectionSession.create({
          data: {
            dedupeKey,
            clientRequestId: input.clientRequestId,
            projectId: input.projectId,
            createdByUserId: input.createdByUserId,
            status: "FINALIZED",
            inputData: toJsonValue(recommendation.input),
            constraintsJson: toJsonValue(recommendation.constraints),
            recognizedPreferences: toJsonValue(recommendation.recognizedPreferences),
            filtersApplied: recommendation.filtersApplied,
            filteredOutCount: recommendation.filteredOutCount,
            rationale: recommendation.rationale,
            estimatedTotalRub: optionalDecimal(recommendation.estimatedTotalRub),
            recommendations: {
              create: recommendation.items.map((item, index) => ({
                rank: index + 1,
                score: optionalDecimal(item.score),
                catalogProductId: item.product.id,
                productArticle: item.product.article,
                productSlug: item.product.slug,
                productName: item.product.name,
                productImageUrl: item.product.imageUrl,
                productSnapshot: toJsonValue({
                  categoryName: item.product.categoryName,
                  subcategoryLabel: item.product.subcategoryLabel,
                  basePriceRub: item.product.basePriceRub,
                  sizeLabel: item.product.sizeLabel,
                  materials: item.product.materials,
                }),
                quantity: item.quantity,
                reasoning: item.reasoning,
                highlights: item.highlights,
                scoreBreakdown: toJsonValue(item.breakdown),
                estimatedLineRub: optionalDecimal(
                  (item.product.basePriceRub ?? 0) * item.quantity,
                ),
              })),
            },
          },
          select: selectSessionSummary,
        });
      } catch (error) {
        if (
          dedupeKey &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const existing = await prisma.selectionSession.findUnique({
            where: { dedupeKey },
            select: selectSessionSummary,
          });

          if (existing) {
            return existing;
          }
        }

        throw error;
      }
    });

    if (input.clientRequestId) {
      await withOperationalDatabase(() =>
        prisma.clientRequest.update({
          where: { id: input.clientRequestId },
          data: { status: "RECOMMENDATION_READY" },
        }),
      );
    }

    return {
      sessionId: session.id,
      recommendationCount: session._count.recommendations,
    };
  },
};
