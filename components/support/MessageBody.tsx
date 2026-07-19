'use client'

import { useEffect, useState } from 'react'
import type { ChatMessage } from './types'
import styles from './MessageBody.module.css'

interface Props {
  message: ChatMessage
}

export default function MessageBody({ message }: Props) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!lightboxUrl) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxUrl(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxUrl])

  if (message.message_type === 'voice' && message.file_url) {
    return (
      <audio
        className={styles.audioPlayer}
        controls
        src={message.file_url}
        preload="metadata"
      />
    )
  }

  if (message.message_type === 'image' && message.file_url) {
    return (
      <>
        <button
          type="button"
          className={styles.imageBtn}
          onClick={() => setLightboxUrl(message.file_url)}
          aria-label="View full image"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={message.file_url}
            alt=""
            className={styles.messageImage}
          />
        </button>
        {lightboxUrl && (
          <div
            className={styles.imageLightbox}
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
            onClick={() => setLightboxUrl(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt=""
              className={styles.lightboxImage}
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}
      </>
    )
  }

  return <p className={styles.bubbleText}>{message.content}</p>
}
