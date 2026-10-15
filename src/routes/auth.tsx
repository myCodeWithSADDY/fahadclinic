import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Stethoscope } from 'lucide-react'

export const Route = createFileRoute('/auth')({
  head: () => ({
    meta: [
      { title: 'Sign in — Fahad Clinic' },
      { name: 'description', content: 'Staff sign in for Fahad Clinic.' },
      { property: 'og:title', content: 'Sign in — Fahad Clinic' },
      {
        property: 'og:description',
        content: 'Staff sign in for Fahad Clinic.',
      },
    ],
  }),
  component: AuthPage,
})

function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        navigate({ to: '/today' })
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) throw error
        if (data.session) navigate({ to: '/today' })
        else
          toast.success(
            'Check your email to confirm your account, then sign in.',
          )
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-sidebar px-4">
      <div className="w-full max-w-sm rounded-xl bg-card p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl">Fahad Clinic</h1>
            <p className="text-sm text-muted-foreground">
              Staff {mode === 'in' ? 'sign in' : 'sign up'}
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'up' && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw">Password</Label>
            <Input
              id="pw"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'in'
                ? 'Sign in'
                : 'Create account'}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === 'in' ? 'up' : 'in')}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === 'in'
            ? 'New staff member? Create an account'
            : 'Have an account? Sign in'}
        </button>
        {mode === 'up' && (
          <p className="mt-3 text-xs text-muted-foreground">
            The first account becomes the Doctor. Later accounts start as
            Receptionist; the doctor can change roles under Staff.
          </p>
        )}
      </div>
    </div>
  )
}
