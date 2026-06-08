'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import EmailModal from '@/components/modals/EmailModal'
import WhatsAppModal from '@/components/modals/WhatsAppModal'
import CallModal from '@/components/modals/CallModal'
import Button from '@/components/ui/Button'
import StageBadge from '@/components/ui/StageBadge'
import { updateLead, deleteLead } from '@/lib/actions/leads'
import { PIPELINE_STAGES, STAGE_LABELS, type Lead, type PipelineStage } from '@/lib/types'
import styles from './LeadActions.module.css'

type ModalType = 'email' | 'whatsapp' | 'call' | null

interface LeadActionsProps {
  lead: Lead
}

export default function LeadActions({ lead }: LeadActionsProps) {
  const router = useRouter()
  const [modal, setModal] = useState<ModalType>(null)
  const [stage, setStage] = useState<PipelineStage>(lead.stage)
  const [stageLoading, setStageLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleStageChange(newStage: PipelineStage) {
    if (newStage === stage) return
    setStageLoading(true)
    setStage(newStage)
    try {
      await updateLead(lead.id, { stage: newStage })
      router.refresh()
    } catch {
      setStage(lead.stage) // revert
    } finally {
      setStageLoading(false)
    }
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteLead(lead.id)
    })
  }

  function handleModalSaved() {
    router.refresh()
  }

  return (
    <>
      {/* Stage selector */}
      <div className={styles.stageSection}>
        <div className={styles.stageLabel}>Pipeline Stage</div>
        <select
          className={styles.stageSelect}
          value={stage}
          onChange={e => handleStageChange(e.target.value as PipelineStage)}
          disabled={stageLoading}
        >
          {PIPELINE_STAGES.map(s => (
            <option key={s} value={s}>{STAGE_LABELS[s]}</option>
          ))}
        </select>
        {stageLoading && <span className={styles.stageSpinner}>Saving…</span>}
      </div>

      {/* Action buttons */}
      <div className={styles.actionBtns}>
        <Button
          size="sm"
          className={styles.fullWidth}
          onClick={() => setModal('email')}
          disabled={!lead.email}
          title={!lead.email ? 'No email address on this lead' : undefined}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect width="20" height="16" x="2" y="4" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
          Send Email
        </Button>

        <Button size="sm" variant="outline" className={styles.fullWidth} onClick={() => setModal('whatsapp')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Log WhatsApp
        </Button>

        <Button size="sm" variant="outline" className={styles.fullWidth} onClick={() => setModal('call')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.72 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          Log Call
        </Button>
      </div>

      {/* Delete */}
      {!showDeleteConfirm ? (
        <button className={styles.deleteLink} onClick={() => setShowDeleteConfirm(true)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3-3h6a1 1 0 0 1 1 1v1H6V3a1 1 0 0 1 1-1z"/>
          </svg>
          Delete Lead
        </button>
      ) : (
        <div className={styles.deleteConfirm}>
          <div className={styles.deleteConfirmText}>Delete this lead and all its history?</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button size="sm" variant="danger" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Deleting…' : 'Yes, delete'}
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal === 'email' && lead.email && (
        <EmailModal
          leadId={lead.id}
          toEmail={lead.email}
          toName={lead.contact_name}
          onClose={() => setModal(null)}
          onSent={handleModalSaved}
        />
      )}
      {modal === 'whatsapp' && (
        <WhatsAppModal
          leadId={lead.id}
          leadName={lead.contact_name}
          onClose={() => setModal(null)}
          onSaved={handleModalSaved}
        />
      )}
      {modal === 'call' && (
        <CallModal
          leadId={lead.id}
          leadName={lead.contact_name}
          onClose={() => setModal(null)}
          onSaved={handleModalSaved}
        />
      )}
    </>
  )
}
