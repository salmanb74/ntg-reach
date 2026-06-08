'use client'

import Button from '@/components/ui/Button'
import { exportLeadsToExcel } from '@/lib/exportLeads'
import type { Lead } from '@/lib/types'

export default function LeadsExportButton({ leads }: { leads: Lead[] }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => exportLeadsToExcel(leads)}
      disabled={leads.length === 0}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Export
    </Button>
  )
}
