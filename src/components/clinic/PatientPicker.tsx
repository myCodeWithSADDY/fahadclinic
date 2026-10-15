import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Input } from '@/components/ui/input'
import { ageLabel  } from '@/lib/clinic'
import type {Patient} from '@/lib/clinic';

export function usePatientSearch(q: string) {
  const [results, setResults] = useState<Patient[]>([])
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) return setResults([])
    const t = setTimeout(async () => {
      const safe = term.replace(/[,()]/g, ' ')
      const { data } = await supabase
        .from('patients')
        .select('*')
        .or(
          `full_name.ilike.%${safe}%,phone.ilike.%${safe}%,medical_record_id.ilike.%${safe}%,cnic.ilike.%${safe}%,old_mr_no.ilike.%${safe}%`,
        )
        .order('full_name')
        .limit(8)
      setResults(data ?? [])
    }, 250)
    return () => clearTimeout(t)
  }, [q])
  return results
}

export function PatientPicker({
  onPick,
  autoFocus,
}: {
  onPick: (p: Patient) => void
  autoFocus?: boolean
}) {
  const [q, setQ] = useState('')
  const results = usePatientSearch(q)
  return (
    <div className="space-y-1">
      <Input
        placeholder="Search name, phone, MR no., CNIC…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
      />
      {results.length > 0 && (
        <div className="max-h-56 overflow-auto rounded-md border bg-popover">
          {results.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => {
                onPick(p)
                setQ('')
              }}
              className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-secondary"
            >
              <span>
                <b>{p.full_name}</b> · {ageLabel(p.date_of_birth)}{' '}
                {p.phone ? `· ${p.phone}` : ''}
              </span>
              <span className="text-xs text-muted-foreground">
                {p.medical_record_id}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
