import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { BookDialog } from '@/components/clinic/BookDialog'
import { EditPatientDialog } from '@/components/clinic/EditPatientDialog'
import { TaskButton } from '@/components/clinic/TaskButton'
import { ageLabel, parseKg, fmtTime, STATUS_STYLE, useMe } from '@/lib/clinic'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  CalendarPlus,
  FilePlus2,
  Pencil,
  Printer,
} from 'lucide-react'

export const Route = createFileRoute('/_authenticated/patients/$id')({
  head: () => ({
    meta: [
      { title: 'Patient record — Fahad Clinic' },
      {
        name: 'description',
        content: 'Patient profile, visit history and weight trend.',
      },
      { property: 'og:title', content: 'Patient record — Fahad Clinic' },
      {
        property: 'og:description',
        content: 'Patient profile, visit history and weight trend.',
      },
    ],
  }),
  component: PatientPage,
})

export function usePatientHistory(id: string | null | undefined) {
  return useQuery({
    queryKey: ['patient', id],
    enabled: !!id,
    queryFn: async () => {
      const [p, rx, ap] = await Promise.all([
        supabase.from('patients').select('*').eq('id', id!).single(),
        supabase
          .from('prescriptions')
          .select('*, medications(*)')
          .eq('patient_id', id!)
          .order('created_at', { ascending: false }),
        supabase
          .from('appointments')
          .select('*')
          .eq('patient_id', id!)
          .order('start_time', { ascending: false })
          .limit(30),
      ])
      if (p.error) throw p.error
      return { patient: p.data, rx: rx.data ?? [], appts: ap.data ?? [] }
    },
  })
}

export function WeightTrend({
  rx,
  currentWeight,
  currentWeightUpdatedAt,
}: {
  rx: { created_at: string; weight: string | null }[]
  currentWeight: number | null
  currentWeightUpdatedAt: string
}) {
  const pts: { d: string; kg: number; source: 'visit' | 'profile' }[] = rx
    .map((r) => ({ d: r.created_at, kg: parseKg(r.weight) }))
    .filter((x): x is { d: string; kg: number } => x.kg != null)
    .map((point) => ({ ...point, source: 'visit' as const }))
  if (currentWeight != null) {
    pts.push({
      d: currentWeightUpdatedAt,
      kg: currentWeight,
      source: 'profile',
    })
  }
  pts.sort((a, b) => a.d.localeCompare(b.d))
  if (pts.length === 0)
    return (
      <p className="text-sm text-muted-foreground">No weights recorded yet.</p>
    )
  const max = Math.max(...pts.map((p) => p.kg))
  return (
    <div className="flex items-end gap-2 overflow-x-auto pb-1">
      {pts.map((p, i) => {
        const prev = pts[i - 1]?.kg
        const odd = prev != null && Math.abs(p.kg - prev) / prev > 0.15
        return (
          <div
            key={`${p.source}-${p.d}`}
            className="flex min-w-12 flex-col items-center gap-1"
            title={
              p.source === 'profile'
                ? 'Current profile weight'
                : odd
                  ? 'Unusual jump vs previous visit — double-check'
                  : undefined
            }
          >
            <span
              className={cn(
                'text-xs tabular-nums',
                odd && 'font-semibold text-destructive',
              )}
            >
              {p.kg}
              {odd && <AlertTriangle className="ml-0.5 inline h-3 w-3" />}
            </span>
            <div
              className={cn(
                'w-6 rounded-t',
                odd ? 'bg-destructive' : 'bg-primary',
              )}
              style={{ height: `${Math.max(8, (p.kg / max) * 80)}px` }}
            />
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(p.d), 'd MMM yy')}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function PatientPage() {
  const { id } = Route.useParams()
  const { data, isLoading } = usePatientHistory(id)
  const { data: me } = useMe()
  const [book, setBook] = useState(false)
  const [edit, setEdit] = useState(false)
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>
  if (!data) return <p>Patient not found.</p>
  const { patient: p, rx, appts } = data
  const upcoming = appts.filter(
    (a) => new Date(a.start_time) > new Date() && a.status === 'CONFIRMED',
  )

  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-lg border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0 space-y-3">
          <div className="min-w-0">
            <h1 className="break-words font-display text-3xl">{p.full_name}</h1>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                MR no. {p.medical_record_id}
              </span>
              {p.old_mr_no && ` · Old MR no. ${p.old_mr_no}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {ageLabel(p.date_of_birth) && (
              <span className="rounded-md bg-muted px-2 py-1">
                Age {ageLabel(p.date_of_birth)}
              </span>
            )}
            <span className="rounded-md bg-muted px-2 py-1">
              {p.gender === 'MALE'
                ? 'Male'
                : p.gender === 'FEMALE'
                  ? 'Female'
                  : 'Gender not set'}
            </span>
            {p.phone && (
              <span className="rounded-md bg-muted px-2 py-1">
                Phone {p.phone}
              </span>
            )}
            {p.cnic && (
              <span className="rounded-md bg-muted px-2 py-1">
                CNIC {p.cnic}
              </span>
            )}
            {p.city && (
              <span className="rounded-md bg-muted px-2 py-1">{p.city}</span>
            )}
            {p.weight_kg != null && (
              <span className="rounded-md bg-muted px-2 py-1">
                {p.weight_kg} kg
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button variant="outline" onClick={() => setEdit(true)}>
            <Pencil className="h-4 w-4" /> Edit info
          </Button>
          {me?.isDoctor && (
            <Button variant="outline" asChild>
              <Link
                to="/consultation/$appointmentId"
                params={{ appointmentId: 'new' }}
                search={{ patientId: p.id }}
              >
                <FilePlus2 className="h-4 w-4" /> New prescription
              </Link>
            </Button>
          )}
          <Button onClick={() => setBook(true)}>
            <CalendarPlus className="h-4 w-4" /> Book
          </Button>
        </div>
      </section>

      {upcoming.length > 0 && (
        <div className="rounded-lg border bg-card p-4 text-sm">
          <b>Upcoming:</b>{' '}
          {upcoming
            .map(
              (a) =>
                `${format(new Date(a.start_time), 'EEE d MMM')} ${fmtTime(a.start_time)}`,
            )
            .join(', ')}
        </div>
      )}

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 font-semibold">Weight trend</h2>
        <WeightTrend
          rx={rx}
          currentWeight={p.weight_kg}
          currentWeightUpdatedAt={p.updated_at}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Visits ({rx.length})</h2>
        {rx.length === 0 && (
          <p className="text-sm text-muted-foreground">No consultations yet.</p>
        )}
        {rx.map((r) => (
          <article key={r.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {format(new Date(r.created_at), 'd MMM yyyy')} — {r.diagnosis}
              </p>
              <div className="flex gap-1">
                <TaskButton type="PRESCRIPTION" referenceId={r.id} />
                <Button size="sm" variant="outline" asChild>
                  <Link to="/prescriptions/$id/print" params={{ id: r.id }}>
                    <Printer className="h-4 w-4" /> Print
                  </Link>
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {r.disease} · {r.symptoms}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {[
                r.bp && `BP ${r.bp}`,
                r.pulse && `Pulse ${r.pulse}`,
                r.temp_f && `Temp ${r.temp_f}°F`,
                r.weight && `Wt ${r.weight}`,
                r.sugar && `Sugar ${r.sugar}`,
                r.spo2 && `SpO₂ ${r.spo2}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {r.medications.length > 0 && (
              <ul className="mt-2 text-sm">
                {r.medications.map((m) => (
                  <li key={m.id}>
                    • {m.medicine}{' '}
                    <span className="text-muted-foreground">
                      ({m.medicine_type.toLowerCase()}) — {m.frequency}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>

      <section className="rounded-lg border bg-card">
        <h2 className="border-b px-4 py-3 font-semibold">Appointments</h2>
        <ul className="divide-y text-sm">
          {appts.map((a) => (
            <li key={a.id} className="flex justify-between px-4 py-2">
              <span>
                {format(new Date(a.start_time), 'd MMM yyyy')}{' '}
                {fmtTime(a.start_time)}
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs',
                  STATUS_STYLE[a.status],
                )}
              >
                {a.status.replace('_', ' ').toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <BookDialog open={book} onOpenChange={setBook} patient={p} />
      <EditPatientDialog open={edit} onOpenChange={setEdit} patient={p} />
    </div>
  )
}
