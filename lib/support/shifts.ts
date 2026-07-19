export type ShiftAgent = {
  id:        string
  full_name: string | null
  email:     string
  roles:     string[]
}

export type ShiftItem = {
  id:         string
  agent_id:   string
  agent_name: string
  start_at:   string
  end_at:     string
  created_by: string
  created_at: string
}

export type OnDutyAgent = {
  shift_id:   string
  agent_id:   string
  agent_name: string
  start_at:   string
  end_at:     string
}

export const DEFAULT_OFFLINE_MESSAGE =
  'Our support team is currently offline. We will get back to you as soon as possible.'

export function agentDisplayName(agent: Pick<ShiftAgent, 'full_name' | 'email'>) {
  return agent.full_name?.trim() || agent.email || 'Agent'
}

/** Monday 00:00:00 local for the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function formatWeekLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const yOpts: Intl.DateTimeFormatOptions = { ...opts, year: 'numeric' }
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear()
  const left = weekStart.toLocaleDateString('en-PK', sameYear ? opts : yOpts)
  const right = weekEnd.toLocaleDateString('en-PK', yOpts)
  return `${left} – ${right}`
}

export function formatShiftTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PK', {
    hour:   '2-digit',
    minute: '2-digit',
  })
}

export function formatShiftDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PK', {
    weekday: 'short',
    day:     'numeric',
    month:   'short',
    year:    'numeric',
  })
}

/** Stable pastel color class index 0–5 from agent id. */
export function agentColorIndex(agentId: string): number {
  let hash = 0
  for (let i = 0; i < agentId.length; i++) {
    hash = (hash * 31 + agentId.charCodeAt(i)) >>> 0
  }
  return hash % 6
}

/** Shifts that intersect a local calendar day (00:00–24:00). */
export function shiftsForDay(shifts: ShiftItem[], day: Date): ShiftItem[] {
  const dayStart = new Date(day)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(day)
  dayEnd.setHours(23, 59, 59, 999)

  return shifts
    .filter(s => {
      const start = new Date(s.start_at)
      const end = new Date(s.end_at)
      return start <= dayEnd && end >= dayStart
    })
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Position a shift within a day's 24h column (0–100%).
 * Clips overnight spans to the visible day.
 */
export function shiftPositionInDay(
  shift: ShiftItem,
  day: Date
): { topPct: number; heightPct: number } | null {
  const dayStart = new Date(day)
  dayStart.setHours(0, 0, 0, 0)
  const dayEndMs = dayStart.getTime() + MS_PER_DAY

  const startMs = Math.max(new Date(shift.start_at).getTime(), dayStart.getTime())
  const endMs = Math.min(new Date(shift.end_at).getTime(), dayEndMs)
  if (endMs <= startMs) return null

  const topPct = ((startMs - dayStart.getTime()) / MS_PER_DAY) * 100
  // Minimum ~15 min visual height so short shifts stay clickable
  const heightPct = Math.max(((endMs - startMs) / MS_PER_DAY) * 100, 100 / 96)
  return { topPct, heightPct }
}

/** Current time as % down the day column (null if not this local day). */
export function nowPositionInDay(day: Date, now = new Date()): number | null {
  if (!sameDay(day, now)) return null
  const dayStart = new Date(day)
  dayStart.setHours(0, 0, 0, 0)
  const pct = ((now.getTime() - dayStart.getTime()) / MS_PER_DAY) * 100
  return Math.min(100, Math.max(0, pct))
}

export function formatHourLabel(hour: number): string {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  return d.toLocaleTimeString('en-PK', { hour: 'numeric' })
}

/** True if two intervals overlap (for same-agent warning). */
export function intervalsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const as = new Date(aStart).getTime()
  const ae = new Date(aEnd).getTime()
  const bs = new Date(bStart).getTime()
  const be = new Date(bEnd).getTime()
  return as < be && bs < ae
}
