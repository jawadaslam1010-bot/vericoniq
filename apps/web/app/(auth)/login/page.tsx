'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Mail, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const passwordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

const magicLinkSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

type PasswordForm = z.infer<typeof passwordSchema>
type MagicLinkForm = z.infer<typeof magicLinkSchema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard'
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })
  const magicForm = useForm<MagicLinkForm>({ resolver: zodResolver(magicLinkSchema) })

  const supabase = createClient()

  async function handlePasswordLogin(data: PasswordForm) {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      toast.error(error.message)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  async function handleMagicLink(data: MagicLinkForm) {
    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}`,
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    setMagicLinkSent(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in to VericonIQ</CardTitle>
        <CardDescription>
          Monitor vendor performance and enforce SLA obligations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="password">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="password" className="flex-1">
              Password
            </TabsTrigger>
            <TabsTrigger value="magic" className="flex-1">
              Magic link
            </TabsTrigger>
          </TabsList>

          {/* Password login */}
          <TabsContent value="password">
            <form onSubmit={passwordForm.handleSubmit(handlePasswordLogin)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@yourorg.com.au"
                    className="pl-9"
                    {...passwordForm.register('email')}
                  />
                </div>
                {passwordForm.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••••••"
                    className="pl-9"
                    {...passwordForm.register('password')}
                  />
                </div>
                {passwordForm.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={passwordForm.formState.isSubmitting}
              >
                {passwordForm.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Sign in
              </Button>
            </form>
          </TabsContent>

          {/* Magic link */}
          <TabsContent value="magic">
            {magicLinkSent ? (
              <div className="text-center py-4 space-y-2">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
                <p className="font-medium text-slate-900">Check your email</p>
                <p className="text-sm text-slate-500">
                  We sent a sign-in link to{' '}
                  <span className="font-medium">{magicForm.getValues('email')}</span>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMagicLinkSent(false)}
                  className="mt-2"
                >
                  Use a different email
                </Button>
              </div>
            ) : (
              <form onSubmit={magicForm.handleSubmit(handleMagicLink)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="magic-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="magic-email"
                      type="email"
                      placeholder="you@yourorg.com.au"
                      className="pl-9"
                      {...magicForm.register('email')}
                    />
                  </div>
                  {magicForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {magicForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={magicForm.formState.isSubmitting}
                >
                  {magicForm.formState.isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Send magic link
                </Button>
              </form>
            )}
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-slate-900 hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
