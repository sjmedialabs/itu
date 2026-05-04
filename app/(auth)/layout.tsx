'use client'

import PublicLayout from '@/app/(public)/layout'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>
}

