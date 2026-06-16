// ─── Role types — safe to import anywhere ─────────────────────
export type UserRole = 'admin' | 'manager' | 'sales_rep'

export interface UserProfile {
  id: string
  full_name: string | null
  email: string
  roles: UserRole[]
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:     'Admin',
  manager:   'Manager',
  sales_rep: 'Sales Rep',
}

// ─── Server-only helpers ───────────────────────────────────────
export async function getCurrentProfile(): Promise<UserProfile | null> {
  // Uses the cached version to avoid duplicate DB calls per request
  const { getCachedProfile } = await import('@/lib/dataCache')
  return getCachedProfile()
}

export function hasRole(profile: UserProfile | null, role: UserRole): boolean {
  if (!profile) return false
  return profile.roles?.includes(role) ?? false
}

export function isAdmin(profile: UserProfile | null): boolean {
  return hasRole(profile, 'admin')
}

export function isManager(profile: UserProfile | null): boolean {
  return hasRole(profile, 'manager') || hasRole(profile, 'admin')
}

export function canManageUsers(profile: UserProfile | null): boolean {
  return isAdmin(profile)
}

export function canViewAllReps(profile: UserProfile | null): boolean {
  return isManager(profile)
}
