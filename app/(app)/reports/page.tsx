import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile, isManager } from '@/lib/roles'
import Topbar from '@/components/layout/Topbar'
import RepSelector from '@/components/reports/RepSelector'
import PerformanceReport from '@/components/reports/PerformanceReport'
import CurrencySwitcher from '@/components/ui/CurrencySwitcher'
import { getAppSettings, getCurrentRates, getRecentRateHistory } from '@/lib/dataCache'
import styles from './reports.module.css'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { rep?: string; currency?: string }
}) {
  const supabase  = createClient()
  const profile   = await getCurrentProfile()
  const canSeeAll = isManager(profile)

  // ── Parallel fetch — settings/rates from cache ─────────────
  const [
    { data: allUsers },
    settingsMap,
    ratesList,
  ] = await Promise.all([
    canSeeAll
      ? supabase.from('profiles').select('id, full_name, email, roles').order('full_name')
      : supabase.from('profiles').select('id, full_name, email, roles').eq('id', profile!.id),
    getAppSettings(),
    getCurrentRates(),
  ])

  // ── Derived values ─────────────────────────────────────────
  const repUsers = (allUsers ?? []).filter(u =>
    (u.roles as string[] ?? []).includes('sales_rep')
  )
  const selectedRepId    = searchParams.rep ?? repUsers[0]?.id ?? profile?.id ?? ''
  const inputCurrency    = settingsMap['input_currency']  ?? 'PKR'
  const viewCurrencies   = (settingsMap['view_currencies'] ?? inputCurrency).split(',').map(c => c.trim())
  const selectedCurrency = searchParams.currency && viewCurrencies.includes(searchParams.currency)
    ? searchParams.currency
    : viewCurrencies[0]

  // ── Rate history — only fetch pairs we need ────────────────
  const historyList = await getRecentRateHistory(inputCurrency, viewCurrencies)

  // ── Rep-specific data (parallel) ───────────────────────────
  const [
    { data: targets },
    { data: closedLeads },
    { data: allLeads },
  ] = await Promise.all([
    supabase.from('targets').select('*').eq('user_id', selectedRepId)
      .order('start_date', { ascending: false }),
    supabase.from('leads')
      .select('id, stage, quoted_setup_fee, quoted_mrr, payment_frequency, payment_start_date, closed_at, created_by')
      .eq('stage', 'closed_won').eq('created_by', selectedRepId).not('closed_at', 'is', null),
    supabase.from('leads')
      .select('id, stage, quoted_setup_fee, quoted_mrr, payment_frequency, payment_start_date, closed_at, created_by')
      .eq('created_by', selectedRepId),
  ])

  const selectedUser = repUsers.find(u => u.id === selectedRepId) ?? repUsers[0]

  return (
    <>
      <Topbar title="Reports" userName={profile?.full_name ?? undefined} />
      <div className={styles.page}>
        <div className={styles.topBar}>
          {canSeeAll && repUsers.length > 0 && (
            <RepSelector users={repUsers} selectedId={selectedRepId} />
          )}
          {viewCurrencies.length > 1 && (
            <CurrencySwitcher
              viewCurrencies={viewCurrencies}
              selected={selectedCurrency}
              rates={ratesList}
            />
          )}
        </div>

        <PerformanceReport
          user={selectedUser}
          targets={targets ?? []}
          closedLeads={closedLeads ?? []}
          allLeads={allLeads ?? []}
          currency={selectedCurrency}
          inputCurrency={inputCurrency}
          rates={ratesList}
          rateHistory={historyList}
        />
      </div>
    </>
  )
}
