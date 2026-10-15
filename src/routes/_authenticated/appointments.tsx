import { createFileRoute, Link } from '@tanstack/react-router'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { CalendarPlus, CalendarSync, Trash2, XCircle } from 'lucide-react'
import { BookDialog } from '@/components/clinic/BookDialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { supabase } from '@/integrations/supabase/client'
import {
  apptName,
  errMsg,
  fmtTime,
  STATUS_STYLE,
} from '@/lib/clinic'
import type { ApptStatus } from '@/lib/clinic'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/appointments')({
  head: () => ({
    meta: [
      { title: 'Appointments — Fahad Clinic' },
      {
        name: 'description',
        content: 'View appointments across all dates.',
      },
    ],
  }),
  component: Appointments,
})

const PAGE_SIZE = 50

const LABEL: Record<ApptStatus, string> = {
  CONFIRMED: 'Booked',
  CHECKED_IN: 'Waiting',
  COMPLETED: 'Done',
  NO_SHOW: 'No-show',
  CANCELLED: 'Cancelled',
  RESCHEDULED: 'Moved',
}

function Appointments() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<ApptStatus | ''>('')
  const [bookOpen, setBookOpen] = useState(false)
  const [reschedule, setReschedule] = useState<{
    id: string
    startTime: string
  }>()
  const [deleteAppointment, setDeleteAppointment] = useState<{
    id: string
    name: string
  } | null>(null)
  const [busyId, setBusyId] = useState<string>()
  const queryClient = useQueryClient()

  const appointments = useInfiniteQuery({
    queryKey: ['appts', 'all', from, to, status],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from('appointments')
        .select(
          '*, patients(id, full_name, medical_record_id, date_of_birth, phone)',
        )
        .order('start_time', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1)

      if (from) query = query.gte('start_time', new Date(`${from}T00:00:00`).toISOString())
      if (to) {
        const end = new Date(`${to}T00:00:00`)
        end.setDate(end.getDate() + 1)
        query = query.lt('start_time', end.toISOString())
      }
      if (status) query = query.eq('status', status)

      const { data, error } = await query
      if (error) throw error
      return data
    },
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.length === PAGE_SIZE ? lastPageParam + PAGE_SIZE : undefined,
  })

  const rows = appointments.data?.pages.flat() ?? []

  async function cancelAppointment(id: string) {
    setBusyId(id)
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'CANCELLED' })
      .eq('id', id)
    setBusyId(undefined)
    if (error) {
      toast.error(errMsg(error))
      return
    }
    toast.success('Appointment cancelled.')
    await queryClient.invalidateQueries({ queryKey: ['appts'] })
  }

  async function permanentlyDeleteAppointment() {
    if (!deleteAppointment) return
    const { id } = deleteAppointment
    setBusyId(id)
    const { data, error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle()
    setBusyId(undefined)
    if (error) {
      toast.error(
        error.code === '23503'
          ? 'This appointment is linked to clinical records and cannot be permanently deleted. Cancel it to retain its history.'
          : errMsg(error),
      )
      return
    }
    if (!data) {
      toast.error(
        'The appointment was not deleted. Your account may not have database permission to delete appointments.',
      )
      return
    }
    toast.success('Appointment permanently deleted.')
    setDeleteAppointment(null)
    await queryClient.invalidateQueries({ queryKey: ['appts'] })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            Browse appointments across all dates.
          </p>
        </div>
        <Button onClick={() => setBookOpen(true)}>
          <CalendarPlus className="h-4 w-4" /> Book
        </Button>
      </div>

      <section className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
        <div className="space-y-2">
          <label htmlFor="appointments-from" className="text-xs px-2 text-muted-foreground">
            From
          </label>
          <Input
            id="appointments-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="w-44"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="appointments-to" className="text-xs px-2 text-muted-foreground">
            To
          </label>
          <Input
            id="appointments-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
            className="w-44"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="appointments-status" className="text-xs px-2 text-muted-foreground">
            Status
          </label>
          <select
            id="appointments-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as ApptStatus | '')}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="CONFIRMED">Booked</option>
            <option value="CHECKED_IN">Waiting</option>
            <option value="COMPLETED">Done</option>
            <option value="NO_SHOW">No-show</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="RESCHEDULED">Moved</option>
          </select>
        </div>
        {(from || to || status) && (
          <Button
            variant="ghost"
            onClick={() => {
              setFrom('')
              setTo('')
              setStatus('')
            }}
          >
            Clear filters
          </Button>
        )}
      </section>

      <section className="rounded-lg border bg-card">
        <h2 className="border-b px-4 py-3 text-sm font-semibold">
          {appointments.isPending
            ? 'Loading appointments…'
            : `${rows.length}${appointments.hasNextPage ? '+' : ''} appointments`}
        </h2>
        {appointments.isError && (
          <p className="p-4 text-sm text-destructive">
            Could not load appointments: {appointments.error.message}
          </p>
        )}
        {!appointments.isPending && rows.length === 0 && !appointments.isError && (
          <p className="p-4 text-sm text-muted-foreground">
            No appointments match these filters.
          </p>
        )}
        <ul className="divide-y">
          {rows.map((appointment) => (
            <li
              key={appointment.id}
              className={cn(
                'flex flex-wrap items-center gap-3 px-4 py-3',
                ['CANCELLED', 'RESCHEDULED', 'NO_SHOW'].includes(
                  appointment.status,
                ) && 'opacity-70',
              )}
            >
              <div className="w-28 shrink-0">
                <p className="text-sm font-semibold">
                  {format(new Date(appointment.start_time), 'dd/MM/yy')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fmtTime(appointment.start_time)}
                </p>
              </div>
              <div className="min-w-40 flex-1">
                {appointment.patients ? (
                  <Link
                    to="/patients/$id"
                    params={{ id: appointment.patients.id }}
                    className="font-medium hover:underline"
                  >
                    {appointment.patients.full_name}
                  </Link>
                ) : (
                  <span className="font-medium">
                    {apptName(appointment)}{' '}
                    <span className="text-xs text-muted-foreground">
                      (walk-in)
                    </span>
                  </span>
                )}
                <p className="text-xs text-muted-foreground">
                  {appointment.service === 'MEDICINE' ? 'Medicine' : 'Consultation'}
                  {appointment.appointment_type === 'TELEMEDICINE'
                    ? ' · Telemedicine'
                    : ''}
                  {appointment.complaints
                    ? ` · ${appointment.complaints}`
                    : ''}
                </p>
              </div>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  STATUS_STYLE[appointment.status],
                )}
              >
                {LABEL[appointment.status]}
              </span>
              <div className="flex flex-wrap gap-1">
                {!['CANCELLED', 'RESCHEDULED', 'COMPLETED', 'NO_SHOW'].includes(
                  appointment.status,
                ) && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === appointment.id}
                      onClick={() =>
                        setReschedule({
                          id: appointment.id,
                          startTime: appointment.start_time,
                        })
                      }
                    >
                      <CalendarSync className="h-4 w-4" />
                      <span className="hidden sm:inline">Update time</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === appointment.id}
                      onClick={() => cancelAppointment(appointment.id)}
                    >
                      <XCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Cancel</span>
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={busyId === appointment.id}
                  onClick={() =>
                    setDeleteAppointment({
                      id: appointment.id,
                      name: apptName(appointment),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {appointments.hasNextPage && (
          <div className="border-t p-3 text-center">
            <Button
              variant="outline"
              onClick={() => appointments.fetchNextPage()}
              disabled={appointments.isFetchingNextPage}
            >
              {appointments.isFetchingNextPage
                ? 'Loading…'
                : 'Load more appointments'}
            </Button>
          </div>
        )}
      </section>

      <BookDialog
        open={bookOpen || !!reschedule}
        onOpenChange={(open) => {
          if (!open) {
            setBookOpen(false)
            setReschedule(undefined)
          }
        }}
        rescheduleId={reschedule?.id}
        initialStartTime={reschedule?.startTime}
      />
      <Dialog
        open={!!deleteAppointment}
        onOpenChange={(open) => {
          if (!open && busyId !== deleteAppointment?.id) {
            setDeleteAppointment(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete appointment permanently?</DialogTitle>
            <DialogDescription>
              This will permanently delete {deleteAppointment?.name}’s
              appointment and cannot be undone. To retain its history, use
              Cancel instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busyId === deleteAppointment?.id}
              onClick={() => setDeleteAppointment(null)}
            >
              Keep appointment
            </Button>
            <Button
              variant="destructive"
              disabled={!deleteAppointment || busyId === deleteAppointment.id}
              onClick={permanentlyDeleteAppointment}
            >
              {busyId === deleteAppointment?.id
                ? 'Deleting…'
                : 'Delete permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
