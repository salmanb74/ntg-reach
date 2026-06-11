'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import styles from './ProfileClient.module.css'

type UserRole = 'admin' | 'manager' | 'sales_rep'

const ROLE_LABELS: Record<UserRole, string> = {
  admin:     'Admin',
  manager:   'Manager',
  sales_rep: 'Sales Rep',
}

interface Profile {
  id: string
  full_name: string | null
  email: string
  roles: UserRole[]
}

export default function ProfileClient({ profile }: { profile: Profile | null }) {
  const router = useRouter()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nameMsg, setNameMsg] = useState<string | null>(null)
  const [pwMsg, setPwMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (profile?.email?.[0] ?? '?').toUpperCase()

  async function handleSaveName() {
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', profile!.id)
      if (error) {
        setNameMsg('Error: ' + error.message)
      } else {
        setNameMsg('Saved successfully')
        router.refresh()
        setTimeout(() => setNameMsg(null), 2000)
      }
    })
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      setPwMsg('New passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setPwMsg('Password must be at least 8 characters.')
      return
    }
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setPwMsg('Error: ' + error.message)
      } else {
        setPwMsg('Password updated successfully')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setPwMsg(null), 2000)
      }
    })
  }

  return (
    <div className={styles.wrap}>
      {/* Avatar */}
      <div className={styles.avatarRow}>
        <div className={styles.avatar}>{initials}</div>
        <div>
          <div className={styles.email}>{profile?.email}</div>
          <div className={styles.roles}>
            {(profile?.roles ?? ['sales_rep']).map(r => (
              <span key={r} className={styles.roleBadge}>{ROLE_LABELS[r]}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Name */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Display Name</div>
        <div className={styles.field}>
          <input
            className={styles.input}
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Your full name"
          />
        </div>
        {nameMsg && (
          <div className={`${styles.msg} ${nameMsg.startsWith('Error') ? styles.error : styles.success}`}>
            {nameMsg}
          </div>
        )}
        <button className={styles.saveBtn} onClick={handleSaveName} disabled={isPending}>
          Save Name
        </button>
      </div>

      {/* Password */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Change Password</div>
        <div className={styles.field}>
          <label className={styles.label}>New Password</label>
          <input
            type="password"
            className={styles.input}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Min 8 characters"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Confirm New Password</label>
          <input
            type="password"
            className={styles.input}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
          />
        </div>
        {pwMsg && (
          <div className={`${styles.msg} ${pwMsg.startsWith('Error') || pwMsg.includes('match') || pwMsg.includes('least') ? styles.error : styles.success}`}>
            {pwMsg}
          </div>
        )}
        <button
          className={styles.saveBtn}
          onClick={handleChangePassword}
          disabled={isPending || !newPassword || !confirmPassword}
        >
          Update Password
        </button>
      </div>
    </div>
  )
}
