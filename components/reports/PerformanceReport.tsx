import type { Target } from '@/lib/types'
import styles from './PerformanceReport.module.css'

interface Lead {
  id: string
  stage: string
  quoted_setup_fee: number | null
  quoted_mrr: number | null
  payment_frequency: string | null
  payment_start_date: string | null
  closed_at: string | null
  created_by: string | null
}

interface User {
  id: string
  full_name: string | null
  email: string
}

interface ExchangeRate { base: string; target: string; rate: number; fetched_at: string }

interface Props {
  user:          User | undefined
  targets:       Target[]
  closedLeads:   Lead[]
  allLeads:      Lead[]
  currency:      string
  inputCurrency?: string
  rates?:        ExchangeRate[]
}

function getMRR(lead: Lead): number {
  if (!lead.quoted_mrr) return 0
  return lead.payment_frequency === 'annual'
    ? lead.quoted_mrr / 12
    : lead.quoted_mrr
}

function getRevenueInPeriod(lead: Lead, startDate: Date, endDate: Date): number {
  if (!lead.payment_start_date) return 0
  const payStart = new Date(lead.payment_start_date)
  if (payStart > endDate) return 0

  const effectiveStart = payStart > startDate ? payStart : startDate
  const msInPeriod = endDate.getTime() - effectiveStart.getTime()
  const monthsInPeriod = msInPeriod / (1000 * 60 * 60 * 24 * 30.44)

  const mrr = getMRR(lead)
  const setupFee = payStart >= startDate && payStart <= endDate
    ? (lead.quoted_setup_fee ?? 0)
    : 0

  return setupFee + mrr * Math.max(monthsInPeriod, 0)
}

function ProgressBar({ value, target, color = 'var(--color-primary)' }: {
  value: number
  target: number
  color?: string
}) {
  const pct = target > 0 ? Math.min(Math.round((value / target) * 100), 100) : 0
  const over = target > 0 && value > target
  return (
    <div className={styles.progressWrap}>
      <div className={styles.progressTrack}>
        <div
          className={styles.progressBar}
          style={{ width: `${pct}%`, background: over ? 'var(--color-success)' : color }}
        />
      </div>
      <span className={styles.progressPct} style={{ color: over ? 'var(--color-success)' : 'var(--color-text-2)' }}>
        {pct}%
      </span>
    </div>
  )
}

function fmt(n: number, currency: string) {
  if (n >= 1_000_000) return `${currency} ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${currency} ${(n / 1_000).toFixed(0)}K`
  return `${currency} ${n.toFixed(0)}`
}

export default function PerformanceReport({ user, targets, closedLeads, allLeads, currency, inputCurrency = 'PKR', rates = [] }: Props) {
  function convert(amount: number): number {
    if (currency === inputCurrency || !rates.length) return amount
    const rate = rates.find(r => r.base === inputCurrency && r.target === currency)
    return rate ? amount * rate.rate : amount
  }
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? '?').toUpperCase()

  // Pipeline stats
  const ACTIVE_STAGES = new Set(['new','contacted','demo_scheduled','proposal_sent','negotiation'])
  const activeLeads = allLeads.filter(l => ACTIVE_STAGES.has(l.stage))
  const pipelineValue = convert(activeLeads.reduce((sum, l) => sum + (l.quoted_setup_fee ?? 0) + getMRR(l), 0))
  const totalLeads = allLeads.length
  const totalClosed = closedLeads.length

  if (targets.length === 0) {
    return (
      <div>
        <div className={styles.repCard}>
          <div className={styles.repAvatar}>{initials}</div>
          <div>
            <div className={styles.repName}>{user?.full_name ?? user?.email ?? '—'}</div>
            <div className={styles.repEmail}>{user?.email}</div>
          </div>
          <div className={styles.repStats}>
            <div className={styles.repStat}><div className={styles.repStatNum}>{totalLeads}</div><div className={styles.repStatLbl}>Total Leads</div></div>
            <div className={styles.repStat}><div className={styles.repStatNum}>{totalClosed}</div><div className={styles.repStatLbl}>Closed Won</div></div>
            <div className={styles.repStat}><div className={styles.repStatNum}>{fmt(pipelineValue, currency)}</div><div className={styles.repStatLbl}>Pipeline Value</div></div>
          </div>
        </div>
        <div className={styles.noTargets}>
          No targets set for this rep yet. Go to <strong>Manage Targets</strong> tab to add one.
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      {/* Rep header */}
      <div className={styles.repCard}>
        <div className={styles.repAvatar}>{initials}</div>
        <div>
          <div className={styles.repName}>{user?.full_name ?? user?.email ?? '—'}</div>
          <div className={styles.repEmail}>{user?.email}</div>
        </div>
        <div className={styles.repStats}>
          <div className={styles.repStat}><div className={styles.repStatNum}>{totalLeads}</div><div className={styles.repStatLbl}>Total Leads</div></div>
          <div className={styles.repStat}><div className={styles.repStatNum}>{totalClosed}</div><div className={styles.repStatLbl}>Closed Won</div></div>
          <div className={styles.repStat}><div className={styles.repStatNum}>{fmt(pipelineValue, currency)}</div><div className={styles.repStatLbl}>Pipeline Value</div></div>
        </div>
      </div>

      {/* Target periods */}
      {targets.map(target => {
        const start = new Date(target.start_date)
        const end   = new Date(target.end_date)
        end.setHours(23, 59, 59)

        // Leads closed in period
        const leadsInPeriod = closedLeads.filter(l => {
          if (!l.closed_at) return false
          const d = new Date(l.closed_at)
          return d >= start && d <= end
        })

        const leadsCount = leadsInPeriod.length
        const setupFees  = convert(leadsInPeriod.reduce((s, l) => s + (l.quoted_setup_fee ?? 0), 0))
        const mrr        = convert(leadsInPeriod.reduce((s, l) => s + getMRR(l), 0))
        const revenue    = convert(leadsInPeriod.reduce((s, l) => s + getRevenueInPeriod(l, start, end), 0))

        // Convert targets from input currency to view currency for fair comparison
        const setupFeeTarget  = target.setup_fee_target ? convert(target.setup_fee_target) : null
        const mrrTarget       = target.mrr_target       ? convert(target.mrr_target)       : null
        const revenueTarget   = target.revenue_target   ? convert(target.revenue_target)   : null

        const now = new Date()
        const isActive  = now >= start && now <= end
        const isPast    = now > end
        const isFuture  = now < start

        return (
          <div key={target.id} className={`${styles.targetCard} ${isActive ? styles.activeTarget : ''}`}>
            <div className={styles.targetHeader}>
              <div>
                <div className={styles.targetLabel}>{target.label}</div>
                <div className={styles.targetDates}>
                  {start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' → '}
                  {end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <span className={`${styles.periodBadge} ${isActive ? styles.activeBadge : isPast ? styles.pastBadge : styles.futureBadge}`}>
                {isActive ? 'Active' : isPast ? 'Completed' : 'Upcoming'}
              </span>
              <span className={styles.currencyBadge}>{currency}</span>
            </div>

            <div className={styles.metricsGrid}>
              {target.leads_target && (
                <div className={styles.metric}>
                  <div className={styles.metricHeader}>
                    <span className={styles.metricLabel}>Leads Closed</span>
                    <span className={styles.metricValues}>
                      <strong>{leadsCount}</strong> / {target.leads_target}
                    </span>
                  </div>
                  <ProgressBar value={leadsCount} target={target.leads_target} />
                </div>
              )}

              {setupFeeTarget && (
                <div className={styles.metric}>
                  <div className={styles.metricHeader}>
                    <span className={styles.metricLabel}>Setup Fees</span>
                    <span className={styles.metricValues}>
                      <strong>{fmt(setupFees, currency)}</strong> / {fmt(setupFeeTarget, currency)}
                    </span>
                  </div>
                  <ProgressBar value={setupFees} target={setupFeeTarget} />
                </div>
              )}

              {mrrTarget && (
                <div className={styles.metric}>
                  <div className={styles.metricHeader}>
                    <span className={styles.metricLabel}>MRR Added</span>
                    <span className={styles.metricValues}>
                      <strong>{fmt(mrr, currency)}</strong> / {fmt(mrrTarget, currency)}
                    </span>
                  </div>
                  <ProgressBar value={mrr} target={mrrTarget} color="var(--stage-won-bar)" />
                </div>
              )}

              {revenueTarget && (
                <div className={styles.metric}>
                  <div className={styles.metricHeader}>
                    <span className={styles.metricLabel}>Revenue</span>
                    <span className={styles.metricValues}>
                      <strong>{fmt(revenue, currency)}</strong> / {fmt(revenueTarget, currency)}
                    </span>
                  </div>
                  <ProgressBar value={revenue} target={revenueTarget} color="var(--stage-proposal-bar)" />
                </div>
              )}
            </div>

            {leadsInPeriod.length > 0 && (
              <div className={styles.closedList}>
                <div className={styles.closedListTitle}>Closed deals in this period</div>
                {leadsInPeriod.map(l => (
                  <div key={l.id} className={styles.closedRow}>
                    <span className={styles.closedDot} />
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-2)' }}>Lead #{l.id.slice(0, 8)}</span>
                    {l.quoted_setup_fee && <span className={styles.closedAmt}>{fmt(l.quoted_setup_fee, currency)} setup</span>}
                    {l.quoted_mrr && <span className={styles.closedAmt}>{fmt(getMRR(l), currency)}/mo</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
