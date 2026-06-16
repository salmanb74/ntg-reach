import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import KeepAlive from '@/components/layout/KeepAlive'
import styles from './layout.module.css'
import type { UserRole } from '@/lib/roles'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, roles')
    .eq('id', user.id)
    .single()

  const roles = (profile?.roles ?? []) as UserRole[]

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
