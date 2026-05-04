'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function TopupSelectPlanPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/topup')
  }, [router])

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-[#f3f9ff]" />
  )
}


