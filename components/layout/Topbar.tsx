'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './Topbar.module.css'

interface TopbarProps {
  title: string
  userName?: string
}

export default function Topbar({ title, userName }: TopbarProps) {
  const router = useRouter()

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className={styles.topbar}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.right}>
        <button
          className={styles.avatar}
          onClick={handleSignOut}
          title="Sign out"
          aria-label="Sign out"
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
