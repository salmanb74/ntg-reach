import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCachedProfile } from '@/lib/dataCache'
import { isCsAdmin } from '@/lib/roles'
import SimulatorClient from '@/components/support/SimulatorClient'
import type { ConversationItem } from '@/components/support/types'
import { TEST_TENANT_ID, sortConversationsByActivity } from '@/components/support/types'

export default async function SupportSimulatorPage() {
  const profile = await getCachedProfile()
  if (!isCsAdmin(profile)) redirect('/support/chats')

  const supabase = createClient()

  const { data: conversations } = await supabase
    .from('support_conversations')
    .select('*')
    .eq('tenant_id', TEST_TENANT_ID)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  const items: ConversationItem[] = sortConversationsByActivity(
    (conversations ?? []).map(c => ({
      id:              c.id,
      tenant_id:       c.tenant_id,
      tenant_name:     c.tenant_name,
      title:           c.title,
      status:          c.status,
      created_by:      c.created_by,
      assigned_to:     c.assigned_to,
      assigned_name:   null,
      created_at:      c.created_at,
      last_message_at: c.last_message_at ?? c.created_at,
      closed_at:       c.closed_at,
      product:         c.product,
    }))
  )

  return (
    <SimulatorClient
      initialConversations={items}
      currentUserId={profile!.id}
    />
  )
}
