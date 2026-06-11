'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import styles from './RepSelector.module.css'

interface User {
  id: string
  full_name: string | null
  email: string
}

export default function RepSelector({ users, selectedId }: { users: User[]; selectedId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('rep', e.target.value)
    router.push(`/reports?${params.toString()}`)
  }

  return (
    <div className={styles.wrap}>
      <label className={styles.label}>Viewing report for:</label>
      <select className={styles.select} value={selectedId} onChange={handleChange}>
        {users.map(u => (
          <option key={u.id} value={u.id}>
            {u.full_name ?? u.email}
          </option>
        ))}
      </select>
    </div>
  )
}
