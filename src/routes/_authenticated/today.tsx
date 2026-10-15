import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { BookDialog } from '@/components/clinic/BookDialog'
import { TaskButton } from '@/components/clinic/TaskButton'
import {
  apptName,
  errMsg,
  fmtTime,
  STATUS_STYLE,
  useMe
  
} from '@/lib/clinic'
import type {ApptStatus} from '@/lib/clinic';
import { cn } from '@/lib/utils'
import { CalendarPlus, Footprints, Play } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/today')({
  head: () => ({
    meta: [
      { title: 'Today — Fahad Clinic' },
      { name: 'description', content: "Today's schedule and patient queue." },
      { property: 'og:title', content: 'Today — Fahad Clinic' },
      {
        property: 'og:description',
        content: "Today's schedule and patient queue.",
      },
    ],
  }),
  component: Today,
})

export function useTodayAppts() {
  const qc = useQueryClient()
  useEffect(() => {
    const ch = supabase
      .channel('appts-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          qc.invalidateQueries({ queryKey: ['appts'] })
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [qc])
  return useQuery({
    queryKey: ['appts', 'today'],
    queryFn: async () => {
      const s = new Date()
      s.setHours(0, 0, 0, 0)
      const e = new Date(s.getTime() + 86400000)
      const { data, error } = await supabase
        .from('appointments')
        .select(
          '*, patients(id, full_name, medical_record_id, date_of_birth, phone)',
        )
        .gte('start_time', s.toISOString())
        .lt('start_time', e.toISOString())
        .order('start_time')
      if (error) throw error
      return data
    },
    refetchInterval: 30_000,
  })
}

const LABEL: Record<ApptStatus, string> = {
  CONFIRMED: 'Booked',
  CHECKED_IN: 'Waiting',
  COMPLETED: 'Done',
  NO_SHOW: 'No-show',
  CANCELLED: 'Cancelled',
  RESCHEDULED: 'Moved',
}

function Today() {
  const { data: me } = useMe()
  const { data: appts = [] } = useTodayAppts()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [book, setBook] = useState<{
    open: boolean
    walkIn?: boolean
    rescheduleId?: string
  }>({ open: false })
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)

  async function setStatus(id: string, status: ApptStatus) {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
    if (error) return toast.error(errMsg(error))
    qc.invalidateQueries({ queryKey: ['appts'] })
    setConfirmCancel(null)
  }

  const queue = appts.filter((a) => a.status === 'CHECKED_IN')
  const active = appts.filter(
    (a) => !['CANCELLED', 'RESCHEDULED'].includes(a.status),
  )
  const done = appts.filter((a) => a.status === 'COMPLETED').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">
            {format(new Date(), 'EEEE, d MMMM')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {active.length} booked · {queue.length} waiting · {done} seen
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setBook({ open: true, walkIn: true })}
          >
            <Footprints className="h-4 w-4" /> Walk-in
          </Button>
          <Button onClick={() => setBook({ open: true })}>
            <CalendarPlus className="h-4 w-4" /> Book
          </Button>
        </div>
      </div>

      {me?.isDoctor && (
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 font-semibold">Waiting room ({queue.length})</h2>
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No one is waiting. Checked-in patients appear here instantly.
            </p>
          ) : (
            <ol className="divide-y">
              {queue.map((a, i) => (
                <li key={a.id} className="flex items-center gap-3 py-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{apptName(a)}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtTime(a.start_time)}{' '}
                      {a.complaints ? `· ${a.complaints}` : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate({
                        to: '/consultation/$appointmentId',
                        params: { appointmentId: a.id },
                      })
                    }
                  >
                    <Play className="h-4 w-4" /> Start
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <section className="rounded-lg border bg-card">
        <h2 className="border-b px-4 py-3 font-semibold">Schedule</h2>
        {appts.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            Nothing booked today yet.
          </p>
        )}
        <ul className="divide-y">
          {appts.map((a) => (
            <li
              key={a.id}
              className={cn(
                'flex flex-wrap items-center gap-3 px-4 py-2.5',
                ['CANCELLED', 'RESCHEDULED', 'NO_SHOW'].includes(a.status) &&
                  'opacity-60',
              )}
            >
              <span className="w-16 text-sm font-semibold tabular-nums">
                {fmtTime(a.start_time)}
              </span>
              <div className="min-w-40 flex-1">
                {a.patients ? (
                  <Link
                    to="/patients/$id"
                    params={{ id: a.patients.id }}
                    className="font-medium hover:underline"
                  >
                    {a.patients.full_name}
                  </Link>
                ) : (
                  <span className="font-medium">
                    {a.walk_in_name}{' '}
                    <span className="text-xs text-muted-foreground">
                      (walk-in)
                    </span>
                  </span>
                )}
                <p className="text-xs text-muted-foreground">
                  {a.service === 'MEDICINE' ? 'Medicine' : 'Consultation'}
                  {a.appointment_type === 'TELEMEDICINE'
                    ? ' · Telemedicine'
                    : ''}
                  {a.complaints ? ` · ${a.complaints}` : ''}
                </p>
              </div>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  STATUS_STYLE[a.status],
                )}
              >
                {LABEL[a.status]}
              </span>
              <div className="flex gap-1">
                {a.status === 'CONFIRMED' &&
                  (confirmCancel === a.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setStatus(a.id, 'CANCELLED')}
                      >
                        Yes, cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmCancel(null)}
                      >
                        Keep
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setStatus(a.id, 'CHECKED_IN')}
                      >
                        Check in
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setStatus(a.id, 'NO_SHOW')}
                      >
                        No-show
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setBook({ open: true, rescheduleId: a.id })
                        }
                      >
                        Move
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmCancel(a.id)}
                      >
                        Cancel
                      </Button>
                    </>
                  ))}
                {a.status === 'CHECKED_IN' && me?.isDoctor && (
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate({
                        to: '/consultation/$appointmentId',
                        params: { appointmentId: a.id },
                      })
                    }
                  >
                    Start
                  </Button>
                )}
                {a.status === 'CHECKED_IN' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStatus(a.id, 'CONFIRMED')}
                  >
                    Undo
                  </Button>
                )}
                <TaskButton type="APPOINTMENT" referenceId={a.id} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <BookDialog
        open={book.open}
        onOpenChange={(o) => setBook({ open: o })}
        walkIn={book.walkIn}
        rescheduleId={book.rescheduleId}
      />
    </div>
  )
}
