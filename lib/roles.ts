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

// ─── Server-only helpers — only import in Server Components ───
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, roles')
    .eq('id', user.id)
    .single()

  return data as UserProfile | null
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
