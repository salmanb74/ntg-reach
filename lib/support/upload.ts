'use client'

import { createClient } from '@/lib/supabase/client'
import type { SupportMessageRow } from '@/lib/support/realtime'

const BUCKET = 'support-files'

/** Max long edge for chat images (keeps thumbs small). */
export const IMAGE_MAX_EDGE = 1280
/** JPEG quality 0–1 — good balance for chat screenshots. */
export const IMAGE_JPEG_QUALITY = 0.72
/** Soft warning in the UI after this many seconds (recording continues). */
export const VOICE_WARN_SECONDS = 120
/**
 * Hard safety cap — at 24kbps, 5 min ≈ 900KB.
 * Recording auto-stops and goes to preview so notes can't grow unboundedly.
 */
export const VOICE_MAX_SECONDS = 5 * 60
/** Target voice bitrate (Opus speech is fine at 24 kbps). */
export const VOICE_BITS_PER_SECOND = 24_000

export async function uploadSupportFile(opts: {
  path: string
  file: Blob | File
  contentType: string
}): Promise<{ publicUrl: string } | { error: string }> {
  const supabase = createClient()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(opts.path, opts.file, {
      contentType: opts.contentType,
      upsert: false,
    })

  if (error) {
    return { error: error.message }
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(opts.path)
  return { publicUrl: data.publicUrl }
}

export async function insertMediaMessage(opts: {
  conversationId: string
  senderId: string
  senderType: 'agent' | 'customer'
  messageType: 'image' | 'voice'
  fileUrl: string
}): Promise<{ row: SupportMessageRow } | { error: string }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      conversation_id: opts.conversationId,
      sender_id:       opts.senderId,
      sender_type:     opts.senderType,
      message_type:    opts.messageType,
      content:         null,
      file_url:        opts.fileUrl,
    })
    .select('*')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Failed to send media message' }
  }

  return { row: data as SupportMessageRow }
}

export function voiceStoragePath(conversationId: string) {
  return `voice/${conversationId}/${Date.now()}.webm`
}

export function imageStoragePath(conversationId: string) {
  return `images/${conversationId}/${Date.now()}.jpg`
}

/** Extract storage object path from a public URL. */
export function storagePathFromPublicUrl(fileUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const idx = fileUrl.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(fileUrl.slice(idx + marker.length).split('?')[0])
}

export async function removeSupportFile(fileUrl: string | null | undefined) {
  if (!fileUrl) return
  const path = storagePathFromPublicUrl(fileUrl)
  if (!path) return
  const supabase = createClient()
  await supabase.storage.from(BUCKET).remove([path])
}

/** Delete own message (RLS: sender_id = auth.uid()). Also removes media file. */
export async function deleteSupportMessage(opts: {
  id: string
  fileUrl?: string | null
}): Promise<{ error?: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('support_messages')
    .delete()
    .eq('id', opts.id)

  if (error) return { error: error.message }

  await removeSupportFile(opts.fileUrl)
  return {}
}

/**
 * Downscale + convert to JPEG for chat (much smaller than phone camera PNGs).
 * GIFs become a still frame — intentional for storage size.
 */
export async function compressImageForChat(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Could not compress image')
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', IMAGE_JPEG_QUALITY)
  })

  if (!blob) throw new Error('Could not compress image')
  return blob
}
