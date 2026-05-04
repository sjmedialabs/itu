'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuthStore } from '@/lib/stores'
import { useCMSStore } from '@/lib/cms-store'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading } = useAuthStore()
  const { content, hasHydrated } = useCMSStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!acceptTerms) {
      setError('Please accept the terms and conditions')
      return
    }
    
    const success = await register(email, password, name)
    if (success) {
      router.push('/account')
    } else {
      setError('Registration failed. Please try again.')
    }
  }

  return (
    <div className="bg-white px-4 py-10 md:py-16">
      <div className="mx-auto grid w-full max-w-5xl items-stretch gap-10 lg:grid-cols-2 lg:max-h-[700px]">
        <div className="flex justify-center lg:justify-start">
          <div className="flex w-full max-w-md flex-col">
            <div className="relative flex-1 overflow-hidden rounded-3xl bg-[#f6c84c] shadow-[0_24px_70px_-34px_rgba(15,23,42,0.45)]">
              <Image
                src={(hasHydrated && content.authPages.leftImage) || '/auth/auth-hero.png'}
                alt=""
                fill
                className="object-cover"
                priority
                unoptimized={(hasHydrated ? content.authPages.leftImage : '').startsWith('data:')}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/15 to-transparent" />
            </div>
          </div>
        </div>

        <Card className="w-full overflow-hidden rounded-2xl border-neutral-200 shadow-[0_22px_70px_-44px_rgba(15,23,42,0.35)]">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto mt-2">
              <Image src="/auth/icon-secure.png" alt="" width={70} height={70} className="mx-auto h-auto w-[70px]" />
            </div>
            <CardTitle className="text-xl font-bold text-neutral-900 md:text-2xl">Create your account</CardTitle>
            <p className="text-sm text-neutral-500">Enter your details to get started</p>
          </CardHeader>

          <CardContent className="max-h-[700px] overflow-y-auto px-6 pb-8 pt-2 md:px-8">
            {error ? <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-neutral-700">Full name</p>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="h-12 rounded-xl" required />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-neutral-700">Email</p>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="h-12 rounded-xl" required />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-neutral-700">Password</p>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="h-12 rounded-xl pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-neutral-700">Confirm password</p>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="h-12 rounded-xl"
                  required
                />
              </div>

              <div className="flex items-start gap-2 pt-1">
                <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(checked) => setAcceptTerms(checked as boolean)} className="mt-0.5" />
                <label htmlFor="terms" className="text-sm leading-tight text-neutral-600">
                  I agree to the{' '}
                  <Link href="/terms" className="font-semibold text-[var(--hero-cta-orange)] hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="font-semibold text-[var(--hero-cta-orange)] hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-[var(--hero-cta-orange)] text-base font-semibold text-white hover:brightness-105"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-neutral-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[var(--hero-cta-orange)] hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
