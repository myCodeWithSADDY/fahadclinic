import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client'
import { useMe } from '@/lib/clinic'
import {
  CalendarDays,
  CalendarRange,
  ClipboardList,
  LogOut,
  Stethoscope,
  Users,
  UserCog,
} from 'lucide-react'

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) throw redirect({ to: '/auth' })
    return { user: data.user }
  },
  component: Shell,
})

const nav = [
  { to: '/today', label: 'Today', icon: CalendarDays },
  { to: '/appointments', label: 'Appointments', icon: CalendarRange },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList },
  { to: '/staff', label: 'Staff', icon: UserCog },
] as const

function Shell() {
  const { data: me } = useMe()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <Link to="/today" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Stethoscope className="h-4 w-4" />
            </span>
            <span className="font-display text-lg">Fahad Clinic</span>
          </Link>
          <nav className="flex gap-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeProps={{
                  className: 'bg-sidebar-accent text-sidebar-accent-foreground',
                }}
              >
                <n.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{n.label}</span>
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {me && (
              <span className="hidden text-sidebar-foreground/80 md:inline">
                {me.name} ·{' '}
                <span className="text-sidebar-primary">
                  {me.roles
                    .map((r) => (r === 'DOCTOR' ? 'Doctor' : 'Reception'))
                    .join(' + ')}
                </span>
              </span>
            )}
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                navigate({ to: '/auth' })
              }}
              className="rounded-md p-2 hover:bg-sidebar-accent"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
