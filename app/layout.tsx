import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tally',
  description: 'Track your tasks. Own your wins.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  )
}
