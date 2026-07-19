export type ConversationStatus = 'open' | 'closed'

export interface ConversationItem {
  id:              string
  tenant_id:       string
  tenant_name:     string
  title:           string | null
  status:          ConversationStatus
  created_by:      string
  assigned_to:     string | null
  assigned_name:   string | null
  created_at:      string
  last_message_at: string | null
  closed_at:       string | null
  product:         string
}

export interface TenantGroup {
  tenant_id:     string
  tenant_name:   string
  conversations: ConversationItem[]
}

export interface ChatMessage {
  id:              string
  conversation_id: string
  sender_id:       string
  sender_type:     'agent' | 'customer'
  sender_name:     string
  message_type:    'text' | 'image' | 'voice'
  content:         string | null
  file_url:        string | null
  created_at:      string
  read_at:         string | null
}

export const TEST_TENANT_ID   = 'clay_handi'
export const TEST_TENANT_NAME = 'Clay Handi'

export function conversationActivityAt(c: ConversationItem): number {
  return new Date(c.last_message_at ?? c.created_at).getTime()
}

export function sortConversationsByActivity(items: ConversationItem[]): ConversationItem[] {
  return [...items].sort((a, b) => conversationActivityAt(b) - conversationActivityAt(a))
}

/** Group by tenant; tenants and conversations ordered by last activity desc. */
export function groupConversationsByTenant(items: ConversationItem[]): TenantGroup[] {
  const sorted = sortConversationsByActivity(items)
  const map = new Map<string, TenantGroup>()

  for (const item of sorted) {
    const existing = map.get(item.tenant_id)
    if (existing) {
      existing.conversations.push(item)
    } else {
      map.set(item.tenant_id, {
        tenant_id:     item.tenant_id,
        tenant_name:   item.tenant_name,
        conversations: [item],
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const aMax = Math.max(...a.conversations.map(conversationActivityAt), 0)
    const bMax = Math.max(...b.conversations.map(conversationActivityAt), 0)
    return bMax - aMax
  })
}

export function formatLastMessageAgo(iso: string | null | undefined): string {
  if (!iso) return 'No messages yet'
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return 'No messages yet'
  if (ms < 0) return 'Just now'

  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'Last message just now'
  if (mins === 1) return 'Last message 1 min ago'
  if (mins < 60) return `Last message ${mins} mins ago`

  const hours = Math.floor(mins / 60)
  if (hours === 1) return 'Last message 1 hour ago'
  if (hours < 24) return `Last message ${hours} hours ago`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'Last message 1 day ago'
  if (days < 7) return `Last message ${days} days ago`

  return `Last message ${new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
  })}`
}
