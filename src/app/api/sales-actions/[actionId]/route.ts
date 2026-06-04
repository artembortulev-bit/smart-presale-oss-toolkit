import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getCurrentInternalUser,
  getPortalRole,
} from "@/application/auth/portal-access";
import {
  SalesProcessValidationError,
  updateSalesAction,
} from "@/application/sales-process/service";
import { updateSalesActionSchema } from "@/application/sales-process/types";
import { isOperationalDatabaseError } from "@/infrastructure/db/readiness";

type RouteContext = {
  params: Promise<{
    actionId: string;
  }>;
};

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

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const role = await getPortalRole();

    if (role !== "employee") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { actionId } = await context.params;
    const internalUser = await getCurrentInternalUser();
    const input = updateSalesActionSchema.parse(await request.json());
    const action = await updateSalesAction(actionId, input, internalUser?.id);

    return NextResponse.json({ action });
  } catch (error) {
    return errorResponse(error);
  }
}
