import type { Metadata } from 'next'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { TRPCProvider } from '@/lib/trpc/provider'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-dm-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'VericonIQ',
    template: '%s | VericonIQ',
  },
  description: 'AI-powered contract performance intelligence for global enterprises',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${dmSerif.variable} ${dmSans.className}`}>
        <TRPCProvider>
          {children}
          <Toaster richColors position="top-right" />
        </TRPCProvider>
      </body>
    </html>
  )
}
