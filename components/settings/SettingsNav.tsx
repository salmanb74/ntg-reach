'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './SettingsNav.module.css'

const NAV = [
  { href: '/settings',              label: 'General',          icon: '⚙' },
  { href: '/settings/users',        label: 'Users & Roles',    icon: '👥' },
  { href: '/settings/enumerations', label: 'Lists & Values',   icon: '📋' },
  { href: '/settings/contracts',    label: 'Contract Templates', icon: '📄' },
]

export default function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className={styles.nav}>
      <div className={styles.title}>Settings</div>
      {NAV.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={`${styles.item} ${pathname === item.href ? styles.active : ''}`}
        >
          <span className={styles.icon}>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
