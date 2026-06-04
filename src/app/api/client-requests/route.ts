import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

import {
  getCurrentInternalUser,
  getPortalRole,
} from "@/application/auth/portal-access";
import {
  createClientRequest,
  listClientRequests,
} from "@/application/client-intake/service";
import { clientRequestSubmissionSchema } from "@/application/client-intake/types";
import { saveClientRequestPhotos } from "@/infrastructure/data/client-intake-store";
import {
  assertOperationalDatabaseReady,
  isOperationalDatabaseError,
} from "@/infrastructure/db/readiness";

export const runtime = "nodejs";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSizeBytes = 12 * 1024 * 1024;
const maxFilesCount = 8;

function databaseErrorResponse(error: unknown) {
  if (!isOperationalDatabaseError(error)) {
    return null;
  }

  return Response.json(
    {
      error: error.message,
      code: error.code,
      action: error.action,
    },
    { status: 503 },
  );
}

export async function GET() {
  try {
    const role = await getPortalRole();

    if (role === "guest") {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    await assertOperationalDatabaseReady();
    const requests = await listClientRequests();
    return Response.json({
      total: requests.length,
      requests,
    });
  } catch (error) {
    const response = databaseErrorResponse(error);
    if (response) {
      return response;
    }

    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = await getPortalRole();

    if (role === "guest") {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    await assertOperationalDatabaseReady();

    const formData = await request.formData();
  const rawFiles = formData.getAll("photos");
  const files = rawFiles.filter((item): item is File => item instanceof File && item.size > 0);

  if (files.length === 0) {
    return Response.json(
      {
        error: "Добавьте хотя бы одну фотографию объекта.",
      },
      { status: 400 },
    );
  }

  if (files.length > maxFilesCount) {
    return Response.json(
      {
        error: `Можно загрузить не более ${maxFilesCount} файлов за одну заявку.`,
      },
      { status: 400 },
    );
  }

  for (const file of files) {
    if (!allowedMimeTypes.has(file.type)) {
      return Response.json(
        {
          error: `Файл «${file.name}» имеет неподдерживаемый формат.`,
        },
        { status: 400 },
      );
    }

    if (file.size > maxFileSizeBytes) {
      return Response.json(
        {
          error: `Файл «${file.name}» превышает лимит 12 МБ.`,
        },
        { status: 400 },
      );
    }
  }

  const submissionResult = clientRequestSubmissionSchema.safeParse({
    customerName: formData.get("customerName"),
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    projectName: formData.get("projectName"),
    location: formData.get("location"),
    objectType: formData.get("objectType"),
    segment: formData.get("segment"),
    widthM: formData.get("widthM"),
    lengthM: formData.get("lengthM"),
    heightM: formData.get("heightM"),
    targetBudgetRub: formData.get("targetBudgetRub"),
    needsDelivery: formData.get("needsDelivery") !== null,
    needsInstallation: formData.get("needsInstallation") !== null,
    notes: formData.get("notes"),
  });

  if (!submissionResult.success) {
    return Response.json(
      {
        error:
          submissionResult.error.issues[0]?.message ??
          "Некорректные данные заявки.",
      },
      { status: 400 },
    );
  }

  const requestId = randomUUID();
  const photos = await saveClientRequestPhotos(requestId, files);
  const internalUser = role === "employee" ? await getCurrentInternalUser() : null;
  const record = await createClientRequest(
    requestId,
    submissionResult.data,
    photos,
    internalUser?.id,
  );

  revalidatePath("/client");
  revalidatePath(`/client/${record.id}`);

    return Response.json({
      id: record.id,
      reference: record.reference,
    });
  } catch (error) {
    const response = databaseErrorResponse(error);
    if (response) {
      return response;
    }

    throw error;
  }
}
