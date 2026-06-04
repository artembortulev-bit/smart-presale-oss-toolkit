import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { InternalUserRole } from "@/application/auth/user-repository";
import { userRepository } from "@/infrastructure/db/user-repository";

export const portalRoleValues = ["guest", "client", "employee"] as const;

export type PortalRole = (typeof portalRoleValues)[number];

export const portalRoleCookieName = "smart_presale_portal_role";
export const internalUserCookieName = "smart_presale_internal_user_id";

type RoleMeta = {
  label: string;
  shortLabel: string;
  description: string;
  homeHref: string;
};

const roleMeta: Record<PortalRole, RoleMeta> = {
  guest: {
    label: "Гость",
    shortLabel: "Гость",
    description: "Публичная витрина и знакомство с платформой.",
    homeHref: "/",
  },
  client: {
    label: "Клиент",
    shortLabel: "Клиент",
    description: "Фото-заявки, запросы и статус коммерческой работы.",
    homeHref: "/client",
  },
  employee: {
    label: "Сотрудник",
    shortLabel: "Сотрудник",
    description: "Подбор, сцены, КП и менеджерский контур.",
    homeHref: "/admin",
  },
};

export function parsePortalRole(value?: string | null): PortalRole {
  if (value === "client" || value === "employee") {
    return value;
  }

  return "guest";
}

export async function getPortalRole() {
  const cookieStore = await cookies();
  return parsePortalRole(cookieStore.get(portalRoleCookieName)?.value);
}

export async function getPortalContext() {
  const role = await getPortalRole();
  return {
    role,
    isAuthenticated: role !== "guest",
    ...roleMeta[role],
  };
}

export async function getCurrentInternalUser() {
  const cookieStore = await cookies();
  const role = parsePortalRole(cookieStore.get(portalRoleCookieName)?.value);

  if (role !== "employee") {
    return null;
  }

  const userId = cookieStore.get(internalUserCookieName)?.value;

  if (userId) {
    const user = await userRepository.findActiveInternalUser(userId);

    if (user) {
      return user;
    }
  }

  return userRepository.ensureDefaultInternalUser();
}

export function getPortalHomeHref(role: PortalRole) {
  return roleMeta[role].homeHref;
}

export function getPortalRoleLabel(role: PortalRole) {
  return roleMeta[role].label;
}

export function getPortalRoleDescription(role: PortalRole) {
  return roleMeta[role].description;
}

export function buildSignInHref(nextPath?: string) {
  if (!nextPath) {
    return "/auth/sign-in";
  }

  return `/auth/sign-in?next=${encodeURIComponent(nextPath)}`;
}

export async function requirePortalRole(
  allowedRoles: PortalRole[],
  nextPath: string,
) {
  const role = await getPortalRole();

  if (!allowedRoles.includes(role)) {
    redirect(buildSignInHref(nextPath));
  }

  return role;
}

export async function requireInternalUser(
  allowedRoles: InternalUserRole[],
  nextPath: string,
) {
  await requirePortalRole(["employee"], nextPath);
  const user = await getCurrentInternalUser();

  if (!user || !allowedRoles.includes(user.role)) {
    redirect(buildSignInHref(nextPath));
  }

  return user;
}
