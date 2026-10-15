import { useEffect, useState } from 'react'
import {
  addMonths,
  addYears,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  subDays,
  subMonths,
  subYears,
} from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errMsg } from '@/lib/clinic'
import type { Patient } from '@/lib/clinic'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient: Patient
}

type PatientForm = {
  full_name: string
  age_y: string
  age_m: string
  age_d: string
  gender: '' | 'MALE' | 'FEMALE'
  weight_kg: string
  phone: string
  cnic: string
  old_mr_no: string
  city: string
}

function ageParts(dateOfBirth: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dob = new Date(`${dateOfBirth}T00:00:00`)
  const years = differenceInYears(today, dob)
  const afterYears = addYears(dob, years)
  const months = differenceInMonths(today, afterYears)
  const afterMonths = addMonths(afterYears, months)
  const days = differenceInDays(today, afterMonths)

  return {
    age_y: String(years),
    age_m: String(months),
    age_d: String(days),
  }
}

const toForm = (patient: Patient): PatientForm => ({
  full_name: patient.full_name,
  ...ageParts(patient.date_of_birth),
  gender: patient.gender ?? '',
  weight_kg: patient.weight_kg?.toString() ?? '',
  phone: patient.phone ?? '',
  cnic: patient.cnic ?? '',
  old_mr_no: patient.old_mr_no ?? '',
  city: patient.city ?? '',
})

export function EditPatientDialog({ open, onOpenChange, patient }: Props) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(() => toForm(patient))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setForm(toForm(patient))
  }, [open, patient])

  function set<TKey extends keyof PatientForm>(
    key: TKey,
    value: PatientForm[TKey],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const years = Number(form.age_y || '0')
    const months = Number(form.age_m || '0')
    const days = Number(form.age_d || '0')
    if (
      !Number.isInteger(years) ||
      !Number.isInteger(months) ||
      !Number.isInteger(days) ||
      years < 0 ||
      years > 130 ||
      months < 0 ||
      months > 11 ||
      days < 0 ||
      days > 30
    ) {
      toast.error('Enter a valid age in years, months and days.')
      return
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateOfBirth = subYears(
      subMonths(subDays(today, days), months),
      years,
    )
    const dateOfBirthString = [
      dateOfBirth.getFullYear(),
      String(dateOfBirth.getMonth() + 1).padStart(2, '0'),
      String(dateOfBirth.getDate()).padStart(2, '0'),
    ].join('-')
    const weight = form.weight_kg.trim() ? Number(form.weight_kg) : null
    if (weight != null && !(weight > 0 && weight <= 500)) {
      toast.error('Weight must be between 0 and 500 kg.')
      return
    }

    setBusy(true)
    const { error } = await supabase
      .from('patients')
      .update({
        full_name: form.full_name.trim(),
        date_of_birth: dateOfBirthString,
        gender: form.gender || null,
        weight_kg: weight,
        phone: form.phone.trim() || null,
        cnic: form.cnic.trim() || null,
        old_mr_no: form.old_mr_no.trim() || null,
        city: form.city.trim() || null,
      })
      .eq('id', patient.id)
    setBusy(false)

    if (error) {
      toast.error(errMsg(error))
      return
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] }),
      queryClient.invalidateQueries({ queryKey: ['patients'] }),
    ])
    toast.success('Patient information updated.')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit patient information</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label htmlFor="patient-full-name">Full name *</Label>
            <Input
              id="patient-full-name"
              value={form.full_name}
              onChange={(event) => set('full_name', event.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>
              Age *{' '}
              <span className="text-xs font-normal text-muted-foreground">
                (years / months / days)
              </span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                min={0}
                max={130}
                placeholder="Years"
                value={form.age_y}
                onChange={(event) => set('age_y', event.target.value)}
              />
              <Input
                type="number"
                min={0}
                max={11}
                placeholder="Months"
                value={form.age_m}
                onChange={(event) => set('age_m', event.target.value)}
              />
              <Input
                type="number"
                min={0}
                max={30}
                placeholder="Days"
                value={form.age_d}
                onChange={(event) => set('age_d', event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Gender</Label>
            <div className="flex gap-1">
              {(['MALE', 'FEMALE'] as const).map((gender) => (
                <Button
                  key={gender}
                  type="button"
                  size="sm"
                  variant={form.gender === gender ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => set('gender', gender)}
                >
                  {gender === 'MALE' ? 'Male' : 'Female'}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant={!form.gender ? 'default' : 'outline'}
                onClick={() => set('gender', '')}
              >
                —
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="patient-weight">Weight (kg)</Label>
            <Input
              id="patient-weight"
              type="number"
              step="0.01"
              min={0}
              max={500}
              inputMode="decimal"
              value={form.weight_kg}
              onChange={(event) => set('weight_kg', event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="patient-phone">Phone</Label>
            <Input
              id="patient-phone"
              inputMode="tel"
              value={form.phone}
              onChange={(event) => set('phone', event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="patient-cnic">CNIC</Label>
            <Input
              id="patient-cnic"
              value={form.cnic}
              onChange={(event) => set('cnic', event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="patient-old-mr">Old MR no.</Label>
            <Input
              id="patient-old-mr"
              value={form.old_mr_no}
              onChange={(event) => set('old_mr_no', event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="patient-city">City</Label>
            <Input
              id="patient-city"
              value={form.city}
              onChange={(event) => set('city', event.target.value)}
            />
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
