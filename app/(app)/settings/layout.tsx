import { isAdmin, isManager } from '@/lib/roles'
import { getCachedProfile } from '@/lib/dataCache'
import { redirect } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import SecondaryNav from '@/components/layout/SecondaryNav'
import type { SecondaryNavItem } from '@/components/layout/SecondaryNav'
import styles from './settings.module.css'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCachedProfile()
  if (!isManager(profile)) redirect('/dashboard')

  const roles = profile?.roles ?? []
  const admin   = isAdmin(profile)
  const manager = isManager(profile)

  const navItems: SecondaryNavItem[] = [
    ...(admin   ? [{ href: '/settings',                       label: 'General',                icon: '⚙' }] : []),
    ...(admin   ? [{ href: '/settings/users',                 label: 'Users & Roles',          icon: '👥' }] : []),
    ...(admin   ? [{ href: '/settings/enumerations',          label: 'Lists & Values',         icon: '📋' }] : []),
    ...(manager ? [{ href: '/settings/targets',               label: 'Targets',                icon: '🎯' }] : []),
    ...(manager ? [{ href: '/settings/contracts',             label: 'Contract Templates',     icon: '📄' }] : []),
    ...(manager ? [{ href: '/settings/quotation-templates',   label: 'Quotation Templates',   icon: '💰' }] : []),
  ]

  return (
    <>
      <Topbar title="Settings" userName={profile?.full_name ?? undefined} />
      <div className={styles.layout}>
        <SecondaryNav title="Settings" items={navItems} />
        <div className={styles.content}>{children}</div>
      </div>
    </>
  )
}
