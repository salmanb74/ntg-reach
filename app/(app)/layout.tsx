import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import styles from './layout.module.css'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch profile for display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
