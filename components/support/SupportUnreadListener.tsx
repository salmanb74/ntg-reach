'use client'

/**
 * Global listener for customer support messages (badge + optional browser notify).
 * Mounted on Support topbar so it runs on all support pages.
 */

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient, ensureRealtimeAuth } from '@/lib/supabase/client'
import { markSupportCustomerMessage } from '@/lib/support/unreadStore'

export default function SupportUnreadListener() {
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname
  const audioCtxRef = useRef<AudioContext | null>(null)
  const lastSoundAtRef = useRef(0)

  function playLoudSound() {
    const now = Date.now()
    // Prevent rapid beeps when multiple messages arrive quickly.
    if (now - lastSoundAtRef.current < 1500) return
    lastSoundAtRef.current = now

    if (typeof window === 'undefined') return
    try {
      const AudioCtx =
        window.AudioContext ||
        // @ts-expect-error - Safari fallback
        window.webkitAudioContext
      if (!AudioCtx) return

      let ctx = audioCtxRef.current
      if (!ctx) {
        ctx = new AudioCtx()
        audioCtxRef.current = ctx
      }

      void ctx.resume?.()

      const startTime = ctx.currentTime + 0.01
      const gain = ctx.createGain()
      // Keep it loud but not clipping.
      gain.gain.value = 0.9
      gain.connect(ctx.destination)

      const tone = (freq: number, t: number, dur: number) => {
        const osc = ctx!.createOscillator()
        osc.type = 'square'
        osc.frequency.value = freq
        osc.connect(gain)
        osc.start(t)
        osc.stop(t + dur)
      }

      // Two beeps.
      tone(880, startTime, 0.12)
      tone(1320, startTime + 0.16, 0.12)
    } catch {
      // Autoplay restrictions can block sound; ignore silently.
    }

    // Extra haptic feedback when supported.
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        // @ts-expect-error - vibrate isn't in all TS lib targets
        navigator.vibrate?.(100)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false
    let currentUserId: string | null = null

    async function setup() {
      await ensureRealtimeAuth(supabase)
      if (cancelled) return

      const { data: { user } } = await supabase.auth.getUser()
      currentUserId = user?.id ?? null

      channel = supabase
        .channel('support-unread-global')
        .on(
          'postgres_changes',
          {
            event:  'INSERT',
            schema: 'public',
            table:  'support_messages',
          },
          (payload) => {
            const row = payload.new as {
              conversation_id?: string
              sender_type?: string
              sender_id?: string
              content?: string | null
            }
            if (row.sender_type !== 'customer' || !row.conversation_id) return

            // Same tab: you sent this from the customer simulator — do not badge this tab.
            if (
              currentUserId &&
              row.sender_id === currentUserId &&
              pathnameRef.current.startsWith('/support/simulator')
            ) {
              return
            }

            markSupportCustomerMessage(row.conversation_id)

            // Loud beep when user is unlikely to be actively watching.
            const onChatsPage = pathnameRef.current.startsWith('/support/chats')
            const hidden = typeof document !== 'undefined' && document.hidden
            if (hidden || !onChatsPage) playLoudSound()

            if (
              typeof document !== 'undefined' &&
              document.hidden &&
              typeof Notification !== 'undefined' &&
              Notification.permission === 'granted'
            ) {
              try {
                new Notification('New support message', {
                  body: row.content?.trim() || 'Customer sent a message',
                  tag:  `support-${row.conversation_id}`,
                })
              } catch {
                // ignore notification errors
              }
            }
          }
        )
        .subscribe()

      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'default'
      ) {
        void Notification.requestPermission()
      }
    }

    void setup()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  return null
}
