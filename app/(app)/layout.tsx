import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import KeepAlive from '@/components/layout/KeepAlive'
import { getUser, getCachedProfile } from '@/lib/dataCache'
import type { UserRole } from '@/lib/roles'
import styles from './layout.module.css'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  // Profile is cached — no extra DB call if pages also call getCachedProfile
  const profile = await getCachedProfile()
  const roles   = (profile?.roles ?? []) as UserRole[]

  return (
    <div className={styles.shell}>
      <KeepAlive />
      <Sidebar roles={roles} />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
