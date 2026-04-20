import type { Metadata } from 'next'
import { Bricolage_Grotesque, Roboto_Slab } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const bodyFont = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-app',
  display: 'swap',
  weight: 'variable',
  axes: ['opsz'],
})

const titleFont = Roboto_Slab({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-title',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ITU - International Mobile Top-Up Platform',
  description: 'Send mobile recharges instantly to 150+ countries with the best rates',
  generator: 'v0.app',
  icons: {
    icon: '/itu-logo.png',
    apple: '/itu-logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${titleFont.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
