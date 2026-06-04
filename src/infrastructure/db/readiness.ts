import { Prisma } from "@prisma/client";

import { prisma } from "@/infrastructure/db/prisma";

export type OperationalDatabaseFailureCode =
  | "DATABASE_UNAVAILABLE"
  | "MIGRATIONS_PENDING"
  | "DATABASE_UNKNOWN";

export type OperationalDatabaseReadiness =
  | {
      ok: true;
    }
  | {
      ok: false;
      code: OperationalDatabaseFailureCode;
      message: string;
      action: string;
      details?: string;
    };

export class OperationalDatabaseError extends Error {
  readonly code: OperationalDatabaseFailureCode;
  readonly action: string;

  constructor(readiness: Exclude<OperationalDatabaseReadiness, { ok: true }>, cause?: unknown) {
    super(readiness.message);
    this.name = "OperationalDatabaseError";
    this.code = readiness.code;
    this.action = readiness.action;
    this.cause = cause;
  }
}

function fromPrismaError(error: unknown): Exclude<OperationalDatabaseReadiness, { ok: true }> {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      ok: false,
      code: "DATABASE_UNAVAILABLE",
      message: "Operational database is unavailable.",
      action: "Проверьте, что PostgreSQL запущен и DATABASE_URL в .env корректный.",
      details: error.message,
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (["P1000", "P1001", "P1002", "P1003", "P1017"].includes(error.code)) {
      return {
        ok: false,
        code: "DATABASE_UNAVAILABLE",
        message: "Operational database connection failed.",
        action: "Запустите PostgreSQL и проверьте доступы в DATABASE_URL.",
        details: `${error.code}: ${error.message}`,
      };
    }

    if (["P2021", "P2022"].includes(error.code)) {
      return {
        ok: false,
        code: "MIGRATIONS_PENDING",
        message: "Operational database schema is not ready.",
        action: "Примените миграции командой: cmd /c npx prisma migrate dev",
        details: `${error.code}: ${error.message}`,
      };
    }
  }

  return {
    ok: false,
    code: "DATABASE_UNKNOWN",
    message: "Operational database check failed.",
    action: "Проверьте логи сервера, DATABASE_URL и состояние Prisma migrations.",
    details: error instanceof Error ? error.message : String(error),
  };
}

export function toOperationalDatabaseError(error: unknown) {
  if (error instanceof OperationalDatabaseError) {
    return error;
  }

  return new OperationalDatabaseError(fromPrismaError(error), error);
}

export function isOperationalDatabaseError(error: unknown): error is OperationalDatabaseError {
  return error instanceof OperationalDatabaseError;
}

export async function checkOperationalDatabaseReadiness(): Promise<OperationalDatabaseReadiness> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.clientRequest.count();
    return { ok: true };
  } catch (error) {
    return fromPrismaError(error);
  }
}

export async function assertOperationalDatabaseReady() {
  const readiness = await checkOperationalDatabaseReadiness();

  if (!readiness.ok) {
    throw new OperationalDatabaseError(readiness);
  }
}

export async function withOperationalDatabase<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    throw toOperationalDatabaseError(error);
  }
}
