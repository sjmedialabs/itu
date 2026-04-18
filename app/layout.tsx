import type { Metadata } from 'next'
import { Bricolage_Grotesque, Lobster_Two } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const bodyFont = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-app',
  display: 'swap',
  weight: 'variable',
  axes: ['opsz'],
})

const titleFont = Lobster_Two({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-title',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ITU - International Mobile Top-Up Platform',
  description: 'Send mobile recharges instantly to 150+ countries with the best rates',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
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
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
