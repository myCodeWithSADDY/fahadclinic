import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { RegisterPatientDialog } from '@/components/clinic/RegisterPatientDialog'
import { SlotPicker } from '@/components/clinic/SlotPicker'
import { usePatientHistory, WeightTrend } from './patients.$id'
import {
  ageLabel,
  CHRONIC,
  errMsg,
  MEDICINE_TYPES,
  toISO,
  useMe
  
  
  
} from '@/lib/clinic'
import type {ChronicDisease, MedicineType, Patient} from '@/lib/clinic';
import { cn } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'

export const Route = createFileRoute(
  '/_authenticated/consultation/$appointmentId',
)({
  head: () => ({
    meta: [
      { title: 'Consultation — Fahad Clinic' },
      {
        name: 'description',
        content:
          'Record diagnosis, vitals, medicines and follow-up in one save.',
      },
      { property: 'og:title', content: 'Consultation — Fahad Clinic' },
      { property: 'og:description', content: 'One-save consultation form.' },
    ],
  }),
  validateSearch: (
    s: Record<string, unknown>,
  ): { patientId?: string; rxId?: string } => ({
    patientId: typeof s['patientId'] === 'string' ? s['patientId'] : undefined,
    rxId: typeof s['rxId'] === 'string' ? s['rxId'] : undefined,
  }),
  component: Consultation,
})

type Med = {
  medicine: string
  medicineType: MedicineType
  frequency: string
  insideMedicine: string
}
const blankMed = (): Med => ({
  medicine: '',
  medicineType: 'TABLET',
  frequency: '',
  insideMedicine: '',
})

function Consultation() {
  const { appointmentId } = Route.useParams()
  const search = Route.useSearch()
  const isNew = appointmentId === 'new'
  const rxId = search.rxId
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: me } = useMe()
  const { data: appt } = useQuery({
    queryKey: ['appt', appointmentId],
    enabled: !isNew,
    queryFn: async () =>
      (
        await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointmentId)
          .single()
      ).data,
  })
  const { data: existing } = useQuery({
    queryKey: ['rx-edit', rxId],
    enabled: !!rxId,
    queryFn: async () =>
      (
        await supabase
          .from('prescriptions')
          .select('*, medications(*)')
          .eq('id', rxId!)
          .single()
      ).data,
  })
  const [patientOverride, setPatientOverride] = useState<Patient | null>(null)
  const patientId =
    patientOverride?.id ??
    appt?.patient_id ??
    search.patientId ??
    existing?.patient_id
  const { data: hist } = usePatientHistory(patientId)
  const [regOpen, setRegOpen] = useState(false)

  const [f, setF] = useState({
    diagnosis: '',
    disease: '',
    symptoms: '',
    since: format(new Date(), 'yyyy-MM-dd'),
    bp: '',
    pulse: '',
    temp_f: '',
    weight: '',
    sugar: '',
    spo2: '',
    rr: '',
    clinical_notes: '',
    fee: '',
    previous_report: '',
    allergy: '',
  })
  const [chronic, setChronic] = useState<ChronicDisease[]>([])
  const [meds, setMeds] = useState<Med[]>([blankMed()])
  const [fu, setFu] = useState(false)
  const [fuDate, setFuDate] = useState(
    format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd'),
  )
  const [fuTime, setFuTime] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!existing) return
    const e = existing
    setF({
      diagnosis: e.diagnosis,
      disease: e.disease,
      symptoms: e.symptoms,
      since: e.since,
      bp: e.bp ?? '',
      pulse: e.pulse ?? '',
      temp_f: e.temp_f ?? '',
      weight: e.weight ?? '',
      sugar: e.sugar ?? '',
      spo2: e.spo2 ?? '',
      rr: e.rr ?? '',
      clinical_notes: e.clinical_notes ?? '',
      fee: e.fee != null ? String(e.fee) : '',
      previous_report: e.previous_report ?? '',
      allergy: e.allergy ?? '',
    })
    setChronic(e.chronic_disease)
    setMeds(
      e.medications.length
        ? e.medications.map((m) => ({
            medicine: m.medicine,
            medicineType: m.medicine_type,
            frequency: m.frequency,
            insideMedicine: m.inside_medicine ?? '',
          }))
        : [blankMed()],
    )
  }, [existing])
  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF({ ...f, [k]: e.target.value })

  if (me && !me.isDoctor) return <p>Only doctors can record consultations.</p>
  if ((!isNew && !appt) || (rxId && !existing))
    return <p className="text-muted-foreground">Loading…</p>

  async function save() {
    if (!patientId) return toast.error('Register this walk-in first')
    if (!f.diagnosis.trim() || !f.disease.trim() || !f.symptoms.trim())
      return toast.error('Diagnosis, disease and symptoms are required')
    if (fu && !fuTime) return toast.error('Pick a follow-up time')
    const medications = meds
      .filter((m) => m.medicine.trim())
      .map((m) => ({ ...m, frequency: m.frequency || '—' }))
    setBusy(true)
    if (rxId) {
      const { error } = await supabase.rpc('update_prescription', {
        p_id: rxId,
        p_diagnosis: f.diagnosis,
        p_disease: f.disease,
        p_symptoms: f.symptoms,
        p_since: f.since,
        p_bp: f.bp || undefined,
        p_pulse: f.pulse || undefined,
        p_temp_f: f.temp_f || undefined,
        p_weight: f.weight || undefined,
        p_sugar: f.sugar || undefined,
        p_spo2: f.spo2 || undefined,
        p_rr: f.rr || undefined,
        p_clinical_notes: f.clinical_notes || undefined,
        p_fee: f.fee ? Number(f.fee) : undefined,
        p_chronic_disease: chronic,
        p_previous_report: f.previous_report || undefined,
        p_allergy: f.allergy || undefined,
        p_medications: medications,
      })
      setBusy(false)
      if (error) return toast.error(errMsg(error))
      toast.success('Prescription updated')
      qc.invalidateQueries()
      navigate({ to: '/prescriptions/$id/print', params: { id: rxId } })
      return
    }
    const { data, error } = await supabase.rpc('complete_consultation', {
      p_patient_id: patientId,
      p_appointment_id: (isNew ? null : appointmentId) as string,
      p_diagnosis: f.diagnosis,
      p_disease: f.disease,
      p_symptoms: f.symptoms,
      p_since: f.since,
      p_bp: f.bp || undefined,
      p_pulse: f.pulse || undefined,
      p_temp_f: f.temp_f || undefined,
      p_weight: f.weight || undefined,
      p_sugar: f.sugar || undefined,
      p_spo2: f.spo2 || undefined,
      p_rr: f.rr || undefined,
      p_clinical_notes: f.clinical_notes || undefined,
      p_fee: f.fee ? Number(f.fee) : undefined,
      p_chronic_disease: chronic,
      p_previous_report: f.previous_report || undefined,
      p_allergy: f.allergy || undefined,
      p_medications: medications,
      p_follow_up_start: fu ? toISO(fuDate, fuTime) : undefined,
    })
    setBusy(false)
    if (error) return toast.error(errMsg(error))
    toast.success('Consultation saved')
    qc.invalidateQueries()
    const newRx = (data as { prescriptionId: string }).prescriptionId
    navigate({ to: '/prescriptions/$id/print', params: { id: newRx } })
  }

  const p = hist?.patient
  const last = hist?.rx[0]

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-3xl">
              {p?.full_name ?? appt?.walk_in_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {p
                ? `${p.medical_record_id} · ${ageLabel(p.date_of_birth)} · ${p.gender ?? ''}`
                : 'Unregistered walk-in'}
              {appt?.complaints ? ` · ${appt.complaints}` : ''}
              {rxId ? ' · Editing prescription' : ''}
            </p>
          </div>
          {!patientId && !isNew && (
            <Button onClick={() => setRegOpen(true)}>Register patient</Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Diagnosis *">
            <Input autoFocus value={f.diagnosis} onChange={set('diagnosis')} />
          </Field>
          <Field label="Disease *">
            <Input value={f.disease} onChange={set('disease')} />
          </Field>
          <Field label="Symptoms *">
            <Input value={f.symptoms} onChange={set('symptoms')} />
          </Field>
          <Field label="Since">
            <Input type="date" value={f.since} onChange={set('since')} />
          </Field>
        </div>

        <div>
          <Label>Vitals</Label>
          <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-7">
            {(
              [
                'bp',
                'pulse',
                'temp_f',
                'weight',
                'sugar',
                'spo2',
                'rr',
              ] as const
            ).map((k) => (
              <Input
                key={k}
                placeholder={
                  {
                    bp: 'BP',
                    pulse: 'Pulse',
                    temp_f: 'Temp °F',
                    weight: 'Weight kg',
                    sugar: 'Sugar',
                    spo2: 'SpO₂',
                    rr: 'RR',
                  }[k]
                }
                value={f[k]}
                onChange={set(k)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Label className="mr-2">Chronic</Label>
          {CHRONIC.map((c) => (
            <Button
              key={c}
              size="sm"
              type="button"
              variant={chronic.includes(c) ? 'default' : 'outline'}
              onClick={() =>
                setChronic(
                  chronic.includes(c)
                    ? chronic.filter((x) => x !== c)
                    : [...chronic, c],
                )
              }
            >
              {c}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Medicines</Label>
          {meds.map((m, i) => (
            <div key={i} className="grid grid-cols-[1fr_130px_1fr_auto] gap-2">
              <Input
                placeholder="Medicine"
                value={m.medicine}
                onChange={(e) =>
                  setMeds(
                    meds.map((x, j) =>
                      j === i ? { ...x, medicine: e.target.value } : x,
                    ),
                  )
                }
              />
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={m.medicineType}
                onChange={(e) =>
                  setMeds(
                    meds.map((x, j) =>
                      j === i
                        ? { ...x, medicineType: e.target.value as MedicineType }
                        : x,
                    ),
                  )
                }
              >
                {MEDICINE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replaceAll('_', ' ').toLowerCase()}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Dose / frequency (e.g. 1+0+1 x 5d)"
                value={m.frequency}
                onChange={(e) =>
                  setMeds(
                    meds.map((x, j) =>
                      j === i ? { ...x, frequency: e.target.value } : x,
                    ),
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && i === meds.length - 1)
                    setMeds([...meds, blankMed()])
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  setMeds(
                    meds.length > 1
                      ? meds.filter((_, j) => j !== i)
                      : [blankMed()],
                  )
                }
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMeds([...meds, blankMed()])}
          >
            <Plus className="h-4 w-4" /> Add medicine
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Allergy">
            <Input value={f.allergy} onChange={set('allergy')} />
          </Field>
          <Field label="Previous report">
            <Input
              value={f.previous_report}
              onChange={set('previous_report')}
            />
          </Field>
        </div>
        <Field label="Clinical notes">
          <Textarea
            rows={3}
            value={f.clinical_notes}
            onChange={set('clinical_notes')}
          />
        </Field>

        {!rxId && (
          <div className="space-y-2 rounded-lg border bg-card p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch checked={fu} onCheckedChange={setFu} /> Book follow-up
            </label>
            {fu && !rxId && (
              <SlotPicker
                date={fuDate}
                time={fuTime}
                onDate={setFuDate}
                onTime={setFuTime}
              />
            )}
          </div>
        )}

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t bg-background py-3">
          <Input
            className="w-32"
            placeholder="Fee (Rs)"
            inputMode="numeric"
            value={f.fee}
            onChange={set('fee')}
          />
          <Button size="lg" onClick={save} disabled={busy || !patientId}>
            {busy ? 'Saving…' : rxId ? 'Update & print' : 'Save & print'}
          </Button>
        </div>
      </div>

      <aside className="space-y-4">
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 font-semibold">Weight</h2>
          {hist ? (
            <WeightTrend rx={hist.rx} />
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </section>
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 font-semibold">History</h2>
          {!hist?.rx.length && (
            <p className="text-sm text-muted-foreground">First visit.</p>
          )}
          {last && (
            <Button
              size="sm"
              variant="outline"
              className="mb-2 w-full"
              onClick={() => {
                setMeds(
                  last.medications.length
                    ? last.medications.map((m) => ({
                        medicine: m.medicine,
                        medicineType: m.medicine_type,
                        frequency: m.frequency,
                        insideMedicine: m.inside_medicine ?? '',
                      }))
                    : [blankMed()],
                )
                setChronic(last.chronic_disease)
                setF((x) => ({
                  ...x,
                  allergy: x.allergy || last.allergy || '',
                }))
              }}
            >
              Repeat last medicines
            </Button>
          )}
          <ul className="space-y-3 text-sm">
            {hist?.rx.slice(0, 8).map((r) => (
              <li key={r.id} className={cn('border-l-2 border-primary pl-2')}>
                <p className="font-medium">
                  {format(new Date(r.created_at), 'd MMM yy')} · {r.diagnosis}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.medications.map((m) => m.medicine).join(', ')}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </aside>

      <RegisterPatientDialog
        open={regOpen}
        onOpenChange={setRegOpen}
        initial={{
          full_name: appt?.walk_in_name ?? '',
          phone: appt?.walk_in_phone ?? '',
          gender: appt?.walk_in_gender,
        }}
        onSelected={(pt) => {
          setPatientOverride(pt)
          setRegOpen(false)
        }}
        title="Register walk-in"
      />
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
