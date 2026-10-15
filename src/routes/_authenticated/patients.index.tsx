import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { usePatientSearch } from '@/components/clinic/PatientPicker'
import { RegisterPatientDialog } from '@/components/clinic/RegisterPatientDialog'
import { ageLabel, useMe } from '@/lib/clinic'
import { FilePlus2, UserPlus, CalendarPlus } from 'lucide-react'

import { BookDialog } from '@/components/clinic/BookDialog'

const PAGE_SIZE = 8

export const Route = createFileRoute('/_authenticated/patients/')({
  head: () => ({
    meta: [
      { title: 'Patients — Fahad Clinic' },
      { name: 'description', content: 'Search and register clinic patients.' },
      { property: 'og:title', content: 'Patients — Fahad Clinic' },
      {
        property: 'og:description',
        content: 'Search and register clinic patients.',
      },
    ],
  }),
  component: Patients,
})

function Patients() {
  const [q, setQ] = useState('')
  const [reg, setReg] = useState(false)
  const [page, setPage] = useState(0)
const [bookingPatientId, setBookingPatientId] = useState<string | null>(null)
  const navigate = useNavigate()
  const { data: me } = useMe()
  const results = usePatientSearch(q)

  const isSearching = q.trim().length >= 2

  const {
    data: recentResult,
    isLoading: recentLoading,
    isError: recentError,
  } = useQuery({
    queryKey: ['patients', 'recent', page],
    enabled: !isSearching,
    queryFn: async () => {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, count, error } = await supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      return {
        patients: data ,
        total: count ?? 0,
      }
    },
  })

  
  const searchPatients = results 
  const searchTotal = searchPatients.length
  const searchTotalPages = Math.ceil(searchTotal / PAGE_SIZE)

  const searchList = searchPatients.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  )

  const recent = recentResult?.patients ?? []
  const recentTotal = recentResult?.total ?? 0
  const recentTotalPages = Math.ceil(recentTotal / PAGE_SIZE)

  const list = isSearching ? searchList : recent
  const total = isSearching ? searchTotal : recentTotal
  const totalPages = isSearching ? searchTotalPages : recentTotalPages
  const isLoading = !isSearching && recentLoading
  const isError = !isSearching && recentError

  const handleSearchChange = (value: string) => {
    setQ(value)
    setPage(0)
  }

  const handlePageChange = (nextPage: number) => {
    setPage(Math.max(0, nextPage))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Patients</h1>

        <Button onClick={() => setReg(true)}>
          <UserPlus className="h-4 w-4" />
          Register
        </Button>
      </div>

      <Input
        autoFocus
        placeholder="Search name, phone, MR no., CNIC, old MR no.…"
        value={q}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="max-w-xl"
      />

      <div className="rounded-lg border bg-card">
        <p className="border-b px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
          {isSearching ? 'Search results' : 'Recently registered'}
        </p>

        {isLoading && (
          <p className="p-4 text-sm text-muted-foreground">
            Loading patients...
          </p>
        )}

        {isError && (
          <p className="p-4 text-sm text-destructive">
            Failed to load patients. Please try again.
          </p>
        )}

        {!isLoading && !isError && list.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            No patients found.
          </p>
        )}

        <ul className="divide-y">
          {list.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4"
            >
              <Link
                to="/patients/$id"
                params={{ id: p.id }}
                className="min-w-48 flex-1 py-2.5 hover:text-primary"
              >
                <span>
                  <b>{p.full_name}</b>{' '}
                  <span className="text-sm text-muted-foreground">
                    · {ageLabel(p.date_of_birth)} ·{' '}
                    {p.gender === 'MALE'
                      ? 'M'
                      : p.gender === 'FEMALE'
                        ? 'F'
                        : ''}
                    {p.phone ? ` · ${p.phone}` : ''}
                  </span>
                </span>
              </Link>

              <div className="flex flex-wrap items-center gap-2 pb-2.5 pt-0 sm:py-2.5">
                {me?.isDoctor && (
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      to="/consultation/$appointmentId"
                      params={{ appointmentId: 'new' }}
                      search={{ patientId: p.id }}
                    >
                      <FilePlus2 className="h-4 w-4" />
                      Create prescription
                    </Link>
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBookingPatientId(p.id)}
                >
                  <CalendarPlus className="h-4 w-4" />
                  Book appointment
                </Button>

                <span className="text-xs text-muted-foreground">
                  {p.medical_record_id}
                </span>
              </div>

              <BookDialog
                open={bookingPatientId === p.id}
                onOpenChange={(open) => setBookingPatientId(open ? p.id : null)}
                patient={p}
              />
            </li>
          ))}
        </ul>

        {!isLoading && !isError && total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + list.length} of{' '}
              {total}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </Button>

              <span className="whitespace-nowrap text-sm text-muted-foreground">
                Page {page + 1} of {Math.max(totalPages, 1)}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <RegisterPatientDialog
        open={reg}
        onOpenChange={setReg}
        onSelected={(p) =>
          navigate({ to: '/patients/$id', params: { id: p.id } })
        }
      />
    </div>
  )
}
