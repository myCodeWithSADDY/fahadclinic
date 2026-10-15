import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListPlus } from 'lucide-react'
import { errMsg  } from '@/lib/clinic'
import type {AppRole} from '@/lib/clinic';

/** Create a handoff task with context carried automatically. */
export function TaskButton({
  type,
  referenceId,
  defaultRole = 'RECEPTIONIST',
  label,
}: {
  type: 'PRESCRIPTION' | 'APPOINTMENT'
  referenceId: string
  defaultRole?: AppRole
  label?: string
}) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [role, setRole] = useState<AppRole>(defaultRole)

  async function save() {
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('tasks')
      .insert({
        type,
        reference_id: referenceId,
        assigned_role: role,
        notes: notes || null,
        created_by: u.user!.id,
      })
    if (error) {
      toast.error(errMsg(error))
      return
    }
    toast.success('Task created')
    qc.invalidateQueries({ queryKey: ['tasks'] })
    setNotes('')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" title="Create task">
          <ListPlus className="h-4 w-4" />
          {label && <span>{label}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2" align="end">
        <p className="text-sm font-semibold">New task</p>
        <Input
          autoFocus
          placeholder="What needs doing?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <div className="flex gap-1">
          {(['RECEPTIONIST', 'DOCTOR'] as const).map((r) => (
            <Button
              key={r}
              size="sm"
              className="flex-1"
              variant={role === r ? 'default' : 'outline'}
              onClick={() => setRole(r)}
            >
              {r === 'DOCTOR' ? 'Doctor' : 'Reception'}
            </Button>
          ))}
        </div>
        <Button size="sm" className="w-full" onClick={save}>
          Add task
        </Button>
      </PopoverContent>
    </Popover>
  )
}
