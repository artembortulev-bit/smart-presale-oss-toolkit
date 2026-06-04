import { checkOperationalDatabaseReadiness } from "@/infrastructure/db/readiness";

export const runtime = "nodejs";

export async function GET() {
  const readiness = await checkOperationalDatabaseReadiness();

  if (readiness.ok) {
    return Response.json({
      ok: true,
      service: "operational-db",
    });
  }

  return Response.json(
    {
      ok: false,
      service: "operational-db",
      code: readiness.code,
      message: readiness.message,
      action: readiness.action,
      details: readiness.details,
    },
    { status: 503 },
  );
}
