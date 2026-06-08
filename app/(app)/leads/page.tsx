import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import LeadsTable from '@/components/leads/LeadsTable'
import LeadsExportButton from '@/components/leads/LeadsExportButton'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { PIPELINE_STAGES, STAGE_LABELS, type PipelineStage } from '@/lib/types'
import styles from './leads.module.css'

interface SearchParams { q?: string; stage?: string; sort?: string }

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()
  const { q, stage, sort = 'newest' } = searchParams

  let query = supabase.from('leads').select('*')

  if (q?.trim()) {
    query = query.or(
      `contact_name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,city.ilike.%${q}%`
    )
  }
  if (stage && stage !== 'all') query = query.eq('stage', stage)
  if (sort === 'oldest') query = query.order('created_at', { ascending: true })
  else if (sort === 'name') query = query.order('contact_name', { ascending: true })
  else query = query.order('created_at', { ascending: false })

  const { data: leads } = await query
  const { count: totalCount } = await supabase.from('leads').select('*', { count: 'exact', head: true })

  return (
    <>
      <Topbar title="Leads" />
      <div className={styles.page}>
        <div className={styles.toolbar}>
          <form className={styles.searchForm} action="/leads" method="GET">
            <div className={styles.searchWrap}>
              <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input name="q" defaultValue={q} placeholder="Search by name, company, phone, email, city…" className={styles.searchInput} autoComplete="off" />
              {stage && <input type="hidden" name="stage" value={stage} />}
            </div>
            <select name="stage" defaultValue={stage || 'all'} className={styles.filterSelect}>
              <option value="all">All stages</option>
              {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
            <select name="sort" defaultValue={sort} className={styles.filterSelect}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
            </select>
            <button type="submit" className={styles.searchBtn}>Search</button>
          </form>
          <div className={styles.actions}>
            <LeadsExportButton leads={leads ?? []} />
            <Link href="/leads/import">
              <Button size="sm" variant="outline">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 5 17 10"/>
                  <line x1="12" y1="5" x2="12" y2="15"/>
                </svg>
                Import
              </Button>
            </Link>
            <Link href="/leads/new">
              <Button size="sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                New Lead
              </Button>
            </Link>
          </div>
        </div>

        <div className={styles.resultsRow}>
          <span className={styles.resultsCount}>
            {leads?.length ?? 0} lead{leads?.length !== 1 ? 's' : ''}
            {q && ` matching "${q}"`}
            {stage && stage !== 'all' && ` · ${STAGE_LABELS[stage as PipelineStage] ?? stage}`}
            {!q && (!stage || stage === 'all') && totalCount !== null && ` of ${totalCount} total`}
          </span>
          <Link href="/pipeline" className={styles.kanbanLink}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="5" height="18"/><rect x="9" y="3" width="5" height="12"/><rect x="15" y="3" width="5" height="8"/></svg>
            Kanban view
          </Link>
        </div>

        <LeadsTable leads={leads ?? []} />
      </div>
    </>
  )
}
