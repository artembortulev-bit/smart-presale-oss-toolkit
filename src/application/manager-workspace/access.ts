import { cookies } from "next/headers";

import {
  buildSignInHref,
  internalUserCookieName,
  parsePortalRole,
  portalRoleCookieName,
  requireInternalUser,
} from "@/application/auth/portal-access";
import { InternalUser } from "@/application/auth/user-repository";
import { userRepository } from "@/infrastructure/db/user-repository";

export class ManagerWorkspaceAccessError extends Error {
  constructor(message = "Нет доступа к менеджерскому контуру") {
    super(message);
    this.name = "ManagerWorkspaceAccessError";
  }
}

export function buildManagerSignInHref(nextPath: string) {
  return buildSignInHref(nextPath);
}

export async function requireManagerWorkspacePageUser(nextPath: string) {
  return requireInternalUser(["ADMIN", "MANAGER"], nextPath);
}

export async function requireManagerWorkspaceCommandUser(): Promise<InternalUser> {
  const cookieStore = await cookies();
  const role = parsePortalRole(cookieStore.get(portalRoleCookieName)?.value);

  if (role !== "employee") {
    throw new ManagerWorkspaceAccessError(
      "Действие доступно только сотруднику Smart Presale.",
    );
  }

  const userId = cookieStore.get(internalUserCookieName)?.value;

  if (!userId) {
    throw new ManagerWorkspaceAccessError(
      "Не найден внутренний пользователь. Войдите как сотрудник заново.",
    );
  }

  const user = await userRepository.findActiveInternalUser(userId);

  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    throw new ManagerWorkspaceAccessError(
      "У пользователя нет прав менеджера.",
    );
  }

  return user;
}
