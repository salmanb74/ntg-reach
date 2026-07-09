'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Sidebar.module.css'

interface NavItem {
  href:     string
  label:    string
  svgPath:  string
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', svgPath: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z' },
  { href: '/leads',     label: 'Leads',     svgPath: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { href: '/pipeline',  label: 'Pipeline',  svgPath: 'M3 3h5v18H3zM9 3h5v12H9zM15 3h5v8h-5z' },
  { href: '/reports',   label: 'Reports',   svgPath: 'M18 20V10M12 20V4M6 20v-6' },
  { href: '/calendar',  label: 'Calendar',  svgPath: 'M3 9h18M8 3v3m8-3v3M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z' },
  { href: '/activity', label: 'Activity', svgPath: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },  
  { href: '/settings',  label: 'Settings',  svgPath: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.071-3c0-.34-.027-.674-.08-1l2.116-1.65-2-3.464-2.49.998A7.002 7.002 0 0 0 14.5 5.8L14 3h-4l-.5 2.8a7.002 7.002 0 0 0-2.117 1.088L4.893 5.89l-2 3.464L4.99 11c-.053.326-.08.66-.08 1s.027.674.08 1L2.893 14.65l2 3.464 2.49-.998A7.002 7.002 0 0 0 9.5 18.2L10 21h4l.5-2.8a7.002 7.002 0 0 0 2.117-1.088l2.49.998 2-3.464L18.99 13c.053-.326.08-.66.08-1z', adminOnly: true },
]

interface Props {
  roles: string[]
}

export default function Sidebar({ roles = [] }: Props) {
  const pathname  = usePathname()
  const isAdmin   = roles.includes('admin')
  const isManager = roles.includes('manager') || isAdmin

  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly) return isAdmin || isManager
    return true
  })

  return (
    <nav className={styles.sidebar} aria-label="Main navigation">
      <div className={styles.logoMark} aria-label="NTG Reach">NR</div>

      <ul className={styles.navList} role="list">
        {visibleItems.map(item => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.75"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={item.svgPath} />
                </svg>
              </Link>
            </li>
          )
        })}
      </ul>


      <div className={styles.bottomSection}>
        <Link
          href="/profile"
          className={`${styles.navItem} ${pathname === '/profile' ? styles.active : ''}`}
          title="Profile" aria-label="Profile"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.75"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
          </svg>
        </Link>
      </div>
    </nav>
  )
}
