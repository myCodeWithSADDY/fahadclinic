import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Fahad Clinic — Today' },
      {
        name: 'description',
        content: "Today's queue and schedule at Fahad Clinic.",
      },
      { property: 'og:title', content: 'Fahad Clinic — Today' },
      {
        property: 'og:description',
        content: "Today's queue and schedule at Fahad Clinic.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: '/today' })
  },
})
