'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/modals/Modal'
import Button from '@/components/ui/Button'
import { createShift } from '@/lib/actions/support-shifts'
import {
  agentDisplayName,
  intervalsOverlap,
  type ShiftAgent,
  type ShiftItem,
} from '@/lib/support/shifts'
import modalStyles from '@/components/modals/modals.module.css'
import styles from './AddShiftModal.module.css'

interface Props {
  agents:       ShiftAgent[]
  existing:     ShiftItem[]
  defaultDate?: string // YYYY-MM-DD
  onClose:      () => void
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function combineLocal(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}

export default function AddShiftModal({
  agents,
  existing,
  defaultDate,
  onClose,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const today = toLocalInputValue(new Date())

  const [agentId, setAgentId] = useState(agents[0]?.id ?? '')
  const [date, setDate] = useState(defaultDate ?? today)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [error, setError] = useState<string | null>(null)

  const overlapWarning = useMemo(() => {
    if (!agentId || !date || !startTime || !endTime) return null
    const startAt = combineLocal(date, startTime)
    const endAt = combineLocal(date, endTime)
    if (new Date(endAt) <= new Date(startAt)) return null

    const hit = existing.find(
      s =>
        s.agent_id === agentId &&
        intervalsOverlap(startAt, endAt, s.start_at, s.end_at)
    )
    if (!hit) return null
    return `This overlaps an existing shift for this agent (${new Date(hit.start_at).toLocaleString('en-PK')} – ${new Date(hit.end_at).toLocaleString('en-PK')}). You can still save.`
  }, [agentId, date, startTime, endTime, existing])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!agentId) {
      setError('Select an agent')
      return
    }

    const startAt = combineLocal(date, startTime)
    const endAt = combineLocal(date, endTime)
    if (new Date(endAt) <= new Date(startAt)) {
      setError('End time must be after start time')
      return
    }

    startTransition(async () => {
      try {
        await createShift(agentId, startAt, endAt)
        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create shift')
      }
    })
  }

  return (
    <Modal title="Add shift" onClose={pending ? () => {} : onClose} width={440}>
      <form className={modalStyles.form} onSubmit={handleSubmit}>
        <div className={modalStyles.field}>
          <label className={modalStyles.label} htmlFor="shift-agent">Agent</label>
          <select
            id="shift-agent"
            className={modalStyles.select}
            value={agentId}
            onChange={e => setAgentId(e.target.value)}
            required
            disabled={pending}
          >
            {agents.length === 0 && (
              <option value="">No CS agents found</option>
            )}
            {agents.map(a => (
              <option key={a.id} value={a.id}>
                {agentDisplayName(a)}
              </option>
            ))}
          </select>
        </div>

        <div className={modalStyles.field}>
          <label className={modalStyles.label} htmlFor="shift-date">Date</label>
          <input
            id="shift-date"
            type="date"
            className={modalStyles.input}
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            disabled={pending}
          />
        </div>

        <div className={styles.timeRow}>
          <div className={modalStyles.field}>
            <label className={modalStyles.label} htmlFor="shift-start">Start</label>
            <input
              id="shift-start"
              type="time"
              className={modalStyles.input}
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              required
              disabled={pending}
            />
          </div>
          <div className={modalStyles.field}>
            <label className={modalStyles.label} htmlFor="shift-end">End</label>
            <input
              id="shift-end"
              type="time"
              className={modalStyles.input}
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              required
              disabled={pending}
            />
          </div>
        </div>

        {overlapWarning && (
          <p className={styles.warn}>{overlapWarning}</p>
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
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={pending || !agentId}
          >
            {pending ? 'Saving…' : 'Save shift'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
