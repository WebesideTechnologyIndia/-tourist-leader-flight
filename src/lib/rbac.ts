/**
 * Role-Based Access Control for Tourist Leader.
 * Roles are stored in the DB (dynamic) and map to a fixed catalog of permissions.
 * SUPER_ADMIN (ADMIN_EMAILS allowlist) always has every permission.
 */
export type Permission =
  | "dashboard.view"
  | "bookings.view"
  | "packages.view"
  | "packages.manage"
  | "enquiries.view"
  | "enquiries.manage"
  | "tickets.view"
  | "tickets.manage"
  | "users.view"
  | "users.manage"
  | "users.manage_roles"
  | "roles.manage"
  | "settings.manage"
  | "settlements.manage";

export interface PermissionGroup { title: string; items: { key: Permission; label: string }[] }

export const PERMISSION_GROUPS: PermissionGroup[] = [
  { title: "Dashboard", items: [{ key: "dashboard.view", label: "View dashboard" }] },
  { title: "Bookings", items: [{ key: "bookings.view", label: "View bookings" }] },
  { title: "Holiday Packages", items: [
    { key: "packages.view", label: "View packages" },
    { key: "packages.manage", label: "Create / edit / delete packages" },
  ] },
  { title: "Package Enquiries", items: [
    { key: "enquiries.view", label: "View enquiries" },
    { key: "enquiries.manage", label: "Update enquiry status" },
  ] },
  { title: "Support Tickets", items: [
    { key: "tickets.view", label: "View tickets" },
    { key: "tickets.manage", label: "Reply & update tickets" },
  ] },
  { title: "Users", items: [
    { key: "users.view", label: "View users" },
    { key: "users.manage", label: "Add / edit / delete users" },
    { key: "users.manage_roles", label: "Assign roles to users" },
  ] },
  { title: "Roles & Permissions", items: [{ key: "roles.manage", label: "Manage roles & permissions" }] },
  { title: "Settings & Settlements", items: [
    { key: "settings.manage", label: "Manage billing & GST settings" },
    { key: "settlements.manage", label: "View wallets & settle agent commission" },
  ] },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export const PERMISSION_LABEL: Record<string, string> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label]))
);

/** Built-in roles seeded into the DB on first run. SUPER_ADMIN bypasses the DB (always full). */
export const SYSTEM_ROLES: { key: string; name: string; description: string; permissions: Permission[] }[] = [
  { key: "SUPER_ADMIN", name: "Super Admin", description: "Full access to everything. Cannot be edited or removed.", permissions: ALL_PERMISSIONS },
  { key: "ADMIN", name: "Admin", description: "Manage content, bookings, enquiries and tickets.", permissions: [
    "dashboard.view", "bookings.view", "packages.view", "packages.manage",
    "enquiries.view", "enquiries.manage", "tickets.view", "tickets.manage", "users.view",
    "settings.manage", "settlements.manage",
  ] },
  { key: "AGENT", name: "Agent", description: "Sales & support desk — works leads, bookings and tickets on behalf of customers.", permissions: [
    "dashboard.view", "bookings.view", "enquiries.view", "enquiries.manage", "tickets.view", "tickets.manage",
  ] },
  { key: "USER", name: "User", description: "Standard customer. No admin access.", permissions: [] },
];

export const SYSTEM_ROLE_KEYS = SYSTEM_ROLES.map((r) => r.key);

export function hasPermission(perms: string[] | undefined, p: Permission): boolean {
  return !!perms && perms.includes(p);
}
/** A role grants back-office access if it has at least one permission. */
export function grantsAdminAccess(perms: string[] | undefined): boolean {
  return !!perms && perms.length > 0;
}

/** Permissions only the admin tier holds. A role with any of these → admin (uses /admin); otherwise it's an agent (uses /agent). */
export const ADMIN_ONLY_PERMISSIONS: Permission[] = ["packages.manage", "users.view", "users.manage", "users.manage_roles", "roles.manage", "settings.manage", "settlements.manage"];

/** Admin tier = has an admin-only permission. Agents (tickets/enquiries/bookings only) are NOT admin tier. */
export function isAdminTier(perms: string[] | undefined): boolean {
  return !!perms && ADMIN_ONLY_PERMISSIONS.some((p) => perms.includes(p));
}
/** Tier label for routing: "admin" → /admin, "agent" → /agent, "none" → no back-office. */
export function accessTier(perms: string[] | undefined): "admin" | "agent" | "none" {
  if (isAdminTier(perms)) return "admin";
  if (grantsAdminAccess(perms)) return "agent";
  return "none";
}
