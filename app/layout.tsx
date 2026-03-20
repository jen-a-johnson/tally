import type { Metadata, Viewport } from 'next'
import { Inter, Caveat } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-body' })
const caveat = Caveat({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-caveat' })

export const metadata: Metadata = {
  title: 'Tally',
  description: 'Track tasks. Own your wins.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${caveat.variable} antialiased`} style={{ fontFamily: 'var(--font-body), system-ui, sans-serif' }}>{children}</body>
    </html>
  )
}
