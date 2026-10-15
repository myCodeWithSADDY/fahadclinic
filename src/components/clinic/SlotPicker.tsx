import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { timeSlots } from '@/lib/clinic'
import { cn } from '@/lib/utils'

function displayDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  return match ? `${match[3]}/${match[2]}/${match[1].slice(-2)}` : ''
}

function parseDisplayDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const year = 2000 + Number(match[3])
  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null
  }
  return `${year}-${match[2]}-${match[1]}`
}

/** Date + 15-minute slot grid; taken slots are greyed out. */
export function SlotPicker({
  date,
  time,
  onDate,
  onTime,
}: {
  date: string
  time: string
  onDate: (d: string) => void
  onTime: (t: string) => void
}) {
  const calendarRef = useRef<HTMLInputElement>(null)
  const [dateInput, setDateInput] = useState(() => displayDate(date))
  useEffect(() => {
    setDateInput(displayDate(date))
  }, [date])

  const inputDate = parseDisplayDate(dateInput)
  const dateIsSelected = inputDate === date
  function selectDate(nextDate: string) {
    if (nextDate !== date) onTime('')
    onDate(nextDate)
  }

  const { data: taken = [] } = useQuery({
    queryKey: ['taken', date],
    enabled: !!date,
    queryFn: async () => {
      const start = new Date(`${date}T00:00:00`)
      const end = new Date(start.getTime() + 86400000)
      const { data } = await supabase
        .from('appointments')
        .select('start_time')
        .gte('start_time', start.toISOString())
        .lt('start_time', end.toISOString())
        .not('status', 'in', '(CANCELLED,NO_SHOW,RESCHEDULED,COMPLETED)')
      return (data ?? []).map((a) => {
        const d = new Date(a.start_time)
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      })
    },
  })
  const now = new Date()
  const isToday = date === now.toISOString().slice(0, 10)
  return (
    <div className="space-y-2">
      <div className="relative w-44">
        <Input
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/yy"
          aria-label="Appointment date (dd/mm/yy)"
          value={dateInput}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '').slice(0, 6)
            const formatted =
              digits.length > 4
                ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
                : digits.length > 2
                  ? `${digits.slice(0, 2)}/${digits.slice(2)}`
                  : digits
            setDateInput(formatted)
            const parsed = parseDisplayDate(formatted)
            if (parsed) selectDate(parsed)
            else onTime('')
          }}
          className="pr-10"
        />
        <input
          ref={calendarRef}
          type="date"
          value={date}
          aria-label="Choose appointment date from calendar"
          tabIndex={-1}
          onChange={(event) => {
            const nextDate = event.target.value
            setDateInput(displayDate(nextDate))
            selectDate(nextDate)
          }}
          className="pointer-events-none absolute h-px w-px opacity-0"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Open calendar"
          className="absolute right-1 top-1/2 -translate-y-1/2"
          onClick={() => calendarRef.current?.showPicker()}
        >
          <CalendarDays className="h-4 w-4" />
        </Button>
      </div>
      {!dateIsSelected && (
        <p className="text-xs text-muted-foreground">
          Enter a valid date as dd/mm/yy.
        </p>
      )}
      <div className="grid max-h-40 grid-cols-6 gap-1 overflow-auto rounded-md border p-1.5 sm:grid-cols-8">
        {timeSlots().map((s) => {
          const past = isToday && new Date(`${date}T${s}:00`) < now
          const busy = taken.includes(s)
          return (
            <button
              type="button"
              key={s}
              disabled={!dateIsSelected || busy || past}
              onClick={() => onTime(s)}
              className={cn(
                'rounded px-1 py-1 text-xs tabular-nums',
                time === s
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary',
                (busy || past) &&
                  'cursor-not-allowed text-muted-foreground/50 line-through hover:bg-transparent',
              )}
            >
              {format(new Date(`2000-01-01T${s}:00`), 'h:mm a')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
