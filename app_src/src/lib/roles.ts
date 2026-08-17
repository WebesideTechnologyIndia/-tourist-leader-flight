import { prisma } from "./prisma";
import { SYSTEM_ROLES, ALL_PERMISSIONS, type Permission } from "./rbac";

/** Seed the built-in roles once; safe to call repeatedly. */
export async function ensureSystemRoles() {
  for (const r of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { key: r.key },
      update: {}, // don't overwrite admin edits to ADMIN/USER permissions
      create: { key: r.key, name: r.name, description: r.description, permissions: r.permissions, isSystem: true },
    });
  }
}

/** Resolve a role key → { name, permissions }. Falls back to system defaults / empty. */
export async function resolveRole(roleKey: string): Promise<{ key: string; name: string; permissions: string[] }> {
  try {
    const row = await prisma.role.findUnique({ where: { key: roleKey } });
    if (row) return { key: row.key, name: row.name, permissions: (row.permissions as string[]) || [] };
  } catch { /* ignore */ }
  const sys = SYSTEM_ROLES.find((r) => r.key === roleKey);
  if (sys) return { key: sys.key, name: sys.name, permissions: sys.permissions };
  return { key: roleKey, name: roleKey, permissions: [] };
}

export const SUPER_ADMIN_RESOLVED = { key: "SUPER_ADMIN", name: "Super Admin", permissions: ALL_PERMISSIONS as Permission[] };
