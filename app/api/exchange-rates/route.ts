import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    // Get configured view currencies
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['input_currency', 'view_currencies'])

    const settingsMap: Record<string, string> = {}
    settings?.forEach(s => { settingsMap[s.key] = s.value })

    const inputCurrency = settingsMap['input_currency'] ?? 'PKR'
    const viewCurrencies = (settingsMap['view_currencies'] ?? 'PKR,USD').split(',').map(c => c.trim())

    // Get all unique currencies we need
    const allCurrencies = Array.from(new Set([inputCurrency, ...viewCurrencies]))

    // Frankfurter doesn't support PKR - we'll use USD as intermediary for PKR
    // Fetch rates with USD as base (works for all major currencies)
    const targets = allCurrencies.filter(c => c !== 'USD').join(',')
    const url = `https://api.frankfurter.app/latest?from=USD&to=${targets || 'EUR'}`

    const res = await fetch(url, { next: { revalidate: 3600 } }) // cache 1 hour
    if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`)

    const data = await res.json()
    const rates: Record<string, number> = { USD: 1, ...data.rates }

    // Upsert all pairs we need
    const upserts = []
    for (const from of allCurrencies) {
      for (const to of allCurrencies) {
        if (from === to) continue
        const fromRate = rates[from] ?? 1
        const toRate   = rates[to]   ?? 1
        const rate     = toRate / fromRate
        upserts.push({ base: from, target: to, rate, fetched_at: new Date().toISOString() })
      }
    }

    if (upserts.length > 0) {
      await supabase
        .from('exchange_rates')
        .upsert(upserts, { onConflict: 'base,target' })
    }

    return NextResponse.json({ ok: true, rates, updatedAt: new Date().toISOString() })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
