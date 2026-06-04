import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getCurrentInternalUser,
  getPortalRole,
} from "@/application/auth/portal-access";
import {
  SalesProcessValidationError,
  createSalesAction,
  recordProposalSent,
  recordSalesOutcome,
} from "@/application/sales-process/service";
import { createSalesActionSchema } from "@/application/sales-process/types";
import { isOperationalDatabaseError } from "@/infrastructure/db/readiness";

function errorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "invalid_request", issues: error.issues },
      { status: 400 },
    );
  }

  if (error instanceof SalesProcessValidationError) {
    return NextResponse.json(
      { error: "process_validation_failed", message: error.message },
      { status: 409 },
    );
  }

  if (isOperationalDatabaseError(error)) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        action: error.action,
      },
      { status: 503 },
    );
  }

  throw error;
}

export async function POST(request: NextRequest) {
  try {
    const role = await getPortalRole();

    if (role !== "employee") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const internalUser = await getCurrentInternalUser();
    const input = createSalesActionSchema.parse(await request.json());
    if (input.type === "STATUS_CHANGE") {
      return NextResponse.json(
        {
          error: "unsupported_command",
          message: "Use a domain command instead of generic STATUS_CHANGE.",
        },
        { status: 400 },
      );
    }

    const action =
      input.type === "PROPOSAL_SENT" && input.proposalId
        ? await recordProposalSent(
            {
              clientRequestId: input.clientRequestId,
              proposalId: input.proposalId,
              proposalVersionId: input.proposalVersionId,
              sceneProjectId: input.sceneProjectId,
              assignedManagerId: input.assignedManagerId,
              nextActionLabel: input.nextActionLabel,
              dueAt: input.dueAt,
              notes: input.notes,
            },
            internalUser?.id,
          )
        : input.type === "OUTCOME" &&
            (input.outcome === "WON" ||
              input.outcome === "LOST" ||
              input.outcome === "NOT_A_FIT")
          ? await recordSalesOutcome(
              {
                clientRequestId: input.clientRequestId,
                proposalId: input.proposalId,
                proposalVersionId: input.proposalVersionId,
                sceneProjectId: input.sceneProjectId,
                assignedManagerId: input.assignedManagerId,
                outcome: input.outcome,
                outcomeNote: input.outcomeNote,
                notes: input.notes,
              },
              internalUser?.id,
            )
          : await createSalesAction(input, internalUser?.id);

    return NextResponse.json({ action }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
