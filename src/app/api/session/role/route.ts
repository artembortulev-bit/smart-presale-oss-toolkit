import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getPortalHomeHref,
  internalUserCookieName,
  parsePortalRole,
  portalRoleCookieName,
} from "@/application/auth/portal-access";
import { userRepository } from "@/infrastructure/db/user-repository";

const sessionRolePayloadSchema = z.object({
  role: z.enum(["guest", "client", "employee"]),
  next: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const parsed = sessionRolePayloadSchema.parse({
    role: String(formData.get("role") ?? "guest"),
    next: formData.get("next") ? String(formData.get("next")) : undefined,
  });

  const role = parsePortalRole(parsed.role);
  const redirectTarget = parsed.next?.trim() || getPortalHomeHref(role);
  const response = NextResponse.redirect(new URL(redirectTarget, request.url));

  if (role === "guest") {
    response.cookies.delete(portalRoleCookieName);
    response.cookies.delete(internalUserCookieName);
  } else {
    response.cookies.set(portalRoleCookieName, role, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    if (role === "employee") {
      const internalUser = await userRepository.ensureDefaultInternalUser();
      response.cookies.set(internalUserCookieName, internalUser.id, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    } else {
      response.cookies.delete(internalUserCookieName);
    }
  }

  return response;
}
