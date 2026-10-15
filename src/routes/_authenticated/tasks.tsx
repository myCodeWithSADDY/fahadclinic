import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { errMsg, useMe  } from '@/lib/clinic'
import type {AppRole} from '@/lib/clinic';
import { Check } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/tasks')({
  head: () => ({
    meta: [
      { title: 'Tasks — Fahad Clinic' },
      {
        name: 'description',
        content: 'Shared handoff tasks between doctor and reception.',
      },
      { property: 'og:title', content: 'Tasks — Fahad Clinic' },
      { property: 'og:description', content: 'Shared handoff tasks.' },
    ],
  }),
  component: Tasks,
})

function Tasks() {
  const { data: me } = useMe()
  const qc = useQueryClient()
  const [role, setRole] = useState<AppRole | 'ALL' | null>(null)
  const [showDone, setShowDone] = useState(false)
  const r = role ?? (me?.isDoctor ? 'DOCTOR' : 'RECEPTIONIST')
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', r, showDone],
    queryFn: async () => {
      let q = supabase
        .from('tasks')
        .select('*')
        .eq('status', showDone ? 'DONE' : 'PENDING')
        .order('created_at', { ascending: false })
        .limit(100)
      if (r !== 'ALL') q = q.eq('assigned_role', r)
      return (await q).data ?? []
    },
  })

  async function done(id: string) {
    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'DONE',
        completed_by: me!.id,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) return toast.error(errMsg(error))
    qc.invalidateQueries({ queryKey: ['tasks'] })
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Tasks</h1>
      <div className="flex flex-wrap gap-1">
        {(['RECEPTIONIST', 'DOCTOR', 'ALL'] as const).map((x) => (
          <Button
            key={x}
            size="sm"
            variant={r === x ? 'default' : 'outline'}
            onClick={() => setRole(x)}
          >
            {x === 'ALL' ? 'Everyone' : x === 'DOCTOR' ? 'Doctor' : 'Reception'}
          </Button>
        ))}
        <Button
          size="sm"
          variant={showDone ? 'secondary' : 'ghost'}
          onClick={() => setShowDone(!showDone)}
        >
          {showDone ? 'Showing done' : 'Show done'}
        </Button>
      </div>
      <div className="rounded-lg border bg-card">
        {tasks.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            Nothing here. Create tasks from a visit, appointment or
            prescription.
          </p>
        )}
        <ul className="divide-y">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex-1">
                <p className="font-medium">
                  {t.notes ||
                    (t.type === 'PRESCRIPTION'
                      ? 'Prescription follow-up'
                      : 'Appointment follow-up')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.type === 'PRESCRIPTION' ? 'Prescription' : 'Appointment'} ·
                  for {t.assigned_role === 'DOCTOR' ? 'Doctor' : 'Reception'} ·{' '}
                  {formatDistanceToNow(new Date(t.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              {t.status === 'PENDING' && (
                <Button size="sm" variant="outline" onClick={() => done(t.id)}>
                  <Check className="h-4 w-4" /> Done
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
