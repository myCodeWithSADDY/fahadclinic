import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Switch } from '@/components/ui/switch'
import { errMsg, useMe  } from '@/lib/clinic'
import type {AppRole} from '@/lib/clinic';

export const Route = createFileRoute('/_authenticated/staff')({
  head: () => ({
    meta: [
      { title: 'Staff — Fahad Clinic' },
      { name: 'description', content: 'Manage staff roles.' },
      { property: 'og:title', content: 'Staff — Fahad Clinic' },
      { property: 'og:description', content: 'Manage staff roles.' },
    ],
  }),
  component: Staff,
})

function Staff() {
  const { data: me } = useMe()
  const qc = useQueryClient()
  const { data = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from('staff_profiles').select('*').order('created_at'),
        supabase.from('user_roles').select('user_id, role'),
      ])
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? [])
          .filter((r) => r.user_id === p.id)
          .map((r) => r.role),
      }))
    },
  })

  async function toggle(uid: string, role: AppRole, on: boolean) {
    const { error } = await supabase.rpc('set_staff_role', {
      p_user_id: uid,
      p_role: role,
      p_enabled: on,
    })
    if (error) return toast.error(errMsg(error))
    qc.invalidateQueries({ queryKey: ['staff'] })
    qc.invalidateQueries({ queryKey: ['me'] })
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Staff</h1>
      <p className="text-sm text-muted-foreground">
        New sign-ups join as Reception.{' '}
        {me?.isDoctor
          ? 'Toggle roles below.'
          : 'Only a doctor can change roles.'}
      </p>
      <div className="rounded-lg border bg-card">
        <ul className="divide-y">
          {data.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-4 px-4 py-3"
            >
              <span className="flex-1 font-medium">
                {s.full_name}
                {s.id === me?.id && (
                  <span className="text-xs text-muted-foreground"> (you)</span>
                )}
              </span>
              {(['DOCTOR', 'RECEPTIONIST'] as const).map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={s.roles.includes(r)}
                    disabled={!me?.isDoctor}
                    onCheckedChange={(v) => toggle(s.id, r, v)}
                  />
                  {r === 'DOCTOR' ? 'Doctor' : 'Reception'}
                </label>
              ))}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
