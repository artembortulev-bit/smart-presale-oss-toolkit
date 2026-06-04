export type InternalUserRole = "ADMIN" | "MANAGER";

export type InternalUser = {
  id: string;
  email: string;
  name: string;
  role: InternalUserRole;
};

export type UserRepository = {
  findActiveInternalUser(userId: string): Promise<InternalUser | null>;
  ensureDefaultInternalUser(): Promise<InternalUser>;
};
