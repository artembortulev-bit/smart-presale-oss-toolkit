import { InternalUser, UserRepository } from "@/application/auth/user-repository";
import { prisma } from "@/infrastructure/db/prisma";
import { withOperationalDatabase } from "@/infrastructure/db/readiness";

const defaultInternalUser = {
  email: "manager@example.local",
  name: "Smart Presale Manager",
  role: "MANAGER" as const,
};

function toInternalUser(user: {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MANAGER";
}): InternalUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export const userRepository: UserRepository = {
  async findActiveInternalUser(userId: string) {
    const user = await withOperationalDatabase(() =>
      prisma.user.findFirst({
        where: {
          id: userId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      }),
    );

    return user ? toInternalUser(user) : null;
  },

  async ensureDefaultInternalUser() {
    const user = await withOperationalDatabase(() =>
      prisma.user.upsert({
        where: { email: defaultInternalUser.email },
        create: defaultInternalUser,
        update: {
          name: defaultInternalUser.name,
          role: defaultInternalUser.role,
          status: "ACTIVE",
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      }),
    );

    return toInternalUser(user);
  },
};
