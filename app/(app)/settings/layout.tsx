import { getCurrentProfile, isAdmin } from '@/lib/roles'
import { redirect } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import SettingsNav from '@/components/settings/SettingsNav'
import styles from './settings.module.css'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) redirect('/dashboard')

  return (
    <>
      <Topbar title="Settings" userName={profile?.full_name ?? undefined} />
      <div className={styles.layout}>
        <SettingsNav />
        <div className={styles.content}>{children}</div>
      </div>
    </>
  )
}
