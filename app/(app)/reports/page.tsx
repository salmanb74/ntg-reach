import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile, isManager } from '@/lib/roles'
import Topbar from '@/components/layout/Topbar'
import RepSelector from '@/components/reports/RepSelector'
import PerformanceReport from '@/components/reports/PerformanceReport'
import ManageTargets from '@/components/reports/ManageTargets'
import CurrencySwitcher from '@/components/ui/CurrencySwitcher'
import { convertAmount } from '@/lib/currency'
import styles from './reports.module.css'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { rep?: string; tab?: string; currency?: string }
}) {
  const supabase = createClient()
  const profile = await getCurrentProfile()
  const canSeeAll = isManager(profile)

  const { data: allUsers } = canSeeAll
    ? await supabase.from('profiles').select('id, full_name, email, roles').order('full_name')
    : await supabase.from('profiles').select('id, full_name, email, roles').eq('id', profile!.id)

  const selectedRepId = searchParams.rep ?? profile?.id ?? ''
  const activeTab = searchParams.tab ?? 'performance'

  // Currency settings
  const { data: settings } = await supabase.from('app_settings').select('key, value')
  const settingsMap: Record<string, string> = {}
  settings?.forEach(s => { settingsMap[s.key] = s.value })
  const inputCurrency  = settingsMap['input_currency']  ?? 'PKR'
  const viewCurrencies = (settingsMap['view_currencies'] ?? inputCurrency).split(',').map(c => c.trim())
  const selectedCurrency = searchParams.currency && viewCurrencies.includes(searchParams.currency)
    ? searchParams.currency
    : viewCurrencies[0]

  // Exchange rates
  const { data: rates } = await supabase.from('exchange_rates').select('*')
  const ratesList = rates ?? []

  const { data: targets } = await supabase
    .from('targets').select('*').eq('user_id', selectedRepId)
    .order('start_date', { ascending: false })

  const { data: closedLeads } = await supabase
    .from('leads')
    .select('id, stage, quoted_setup_fee, quoted_mrr, payment_frequency, payment_start_date, closed_at, created_by')
    .eq('stage', 'closed_won').eq('created_by', selectedRepId).not('closed_at', 'is', null)

  const { data: allLeads } = await supabase
    .from('leads')
    .select('id, stage, quoted_setup_fee, quoted_mrr, payment_frequency, created_by')
    .eq('created_by', selectedRepId)

  const selectedUser = allUsers?.find(u => u.id === selectedRepId) ?? allUsers?.[0]

  return (
    <>
      <Topbar title="Reports" userName={profile?.full_name ?? undefined} />
      <div className={styles.page}>

        {/* Rep selector — only shown to managers/admins */}
        {canSeeAll && allUsers && allUsers.length > 1 && (
          <RepSelector users={allUsers} selectedId={selectedRepId} />
        )}

        {/* Currency switcher */}
        {viewCurrencies.length > 1 && (
          <CurrencySwitcher
            viewCurrencies={viewCurrencies}
            selected={selectedCurrency}
            rates={ratesList}
          />
        )}

        {/* Tab nav */}
        <div className={styles.tabs}>
          <a
            href={`/reports?rep=${selectedRepId}&tab=performance`}
            className={`${styles.tab} ${activeTab === 'performance' ? styles.activeTab : ''}`}
          >
            Performance
          </a>
          {canSeeAll && (
            <a
              href={`/reports?rep=${selectedRepId}&tab=targets`}
              className={`${styles.tab} ${activeTab === 'targets' ? styles.activeTab : ''}`}
            >
              Manage Targets
            </a>
          )}
        </div>

        {activeTab === 'performance' && (
          <PerformanceReport
            user={selectedUser}
            targets={targets ?? []}
            closedLeads={closedLeads ?? []}
            allLeads={allLeads ?? []}
            currency={selectedCurrency}
            inputCurrency={inputCurrency}
            rates={ratesList}
          />
        )}

        {activeTab === 'targets' && canSeeAll && (
          <ManageTargets
            users={allUsers ?? []}
            targets={targets ?? []}
            selectedRepId={selectedRepId}
            currency={inputCurrency}
          />
        )}

      </div>
    </>
  )
}
