import { createClient } from '@/lib/supabase/server'
import { getCachedProfile } from '@/lib/dataCache'
import ConversationList from '@/components/support/ConversationList'
import type { ConversationItem } from '@/components/support/types'
import { groupConversationsByTenant } from '@/components/support/types'

export default async function SupportChatsPage() {
  const supabase = createClient()

  const [profile, { data: conversations }] = await Promise.all([
    getCachedProfile(),
    supabase
      .from('support_conversations')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false }),
  ])

  const rows = conversations ?? []
  const agentIds = [
    ...new Set(
      rows
        .flatMap(c => [c.assigned_to, c.created_by])
        .filter((id): id is string => !!id)
    ),
  ]

  const { data: agents } = agentIds.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', agentIds)
    : { data: [] as { id: string; full_name: string | null; email: string }[] }

  const agentNames: Record<string, string> = {}
  for (const a of agents ?? []) {
    agentNames[a.id] = a.full_name?.trim() || a.email || 'Unknown'
  }

  const items: ConversationItem[] = rows.map(c => ({
    id:              c.id,
    tenant_id:       c.tenant_id,
    tenant_name:     c.tenant_name,
    title:           c.title,
    status:          c.status,
    created_by:      c.created_by,
    assigned_to:     c.assigned_to,
    assigned_name:   c.assigned_to ? (agentNames[c.assigned_to] ?? null) : null,
    created_at:      c.created_at,
    last_message_at: c.last_message_at ?? c.created_at,
    closed_at:       c.closed_at,
    product:         c.product,
  }))

  const groups = groupConversationsByTenant(items)

  return (
    <ConversationList
      initialGroups={groups}
      currentUserId={profile!.id}
      currentUserName={profile!.full_name?.trim() || profile!.email || 'Agent'}
    />
  )
}
