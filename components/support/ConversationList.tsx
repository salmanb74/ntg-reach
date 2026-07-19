'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient, ensureRealtimeAuth } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import ConfirmModal from '@/components/modals/ConfirmModal'
import ChatWindow from './ChatWindow'
import type { ConversationItem, TenantGroup } from './types'
import {
  TEST_TENANT_ID,
  TEST_TENANT_NAME,
  formatLastMessageAgo,
  groupConversationsByTenant,
} from './types'
import styles from './ConversationList.module.css'

interface Props {
  initialGroups:   TenantGroup[]
  currentUserId:   string
  currentUserName: string
}

export default function ConversationList({
  initialGroups,
  currentUserId,
  currentUserName,
}: Props) {
  const [groups, setGroups] = useState(initialGroups)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialGroups[0]?.conversations[0]?.id ?? null
  )
  const [unreadIds, setUnreadIds] = useState<Set<string>>(() => new Set())
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedIdRef = useRef(selectedId)
  selectedIdRef.current = selectedId

  const flat = groups.flatMap(g => g.conversations)
  const selected = flat.find(c => c.id === selectedId) ?? null

  const bumpActivity = useCallback((conversationId: string, at: string) => {
    setGroups(prev => {
      const all = prev.flatMap(g => g.conversations).map(c =>
        c.id === conversationId ? { ...c, last_message_at: at } : c
      )
      return groupConversationsByTenant(all)
    })
    if (conversationId !== selectedIdRef.current) {
      setUnreadIds(prev => {
        if (prev.has(conversationId)) return prev
        const next = new Set(prev)
        next.add(conversationId)
        return next
      })
    }
  }, [])

  // Realtime list sync — enable support_conversations in Database → Replication
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function setup() {
      await ensureRealtimeAuth(supabase)
      if (cancelled) return

      channel = supabase
        .channel('support-conversations-list')
        .on(
          'postgres_changes',
          {
            event:  'UPDATE',
            schema: 'public',
            table:  'support_conversations',
          },
          (payload) => {
            const row = payload.new as ConversationItem & {
              last_message_at?: string | null
              title?: string | null
              status?: ConversationItem['status']
              assigned_to?: string | null
            }

            setGroups(prev => {
              const all = prev.flatMap(g => g.conversations)
              const exists = all.some(c => c.id === row.id)
              if (!exists) return prev

              const next = all.map(c =>
                c.id === row.id
                  ? {
                      ...c,
                      title:           row.title ?? c.title,
                      status:          row.status ?? c.status,
                      assigned_to:     row.assigned_to !== undefined ? row.assigned_to : c.assigned_to,
                      last_message_at: row.last_message_at ?? c.last_message_at,
                      closed_at:       row.closed_at !== undefined ? row.closed_at : c.closed_at,
                    }
                  : c
              )
              return groupConversationsByTenant(next)
            })

            if (
              row.id !== selectedIdRef.current &&
              row.last_message_at
            ) {
              setUnreadIds(prev => {
                if (prev.has(row.id)) return prev
                const next = new Set(prev)
                next.add(row.id)
                return next
              })
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event:  'INSERT',
            schema: 'public',
            table:  'support_conversations',
          },
          (payload) => {
            const row = payload.new as ConversationItem
            setGroups(prev => {
              const all = prev.flatMap(g => g.conversations)
              if (all.some(c => c.id === row.id)) return prev
              const item: ConversationItem = {
                id:              row.id,
                tenant_id:       row.tenant_id,
                tenant_name:     row.tenant_name,
                title:           row.title,
                status:          row.status,
                created_by:      row.created_by,
                assigned_to:     row.assigned_to,
                assigned_name:   null,
                created_at:      row.created_at,
                last_message_at: row.last_message_at ?? row.created_at,
                closed_at:       row.closed_at,
                product:         row.product,
              }
              return groupConversationsByTenant([item, ...all])
            })
            if (row.id !== selectedIdRef.current) {
              setUnreadIds(prev => new Set(prev).add(row.id))
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event:  'DELETE',
            schema: 'public',
            table:  'support_conversations',
          },
          (payload) => {
            const row = payload.old as { id?: string }
            if (!row.id) return
            setGroups(prev => {
              const remaining = prev.flatMap(g => g.conversations).filter(c => c.id !== row.id)
              return groupConversationsByTenant(remaining)
            })
            setUnreadIds(prev => {
              if (!prev.has(row.id!)) return prev
              const next = new Set(prev)
              next.delete(row.id!)
              return next
            })
            if (selectedIdRef.current === row.id) {
              setSelectedId(null)
            }
          }
        )
        .subscribe()
    }

    void setup()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  async function handleNewConversation() {
    setError(null)
    setCreating(true)
    const supabase = createClient()
    const { data, error: insertError } = await supabase
      .from('support_conversations')
      .insert({
        tenant_id:   TEST_TENANT_ID,
        tenant_name: TEST_TENANT_NAME,
        status:      'open',
        created_by:  currentUserId,
        title:       null,
      })
      .select('*')
      .single()

    setCreating(false)

    if (insertError || !data) {
      setError(insertError?.message ?? 'Failed to create conversation')
      return
    }

    const now = data.last_message_at ?? data.created_at
    const item: ConversationItem = {
      id:              data.id,
      tenant_id:       data.tenant_id,
      tenant_name:     data.tenant_name,
      title:           data.title,
      status:          data.status,
      created_by:      data.created_by,
      assigned_to:     data.assigned_to,
      assigned_name:   null,
      created_at:      data.created_at,
      last_message_at: now,
      closed_at:       data.closed_at,
      product:         data.product,
    }

    setGroups(prev => {
      const all = [item, ...prev.flatMap(g => g.conversations)]
      return groupConversationsByTenant(all)
    })
    setSelectedId(item.id)
    setUnreadIds(prev => {
      const next = new Set(prev)
      next.delete(item.id)
      return next
    })
    setListOpen(false)
  }

  function handleTitleChange(id: string, title: string | null) {
    setGroups(prev =>
      prev.map(g => ({
        ...g,
        conversations: g.conversations.map(c =>
          c.id === id ? { ...c, title } : c
        ),
      }))
    )
  }

  function requestDelete(id: string) {
    const conv = flat.find(c => c.id === id)
    setPendingDelete({
      id,
      label: conv?.title?.trim() || 'New Chat',
    })
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const { id } = pendingDelete

    setError(null)
    setDeletingId(id)
    const supabase = createClient()
    const { error: deleteError } = await supabase
      .from('support_conversations')
      .delete()
      .eq('id', id)

    setDeletingId(null)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    const remaining = flat.filter(c => c.id !== id)
    setGroups(groupConversationsByTenant(remaining))
    setUnreadIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    if (selectedId === id) {
      setSelectedId(remaining[0]?.id ?? null)
    }
    setPendingDelete(null)
  }

  function selectConversation(id: string) {
    setSelectedId(id)
    setUnreadIds(prev => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setListOpen(false)
  }

  return (
    <div className={styles.shell}>
      {pendingDelete && (
        <ConfirmModal
          title="Delete conversation"
          message={`Delete “${pendingDelete.label}”? All messages in this chat will be removed. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          loading={deletingId === pendingDelete.id}
          onConfirm={confirmDelete}
          onClose={() => {
            if (deletingId) return
            setPendingDelete(null)
          }}
        />
      )}
      {listOpen && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close conversation list"
          onClick={() => setListOpen(false)}
        />
      )}

      <aside className={`${styles.listPanel} ${listOpen ? styles.listOpen : ''}`}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>Conversations</h2>
          <div className={styles.listHeaderActions}>
            <Button
              variant="primary"
              size="sm"
              onClick={handleNewConversation}
              disabled={creating}
            >
              {creating ? 'Creating…' : 'New Conversation'}
            </Button>
            <button
              type="button"
              className={styles.closeListBtn}
              onClick={() => setListOpen(false)}
              aria-label="Close conversation list"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.listScroll}>
          {groups.length === 0 && (
            <p className={styles.empty}>No conversations yet. Start one above.</p>
          )}

          {groups.map(group => (
            <div key={group.tenant_id} className={styles.tenantGroup}>
              <div className={styles.tenantHeader}>{group.tenant_name}</div>
              <ul className={styles.convList} role="list">
                {group.conversations.map(conv => {
                  const isUnread = unreadIds.has(conv.id) && selectedId !== conv.id
                  return (
                    <li key={conv.id} className={styles.convRow}>
                      <button
                        type="button"
                        className={`${styles.convItem} ${selectedId === conv.id ? styles.convActive : ''} ${isUnread ? styles.convUnread : ''}`}
                        onClick={() => selectConversation(conv.id)}
                      >
                        <div className={styles.convTop}>
                          <span className={styles.convTitle}>
                            {isUnread && <span className={styles.unreadDot} aria-hidden="true" />}
                            {conv.title?.trim() || 'New Chat'}
                          </span>
                          <span
                            className={`${styles.badge} ${
                              conv.status === 'open' ? styles.badgeOpen : styles.badgeClosed
                            }`}
                          >
                            {conv.status}
                          </span>
                        </div>
                        <div className={styles.convMeta}>
                          <span>{conv.assigned_name ?? 'Unassigned'}</span>
                          <span>{formatLastMessageAgo(conv.last_message_at ?? conv.created_at)}</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        title="Delete conversation"
                        aria-label={`Delete ${conv.title?.trim() || 'New Chat'}`}
                        disabled={deletingId === conv.id}
                        onClick={() => requestDelete(conv.id)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                          strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      <section className={styles.chatPanel}>
        <ChatWindow
          conversation={selected}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onTitleChange={handleTitleChange}
          onDelete={requestDelete}
          onOpenList={() => setListOpen(true)}
          onMessageActivity={bumpActivity}
          deleting={deletingId === selected?.id}
        />
      </section>
    </div>
  )
}
