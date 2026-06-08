'use client'

import Link from 'next/link'
import type { Lead } from '@/lib/types'
import StageBadge from '@/components/ui/StageBadge'
import styles from './LeadsTable.module.css'

interface LeadsTableProps { leads: Lead[] }

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function LeadsTable({ leads }: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div className={styles.emptyText}>No leads found</div>
        <div className={styles.emptyHint}>Try a different search or add a new lead</div>
      </div>
    )
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Contact</th>
            <th>Company</th>
            <th className={styles.hideTablet}>City</th>
            <th>Stage</th>
            <th className={styles.hideTablet}>Source</th>
            <th>Added</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {leads.map(lead => (
            <tr key={lead.id} className={styles.row}>
              <td>
                <Link href={`/leads/${lead.id}`} className={styles.contactCell}>
                  <div className={styles.avatar}>{initials(lead.contact_name)}</div>
                  <div>
                    <div className={styles.contactName}>{lead.contact_name}</div>
                    {lead.phone && <div className={styles.contactSub}>{lead.phone}</div>}
                  </div>
                </Link>
              </td>
              <td className={styles.company}>{lead.company_name}</td>
              <td className={`${styles.city} ${styles.hideTablet}`}>{lead.city ?? '—'}</td>
              <td><StageBadge stage={lead.stage} size="sm" /></td>
              <td className={`${styles.source} ${styles.hideTablet}`}>
                {lead.source ? lead.source.replace(/_/g, ' ') : '—'}
              </td>
              <td className={styles.time}>{timeAgo(lead.created_at)}</td>
              <td>
                <Link href={`/leads/${lead.id}`} className={styles.chevron} aria-label="View lead">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
