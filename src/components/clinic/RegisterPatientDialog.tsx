import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
import { ageLabel, errMsg  } from '@/lib/clinic'
import type {Patient} from '@/lib/clinic';

type Props = {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial?: {
    full_name?: string
    phone?: string
    gender?: 'MALE' | 'FEMALE' | null
  }
  onSelected: (p: Patient) => void
  title?: string
}

export function RegisterPatientDialog({
  open,
  onOpenChange,
  initial,
  onSelected,
  title,
}: Props) {
  const qc = useQueryClient()
  const empty = {
    full_name: '',
    gender: '' as '' | 'MALE' | 'FEMALE',
    age_y: '',
    age_m: '',
    age_d: '',
    weight_kg: '',
    phone: '',
    cnic: '',
    old_mr_no: '',
    city: '',
  }
  const [f, setF] = useState(empty)
  const [matches, setMatches] = useState<Patient[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setF({
        ...empty,
        full_name: initial?.full_name ?? '',
        gender: initial?.gender ?? '',
        phone: initial?.phone ?? '',
      })
      setMatches([])
    }
  }, [open, initial?.full_name, initial?.phone, initial?.gender])

  // Soft duplicate check: phone (family members may share), cnic, old MR no.
  useEffect(() => {
    const ors: string[] = []
    if (f.phone.trim().length >= 7) ors.push(`phone.eq.${f.phone.trim()}`)
    if (f.cnic.trim().length >= 5) ors.push(`cnic.eq.${f.cnic.trim()}`)
    if (f.old_mr_no.trim()) ors.push(`old_mr_no.eq.${f.old_mr_no.trim()}`)
    if (!ors.length) {
      setMatches([])
      return undefined
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .or(ors.join(','))
        .limit(6)
      setMatches(data ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [f.phone, f.cnic, f.old_mr_no])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const y = parseInt(f.age_y || '0', 10),
      m = parseInt(f.age_m || '0', 10),
      d = parseInt(f.age_d || '0', 10)
    if (!(y > 0 || m > 0 || d > 0))
      return toast.error('Enter age in years, months or days.')
    const dob = new Date()
    dob.setFullYear(dob.getFullYear() - y)
    dob.setMonth(dob.getMonth() - m)
    dob.setDate(dob.getDate() - d)
    const dobStr = `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, '0')}-${String(dob.getDate()).padStart(2, '0')}`
    const w = f.weight_kg.trim() ? parseFloat(f.weight_kg) : null
    if (w != null && !(w > 0 && w <= 500))
      return toast.error('Weight must be between 0 and 500 kg.')
    setBusy(true)
    const { data, error } = await supabase
      .from('patients')
      .insert({
        full_name: f.full_name.trim(),
        gender: f.gender || null,
        date_of_birth: dobStr,
        weight_kg: w,
        phone: f.phone.trim() || null,
        cnic: f.cnic.trim() || null,
        old_mr_no: f.old_mr_no.trim() || null,
        city: f.city.trim() || null,
      })
      .select()
      .single()
    setBusy(false)
    if (error) return toast.error(errMsg(error))
    toast.success(`Registered ${data.full_name} · ${data.medical_record_id}`)
    qc.invalidateQueries({ queryKey: ['patients'] })
    onSelected(data)
    onOpenChange(false)
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title ?? 'Register patient'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Full name *</Label>
            <Input
              value={f.full_name}
              onChange={set('full_name')}
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
                value={f.age_y}
                onChange={set('age_y')}
              />
              <Input
                type="number"
                min={0}
                max={11}
                placeholder="Months"
                value={f.age_m}
                onChange={set('age_m')}
              />
              <Input
                type="number"
                min={0}
                max={30}
                placeholder="Days"
                value={f.age_d}
                onChange={set('age_d')}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Weight (kg)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              max={500}
              inputMode="decimal"
              placeholder="e.g. 12.5"
              value={f.weight_kg}
              onChange={set('weight_kg')}
            />
          </div>
          <div className="space-y-1">
            <Label>Gender</Label>
            <div className="flex gap-1">
              {(['MALE', 'FEMALE'] as const).map((g) => (
                <Button
                  key={g}
                  type="button"
                  size="sm"
                  variant={f.gender === g ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setF({ ...f, gender: g })}
                >
                  {g === 'MALE' ? 'Male' : 'Female'}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={f.phone} onChange={set('phone')} inputMode="tel" />
          </div>
          <div className="space-y-1">
            <Label>CNIC</Label>
            <Input value={f.cnic} onChange={set('cnic')} />
          </div>
          <div className="space-y-1">
            <Label>Old MR no.</Label>
            <Input value={f.old_mr_no} onChange={set('old_mr_no')} />
          </div>
          <div className="space-y-1">
            <Label>City</Label>
            <Input value={f.city} onChange={set('city')} />
          </div>

          {matches.length > 0 && (
            <div className="col-span-2 rounded-lg border border-warning bg-warning/15 p-3">
              <p className="mb-2 text-sm font-semibold text-warning-foreground">
                Is this them? Matching records found:
              </p>
              <div className="space-y-1.5">
                {matches.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => {
                      onSelected(m)
                      onOpenChange(false)
                    }}
                    className="flex w-full items-center justify-between rounded-md bg-card px-3 py-2 text-left text-sm hover:bg-secondary"
                  >
                    <span>
                      <b>{m.full_name}</b> · {ageLabel(m.date_of_birth)} ·{' '}
                      {m.phone ?? 'no phone'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {m.medical_record_id} · Use this →
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Siblings may share a phone — register a new record if this is a
                different person.
              </p>
            </div>
          )}

          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Register new patient'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
