import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { ageLabel } from '@/lib/clinic'
import { Printer } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/prescriptions/$id/print')(
  {
    head: () => ({
      meta: [
        { title: 'Prescription — Fahad Clinic' },
        { name: 'description', content: 'Printable prescription.' },
        { property: 'og:title', content: 'Prescription — Fahad Clinic' },
        { property: 'og:description', content: 'Printable prescription.' },
      ],
    }),
    component: PrintRx,
  },
)

function PrintRx() {
  const { id } = Route.useParams()
  const { data } = useQuery({
    queryKey: ['rx', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*, medications(*), patients(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      const { data: doc } = await supabase
        .from('staff_profiles')
        .select('full_name')
        .eq('id', data.user_id)
        .maybeSingle()
      return { ...data, doctor: doc?.full_name ?? '' }
    },
  })
  if (!data) return <p className="text-muted-foreground">Loading…</p>
  const p = data.patients
  const vitals = [
    data.bp && `BP ${data.bp}`,
    data.pulse && `Pulse ${data.pulse}`,
    data.temp_f && `Temp ${data.temp_f}°F`,
    data.weight && `Wt ${data.weight}`,
    data.sugar && `Sugar ${data.sugar}`,
    data.spo2 && `SpO₂ ${data.spo2}`,
    data.rr && `RR ${data.rr}`,
  ].filter(Boolean)

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="no-print flex justify-between">
        <Button variant="ghost" asChild>
          <Link to="/today">← Back to today</Link>
        </Button>
        <Button onClick={() => window.print()} autoFocus>
          <Printer className="h-4 w-4" /> Print
        </Button>
      </div>
      <div className="rounded-lg border bg-card p-8 print:border-0 print:p-0">
        <header className="flex items-end justify-between border-b-2 border-primary pb-3">
          <div>
            <h1 className="font-display text-2xl">Fahad Clinic</h1>
            <p className="text-sm text-muted-foreground">{data.doctor}</p>
          </div>
          <p className="text-sm">
            {format(new Date(data.created_at), 'd MMM yyyy')}
          </p>
        </header>
        <div className="mt-3 grid grid-cols-2 gap-1 text-sm">
          <p>
            <b>{p.full_name}</b> · {ageLabel(p.date_of_birth)} ·{' '}
            {p.gender === 'MALE' ? 'M' : p.gender === 'FEMALE' ? 'F' : ''}
          </p>
          <p className="text-right">MR {p.medical_record_id}</p>
          {vitals.length > 0 && (
            <p className="col-span-2 text-muted-foreground">
              {vitals.join(' · ')}
            </p>
          )}
        </div>
        <div className="mt-4 space-y-1 text-sm">
          <p>
            <b>Diagnosis:</b> {data.diagnosis}
          </p>
          <p>
            <b>Complaints:</b> {data.symptoms} (since{' '}
            {format(new Date(data.since), 'd MMM yyyy')})
          </p>
          {data.allergy && (
            <p>
              <b>Allergy:</b> {data.allergy}
            </p>
          )}
          {data.chronic_disease.length > 0 && (
            <p>
              <b>Chronic:</b> {data.chronic_disease.join(', ')}
            </p>
          )}
        </div>
        <h2 className="mt-6 font-display text-3xl">℞</h2>
        <ol className="mt-2 space-y-2">
          {data.medications.map((m, i) => (
            <li
              key={m.id}
              className="flex justify-between border-b border-dashed pb-1"
            >
              <span>
                {i + 1}. <b>{m.medicine}</b>{' '}
                <span className="text-sm text-muted-foreground">
                  ({m.medicine_type.replaceAll('_', ' ').toLowerCase()})
                </span>
              </span>
              <span>{m.frequency}</span>
            </li>
          ))}
        </ol>
        {data.clinical_notes && (
          <p className="mt-6 text-sm">
            <b>Advice:</b> {data.clinical_notes}
          </p>
        )}
        <p className="mt-12 text-right text-sm">
          Signature ____________________
        </p>
      </div>
    </div>
  )
}
