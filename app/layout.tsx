import type { Metadata } from 'next'
import { Patrick_Hand } from 'next/font/google'
import './globals.css'

const caveat = Patrick_Hand({ subsets: ['latin'], weight: '400', variable: '--font-caveat' })

export const metadata: Metadata = {
  title: 'Tally',
  description: 'Track tasks. Own your wins.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${caveat.variable} antialiased`}>{children}</body>
    </html>
  )
}
