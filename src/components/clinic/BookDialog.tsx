import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { supabase } from '@/integrations/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PatientPicker } from './PatientPicker'
import { SlotPicker } from './SlotPicker'
import { ageLabel, errMsg, nextSlot, toISO } from '@/lib/clinic'
import type { Patient } from '@/lib/clinic'
import { X } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (o: boolean) => void
  patient?: Patient | null
  walkIn?: boolean
  rescheduleId?: string
  initialStartTime?: string
}

function ageToDob(age: string): string | null {
  const value = age.trim().toLowerCase()

  const match = value.match(/^(\d+)\s*(y|m)$/)
  if (!match) return null

  const amount = Number(match[1])
  const unit = match[2]

  if (amount < 0 || amount > 150 * 12) return null
  if (unit === 'y' && amount > 150) return null
  if (unit === 'm' && amount > 1800) return null

  const dob = new Date()
  dob.setDate(1)

  if (unit === 'y') {
    dob.setFullYear(dob.getFullYear() - amount)
  } else {
    dob.setMonth(dob.getMonth() - amount)
  }

  return format(dob, 'yyyy-MM-dd')
}

export function BookDialog({
  open,
  onOpenChange,
  patient: initialPatient,
  walkIn,
  rescheduleId,
  initialStartTime,
}: Props) {
  const qc = useQueryClient()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [mode, setMode] = useState<'patient' | 'walkin'>('patient')
  const [w, setW] = useState({
    name: '',
    phone: '',
    age: '',
    gender: '' as '' | 'MALE' | 'FEMALE',
  })
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [service, setService] = useState<'CONSULTATION' | 'MEDICINE'>(
    'CONSULTATION',
  )
  const [type, setType] = useState<'REGULAR_CHECKUP' | 'TELEMEDICINE'>(
    'REGULAR_CHECKUP',
  )
  const [complaints, setComplaints] = useState('')
  const [checkIn, setCheckIn] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const s = initialStartTime ? new Date(initialStartTime) : nextSlot()
    setPatient(initialPatient ?? null)
    setMode(walkIn && !initialPatient ? 'walkin' : 'patient')
    setW({ name: '', phone: '', age: '', gender: '' })
    setDate(format(s, 'yyyy-MM-dd'))
    setTime(format(s, 'HH:mm'))
    setService('CONSULTATION')
    setType('REGULAR_CHECKUP')
    setComplaints('')
    setCheckIn(!!walkIn)
  }, [open, initialPatient, initialStartTime, walkIn])


async function save() {
  if (!time) return toast.error('Pick a time')

  if (mode === 'walkin' && w.age.trim() && !ageToDob(w.age)) {
    return toast.error('Enter age like 4y or 6m')
  }

  setBusy(true)

  try {
    const start = toISO(date, time)

    const res = rescheduleId
      ? await supabase.rpc('reschedule_appointment', {
          p_id: rescheduleId,
          p_start: start,
        })
      : await supabase.rpc(
          'book_appointment',
          clean({
            p_start: start,
            p_patient_id: mode === 'patient' ? patient?.id : undefined,
            p_walk_in_name: mode === 'walkin' ? w.name.trim() : undefined,
            p_walk_in_phone:
              mode === 'walkin' ? w.phone.trim() || undefined : undefined,
            p_walk_in_age:
              mode === 'walkin' ? w.age.trim() || undefined : undefined,
            p_walk_in_gender:
              mode === 'walkin' && w.gender ? w.gender : undefined,
            p_service: service,
            p_type: type,
            p_complaints: complaints.trim() || undefined,
            p_status: checkIn
              ? ('CHECKED_IN' as const)
              : ('CONFIRMED' as const),
          }),
        )

    if (res.error) {
      toast.error(errMsg(res.error))
      return
    }

    toast.success(
      rescheduleId
        ? 'Rescheduled'
        : checkIn
          ? 'Booked and checked in'
          : 'Appointment booked',
    )

    await Promise.all([
      qc.invalidateQueries({ queryKey: ['appts'] }),
      qc.invalidateQueries({ queryKey: ['taken'] }),
      qc.invalidateQueries({ queryKey: ['patient'] }),
    ])

    onOpenChange(false)
  } catch (error) {
    toast.error(errMsg(error))
  } finally {
    setBusy(false)
  }
}


  const canSave =
    rescheduleId || (mode === 'patient' ? !!patient : w.name.trim().length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {rescheduleId
              ? 'Reschedule'
              : walkIn
                ? 'Walk-in'
                : 'Book appointment'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!rescheduleId && (
            <>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={mode === 'patient' ? 'default' : 'outline'}
                  onClick={() => setMode('patient')}
                >
                  Registered patient
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'walkin' ? 'default' : 'outline'}
                  onClick={() => setMode('walkin')}
                >
                  Unregistered walk-in
                </Button>
              </div>
              {mode === 'patient' ? (
                patient ? (
                  <div className="flex items-center justify-between rounded-md bg-secondary px-3 py-2 text-sm">
                    <span>
                      <b>{patient.full_name}</b> ·{' '}
                      {ageLabel(patient.date_of_birth)} ·{' '}
                      {patient.medical_record_id}
                    </span>
                    <button
                      onClick={() => setPatient(null)}
                      aria-label="Change patient"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <PatientPicker onPick={setPatient} autoFocus />
                )
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Name *"
                    value={w.name}
                    onChange={(e) => setW({ ...w, name: e.target.value })}
                    autoFocus
                  />
                  <Input
                    placeholder="Phone"
                    value={w.phone}
                    onChange={(e) => setW({ ...w, phone: e.target.value })}
                  />
                  <Input
                    placeholder="Age (e.g. 4y or 6m)"
                    value={w.age}
                    onChange={(e) => setW({ ...w, age: e.target.value })}
                  />
                  <div className="flex gap-1">
                    {(['MALE', 'FEMALE'] as const).map((g) => (
                      <Button
                        key={g}
                        type="button"
                        size="sm"
                        className="flex-1"
                        variant={w.gender === g ? 'default' : 'outline'}
                        onClick={() => setW({ ...w, gender: g })}
                      >
                        {g === 'MALE' ? 'M' : 'F'}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="space-y-1">
            <Label>When</Label>
            <SlotPicker
              date={date}
              time={time}
              onDate={setDate}
              onTime={setTime}
            />
          </div>

          {!rescheduleId && (
            <>
              <div className="flex flex-wrap gap-4">
                <div className="flex gap-1">
                  {(['CONSULTATION', 'MEDICINE'] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={service === s ? 'secondary' : 'ghost'}
                      onClick={() => setService(s)}
                    >
                      {s === 'CONSULTATION' ? 'Consultation' : 'Medicine'}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {(['REGULAR_CHECKUP', 'TELEMEDICINE'] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={type === s ? 'secondary' : 'ghost'}
                      onClick={() => setType(s)}
                    >
                      {s === 'REGULAR_CHECKUP' ? 'In clinic' : 'Telemedicine'}
                    </Button>
                  ))}
                </div>
              </div>
              <Input
                placeholder="Complaints (optional)"
                value={complaints}
                onChange={(e) => setComplaints(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={checkIn} onCheckedChange={setCheckIn} /> Check
                in now (patient is here)
              </label>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy || !canSave}>
              {busy ? 'Saving…' : rescheduleId ? 'Move appointment' : 'Book'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function clean<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined),
  ) as T
}
