'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const signupSchema = z
  .object({
    orgName: z.string().min(2, 'Organisation name is required'),
    abn: z
      .string()
      .regex(/^\d{11}$/, 'ABN must be 11 digits (no spaces)')
      .optional()
      .or(z.literal('')),
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const [verificationSent, setVerificationSent] = useState(false)
  const supabase = createClient()

  const form = useForm<SignupForm>({ resolver: zodResolver(signupSchema) })

  async function handleSignup(data: SignupForm) {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgName: data.orgName,
        abn: data.abn || null,
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      toast.error(result.error ?? 'Sign-up failed. Please try again.')
      return
    }

    if (result.requiresEmailConfirmation) {
      setVerificationSent(true)
    } else {
      // Auto sign-in after account creation
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (signInError) {
        toast.error('Account created — please sign in.')
        router.push('/login')
        return
      }
      router.push('/dashboard')
      router.refresh()
    }
  }

  if (verificationSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            We sent a confirmation link to{' '}
            <span className="font-medium text-slate-900">{form.getValues('email')}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Click the link in the email to activate your VericonIQ account. The link expires in 24
            hours.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Set up VericonIQ for your organisation</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSignup)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="orgName">Organisation name</Label>
            <Input
              id="orgName"
              placeholder="Acme Corp Pty Ltd"
              {...form.register('orgName')}
            />
            {form.formState.errors.orgName && (
              <p className="text-xs text-destructive">{form.formState.errors.orgName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="abn">
              ABN{' '}
              <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input id="abn" placeholder="12345678901" {...form.register('abn')} />
            {form.formState.errors.abn && (
              <p className="text-xs text-destructive">{form.formState.errors.abn.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fullName">Your full name</Label>
            <Input id="fullName" placeholder="Jane Smith" {...form.register('fullName')} />
            {form.formState.errors.fullName && (
              <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@yourorg.com.au"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min 12 chars, uppercase, number, symbol"
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••••••"
              {...form.register('confirmPassword')}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-slate-900 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
