import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * These functions use React's cache() so they execute only once per
 * request cycle even if called from multiple server components.
 * app_settings and exchange_rates almost never change so this is safe.
 */

export const getAppSettings = cache(async (): Promise<Record<string, string>> => {
  const supabase = createClient()
  const { data } = await supabase.from('app_settings').select('key, value')
  const map: Record<string, string> = {}
  ;(data ?? []).forEach(s => { map[s.key] = s.value })
  return map
})

export const getCurrentRates = cache(async () => {
  const supabase = createClient()
  const { data } = await supabase.from('exchange_rates').select('*')
  return data ?? []
})

export const getRecentRateHistory = cache(async (inputCurrency: string, viewCurrencies: string[]) => {
  const supabase = createClient()
  const twoYearsAgo = new Date()
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

  // Only fetch the pairs we actually need, not the entire table
  const pairs = viewCurrencies
    .filter(c => c !== inputCurrency)
    .flatMap(c => [
      `${inputCurrency},${c}`,
      `${c},${inputCurrency}`,
    ])

  if (pairs.length === 0) return []

  const { data } = await supabase
    .from('exchange_rate_history')
    .select('base, target, rate, rate_date')
    .gte('rate_date', twoYearsAgo.toISOString().split('T')[0])
    .order('rate_date', { ascending: false })

  return data ?? []
})

export const getInputCurrency = cache(async (): Promise<string> => {
  const settings = await getAppSettings()
  return settings['input_currency'] ?? 'PKR'
})

export const getViewCurrencies = cache(async (): Promise<string[]> => {
  const settings = await getAppSettings()
  const input = settings['input_currency'] ?? 'PKR'
  return (settings['view_currencies'] ?? input).split(',').map(c => c.trim())
})
