'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from './NotificationBell.module.css'

export default function NotificationBell() {
  const [count, setCount] = useState(0)
  const pathname = usePathname()

  async function fetchDueCount() {
    const supabase = createClient()
    const { count: dueCount } = await supabase
      .from('reminders')
      .select('*', { count: 'exact', head: true })
      .lte('remind_at', new Date().toISOString())
      .is('dismissed_at', null)
    setCount(dueCount ?? 0)
  }

  // Re-fetch when route changes (catches router.refresh() after dismiss/delete)
  useEffect(() => {
    fetchDueCount()
  }, [pathname])

  // Also poll every 60s for new reminders becoming due
  useEffect(() => {
    const interval = setInterval(fetchDueCount, 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Link href="/notifications" className={styles.bell} title="Notifications">
      <svg
        width="18" height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      {count > 0 && (
        <span className={styles.badge}>{count > 9 ? '9+' : count}</span>
      )}
    </Link>
  )
}
