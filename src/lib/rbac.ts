import { auth } from "@/auth";

export type AppRole = "USER" | "ANALYST" | "ADMIN" | "SECURITY_ADMIN";

const permissions: Record<AppRole, readonly string[]> = {
  USER: ["market:read", "research:read:self"],
  ANALYST: ["market:read", "research:read:self", "research:create"],
  ADMIN: ["market:read", "research:read:self", "research:create", "users:read", "users:manage"],
  SECURITY_ADMIN: ["market:read", "research:read:self", "security:audit", "security:manage"],
};

export function hasPermission(role: string | undefined, permission: string): boolean {
  if (!role || !(role in permissions)) return false;
  return permissions[role as AppRole].includes(permission);
}

export async function requirePermission(permission: string) {
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user.role, permission)) {
    throw new Error("FORBIDDEN");
  }
  return session.user;
}
