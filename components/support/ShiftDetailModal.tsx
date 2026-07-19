'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/modals/Modal'
import ConfirmModal from '@/components/modals/ConfirmModal'
import Button from '@/components/ui/Button'
import { deleteShift, updateShift } from '@/lib/actions/support-shifts'
import {
  agentDisplayName,
  formatShiftDate,
  formatShiftTime,
  type ShiftAgent,
  type ShiftItem,
} from '@/lib/support/shifts'
import modalStyles from '@/components/modals/modals.module.css'
import styles from './ShiftDetailModal.module.css'

interface Props {
  shift:     ShiftItem
  agents:    ShiftAgent[]
  canManage: boolean
  onClose:   () => void
}

export default function ShiftDetailModal({
  shift,
  agents,
  canManage,
  onClose,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [transferring, setTransferring] = useState(false)
  const [transferTo, setTransferTo] = useState(
    agents.find(a => a.id !== shift.agent_id)?.id ?? ''
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleTransfer() {
    if (!transferTo || transferTo === shift.agent_id) return
    setError(null)
    startTransition(async () => {
      try {
        await updateShift(shift.id, transferTo)
        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Transfer failed')
      }
    })
  }

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      try {
        await deleteShift(shift.id)
        router.refresh()
        setConfirmDelete(false)
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed')
        setConfirmDelete(false)
      }
    })
  }

  return (
    <>
      <Modal
        title="Shift details"
        onClose={pending ? () => {} : onClose}
        width={420}
      >
        <div className={styles.body}>
          <dl className={styles.meta}>
            <div>
              <dt>Agent</dt>
              <dd>{shift.agent_name}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatShiftDate(shift.start_at)}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>
                {formatShiftTime(shift.start_at)} – {formatShiftTime(shift.end_at)}
              </dd>
            </div>
          </dl>

          {canManage && (
            <>
              {!transferring ? (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  disabled={pending}
                  onClick={() => setTransferring(true)}
                >
                  Transfer shift
                </Button>
              ) : (
                <div className={styles.transferBox}>
                  <label className={modalStyles.label} htmlFor="transfer-agent">
                    Reassign to
                  </label>
                  <select
                    id="transfer-agent"
                    className={modalStyles.select}
                    value={transferTo}
                    onChange={e => setTransferTo(e.target.value)}
                    disabled={pending}
                  >
                    {agents
                      .filter(a => a.id !== shift.agent_id)
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          {agentDisplayName(a)}
                        </option>
                      ))}
                  </select>
                  <div className={styles.transferActions}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => setTransferring(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={pending || !transferTo}
                      onClick={handleTransfer}
                    >
                      {pending ? 'Transferring…' : 'Confirm transfer'}
                    </Button>
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="danger"
                size="md"
                disabled={pending}
                onClick={() => setConfirmDelete(true)}
              >
                Delete shift
              </Button>
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <div className={modalStyles.footerSimple}>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={pending}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {confirmDelete && (
        <ConfirmModal
          title="Delete shift?"
          message={`Remove ${shift.agent_name}'s shift on ${formatShiftDate(shift.start_at)}?`}
          confirmLabel="Delete"
          danger
          loading={pending}
          onConfirm={handleDelete}
          onClose={() => {
            if (!pending) setConfirmDelete(false)
          }}
        />
      )}
    </>
  )
}
