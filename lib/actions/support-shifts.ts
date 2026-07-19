'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCachedProfile } from '@/lib/dataCache'
import { isCsAdmin } from '@/lib/roles'
import {
  DEFAULT_OFFLINE_MESSAGE,
  type OnDutyAgent,
} from '@/lib/support/shifts'

async function requireCsAdmin() {
  const profile = await getCachedProfile()
  if (!isCsAdmin(profile)) throw new Error('Only CS admins can manage shifts')
  return profile!
}

export async function createShift(agentId: string, startAt: string, endAt: string) {
  const profile = await requireCsAdmin()
  const supabase = createClient()

  const start = new Date(startAt)
  const end = new Date(endAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid date/time')
  }
  if (end <= start) throw new Error('End time must be after start time')

  const { error } = await supabase.from('support_shifts').insert({
    agent_id:   agentId,
    start_at:   start.toISOString(),
    end_at:     end.toISOString(),
    created_by: profile.id,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/support/calendar')
}

/** Transfer a shift to another agent. */
export async function updateShift(id: string, agentId: string) {
  await requireCsAdmin()
  const supabase = createClient()

  const { error } = await supabase
    .from('support_shifts')
    .update({ agent_id: agentId })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/support/calendar')
}

export async function deleteShift(id: string) {
  await requireCsAdmin()
  const supabase = createClient()

  const { error } = await supabase.from('support_shifts').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/support/calendar')
}

/** Agent whose shift covers "now", or null if coverage gap. */
export async function getCurrentOnDuty(): Promise<OnDutyAgent | null> {
  const supabase = createClient()
  const now = new Date().toISOString()

  const { data: shift, error } = await supabase
    .from('support_shifts')
    .select('id, agent_id, start_at, end_at')
    .lte('start_at', now)
    .gte('end_at', now)
    .order('start_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!shift) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', shift.agent_id)
    .maybeSingle()

  return {
    shift_id:   shift.id,
    agent_id:   shift.agent_id,
    agent_name: profile?.full_name?.trim() || profile?.email || 'Agent',
    start_at:   shift.start_at,
    end_at:     shift.end_at,
  }
}

export async function getSupportOfflineMessage(): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'support_offline_message')
    .maybeSingle()

  const value = data?.value?.trim()
  return value || DEFAULT_OFFLINE_MESSAGE
}

export async function updateSupportOfflineMessage(message: string) {
  await requireCsAdmin()
  const supabase = createClient()
  const value = message.trim() || DEFAULT_OFFLINE_MESSAGE

  const { error } = await supabase
    .from('app_settings')
    .upsert({
      key:        'support_offline_message',
      value,
      updated_at: new Date().toISOString(),
    })

  if (error) throw new Error(error.message)
  revalidatePath('/support/settings')
  revalidatePath('/support/chats')
}

/** Whether anyone is on duty right now (for chat offline banner). */
export async function getSupportCoverageState(): Promise<{
  onDuty: OnDutyAgent | null
  offlineMessage: string
}> {
  const [onDuty, offlineMessage] = await Promise.all([
    getCurrentOnDuty(),
    getSupportOfflineMessage(),
  ])
  return { onDuty, offlineMessage }
}
