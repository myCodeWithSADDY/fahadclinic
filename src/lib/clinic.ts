import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'
import { differenceInMonths, differenceInYears, format } from 'date-fns'

export type Patient = Database['public']['Tables']['patients']['Row']
export type Appointment = Database['public']['Tables']['appointments']['Row']
export type Prescription = Database['public']['Tables']['prescriptions']['Row']
export type Medication = Database['public']['Tables']['medications']['Row']
export type AppRole = Database['public']['Enums']['app_role']
export type ApptStatus = Database['public']['Enums']['appointment_status']
export type MedicineType = Database['public']['Enums']['medicine_type']
export type ChronicDisease = Database['public']['Enums']['chronic_disease']

export const MEDICINE_TYPES: MedicineType[] = [
  'TABLET',
  'SYRUP',
  'CAPSULE',
  'SUSPENSION',
  'DROPS',
  'INJECTION',
  'SACHET',
  'CREAM',
  'OINTMENT',
  'GEL',
  'INHALER',
  'SPRAY',
  'LOTION',
  'POWDER',
  'SOLUTION',
  'LIQUID',
  'DROP',
  'DROPPER',
  'GLOBUS',
  'DRAM',
  'SUPPOSITORY',
  'EMULSION',
  'BALM',
  'SOAP',
  'SHAMPOO',
  'FACEWASH',
  'TEASPOON',
  'AS_PER_NEED',
  'HALF_HOUR_BEFORE_MEAL',
  'FIVE_TIMES_A_DAY',
  'PO',
  'IV',
  'IM',
  'IG',
  'SC',
  'SL',
  'PR',
]
export const CHRONIC: ChronicDisease[] = ['DM', 'HTN', 'IHD', 'RA', 'Others']

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) return null
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', u.user.id),
        supabase
          .from('staff_profiles')
          .select('*')
          .eq('id', u.user.id)
          .maybeSingle(),
      ])
      const r = (roles ?? []).map((x) => x.role)
      return {
        id: u.user.id,
        email: u.user.email,
        name: profile?.full_name ?? u.user.email,
        roles: r,
        isDoctor: r.includes('DOCTOR'),
        isReception: r.includes('RECEPTIONIST'),
      }
    },
    staleTime: 60_000,
  })
}

export function ageLabel(dob: string | null | undefined) {
  if (!dob) return ''
  const d = new Date(dob)
  const y = differenceInYears(new Date(), d)
  if (y >= 2) return `${y}y`
  return `${differenceInMonths(new Date(), d)}m`
}

export function parseKg(w: string | null | undefined): number | null {
  if (!w) return null
  const n = parseFloat(w.replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 && n <= 500 ? n : null
}

export function timeSlots() {
  const out: string[] = []
  for (let h = 19; h <= 23; h++)
    for (const m of h === 23 ? [0] : [0, 15, 30, 45])
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  return out
}

export function nextSlot(from = new Date()) {
  const d = new Date(from)
  d.setSeconds(0, 0)
  d.setMinutes(Math.ceil((d.getMinutes() + 1) / 15) * 15)
  return d
}

export function toISO(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString()
}

export function fmtTime(iso: string) {
  return format(new Date(iso), 'h:mm a')
}

export function errMsg(e: unknown) {
  const m = (e as { message?: string }).message ?? String(e)
  if (m.includes('TIME_SLOT_TAKEN'))
    return 'That time slot is already booked. Pick another time.'
  if (m.includes('patients_cnic_key'))
    return 'A patient with this CNIC already exists.'
  if (m.includes('patients_old_mr_no_key'))
    return 'A patient with this old MR number already exists.'
  return m
}

export const STATUS_STYLE: Record<ApptStatus, string> = {
  CONFIRMED: 'bg-secondary text-secondary-foreground',
  CHECKED_IN: 'bg-accent text-accent-foreground',
  COMPLETED: 'bg-success text-success-foreground',
  NO_SHOW: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-destructive/15 text-destructive',
  RESCHEDULED: 'bg-info/15 text-info',
}

export function apptName(a: {
  walk_in_name: string | null
  patients?: { full_name: string } | null
}) {
  return a.patients?.full_name ?? a.walk_in_name ?? 'Unknown'
}
