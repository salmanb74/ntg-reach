import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import { PIPELINE_STAGES, STAGE_LABELS, STAGE_CSS, type PipelineStage } from '@/lib/types'
import FunnelChart from '@/components/analytics/FunnelChart'
import LeadsOverTimeChart from '@/components/analytics/LeadsOverTimeChart'
import ActivityBreakdown from '@/components/analytics/ActivityBreakdown'
import ConversionStats from '@/components/analytics/ConversionStats'
import styles from './dashboard.module.css'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  // ── Lead counts per stage ──
  const { data: allLeads } = await supabase
    .from('leads')
    .select('stage, created_at, source')

  const countsByStage: Record<string, number> = {}
  PIPELINE_STAGES.forEach(s => { countsByStage[s] = 0 })
  allLeads?.forEach(l => { if (l.stage) countsByStage[l.stage] = (countsByStage[l.stage] || 0) + 1 })

  const totalLeads   = allLeads?.length ?? 0
  const closedWon    = countsByStage['closed_won']  ?? 0
  const closedLost   = countsByStage['closed_lost'] ?? 0
  const closedTotal  = closedWon + closedLost
  const winRate      = closedTotal > 0 ? Math.round((closedWon / closedTotal) * 100) : 0
  const activeLeads  = totalLeads - closedWon - closedLost

  // ── Meetings & emails ──
  const { count: meetingCount } = await supabase
    .from('meetings')
    .select('*', { count: 'exact', head: true })

  const { count: emailCount } = await supabase
    .from('emails')
    .select('*', { count: 'exact', head: true })

  // ── Leads over last 8 weeks ──
  const eightWeeksAgo = new Date()
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

  const { data: recentLeads } = await supabase
    .from('leads')
    .select('created_at')
    .gte('created_at', eightWeeksAgo.toISOString())
    .order('created_at', { ascending: true })

  // Group by week
  const weekMap: Record<string, number> = {}
  recentLeads?.forEach(l => {
    const d    = new Date(l.created_at)
    const day  = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const mon  = new Date(d.setDate(diff))
    const key  = mon.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    weekMap[key] = (weekMap[key] || 0) + 1
  })
  const weeklyData = Object.entries(weekMap).map(([week, count]) => ({ week, count }))

  // ── Activity breakdown ──
  const { data: activities } = await supabase
    .from('activities')
    .select('type')

  const activityCounts: Record<string, number> = {}
  activities?.forEach(a => {
    const key = a.type.includes('email') ? 'Emails'
      : a.type.includes('whatsapp') ? 'WhatsApp'
      : a.type.includes('call')     ? 'Calls'
      : a.type.includes('meeting')  ? 'Meetings'
      : 'Notes'
    activityCounts[key] = (activityCounts[key] || 0) + 1
  })
  const activityData = Object.entries(activityCounts).map(([name, value]) => ({ name, value }))

  // ── Source breakdown ──
  const sourceMap: Record<string, number> = {}
  allLeads?.forEach(l => {
    const s = l.source ?? 'other'
    sourceMap[s] = (sourceMap[s] || 0) + 1
  })
  const sourceData = Object.entries(sourceMap)
    .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
    .sort((a, b) => b.value - a.value)

  // ── Funnel data for chart ──
  const funnelStages: PipelineStage[] = ['new','contacted','demo_scheduled','proposal_sent','negotiation','closed_won']
  const funnelData = funnelStages.map(stage => ({
    stage: STAGE_LABELS[stage],
    count: countsByStage[stage] ?? 0,
    cssKey: STAGE_CSS[stage],
  }))

  const userName = profile?.full_name ?? user?.email ?? 'User'

  return (
    <>
      <Topbar title="Dashboard" userName={userName} />
      <div className={styles.page}>

        {/* ── Stat cards ── */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Leads</div>
            <div className={styles.statValue}>{totalLeads}</div>
            <div className={styles.statSub}>{activeLeads} active</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Closed Won</div>
            <div className={styles.statValue} style={{ color: 'var(--color-success)' }}>{closedWon}</div>
            <div className={styles.statSub}>{closedLost} lost</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Win Rate</div>
            <div className={styles.statValue} style={{ color: winRate >= 50 ? 'var(--color-success)' : 'var(--color-warning)' }}>
              {winRate}%
            </div>
            <div className={styles.statSub}>of closed deals</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Meetings</div>
            <div className={styles.statValue}>{meetingCount ?? 0}</div>
            <div className={styles.statSub}>{emailCount ?? 0} emails sent</div>
          </div>
        </div>

        {/* ── Row 1: Funnel + Weekly ── */}
        <div className={styles.row}>
          <div className={styles.chartCard} style={{ flex: 1 }}>
            <div className={styles.chartTitle}>Pipeline Funnel</div>
            <FunnelChart data={funnelData} />
          </div>
          <div className={styles.chartCard} style={{ flex: 1.4 }}>
            <div className={styles.chartTitle}>Leads Added — Last 8 Weeks</div>
            <LeadsOverTimeChart data={weeklyData} />
          </div>
        </div>

        {/* ── Row 2: Activity + Source + Stage table ── */}
        <div className={styles.row}>
          <div className={styles.chartCard} style={{ flex: 1 }}>
            <div className={styles.chartTitle}>Activity Breakdown</div>
            <ActivityBreakdown data={activityData} />
          </div>
          <div className={styles.chartCard} style={{ flex: 1 }}>
            <div className={styles.chartTitle}>Leads by Source</div>
            <ActivityBreakdown data={sourceData} />
          </div>
          <div className={styles.chartCard} style={{ flex: 1 }}>
            <div className={styles.chartTitle}>Stage Breakdown</div>
            <ConversionStats stages={PIPELINE_STAGES} counts={countsByStage} total={totalLeads} />
          </div>
        </div>

      </div>
    </>
  )
}
