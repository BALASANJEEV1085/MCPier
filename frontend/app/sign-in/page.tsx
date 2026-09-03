'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { useAuth } from '@/components/auth-provider'

export default function SignInPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      signIn()
      router.push('/dashboard')
    }, 700)
  }

  return (
    <AuthShell>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">Sign in to continue to your dashboard.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" name="email" type="email" placeholder="you@company.com" required autoComplete="email" />
          </Field>
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <a href="#" className="text-[12px] text-muted-foreground hover:text-foreground">
                Forgot password?
              </a>
            </div>
            <Input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
          </Field>
          <Field>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/sign-up" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        This is a demo prototype — any credentials will sign you in.
      </p>
    </AuthShell>
  )
}
