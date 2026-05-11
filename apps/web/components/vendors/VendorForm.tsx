'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { createVendorSchema } from '@/lib/schemas/vendors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type VendorFormValues = z.infer<typeof createVendorSchema>

const SERVICE_TYPES = [
  { value: 'telco', label: 'Telecommunications' },
  { value: 'it', label: 'IT Services' },
  { value: 'cloud', label: 'Cloud Services' },
  { value: 'facilities', label: 'Facilities Management' },
  { value: 'security', label: 'Security' },
  { value: 'construction', label: 'Construction' },
  { value: 'supply', label: 'Supply Chain' },
  { value: 'property', label: 'Property' },
  { value: 'custom', label: 'Other' },
] as const

const SUBMISSION_METHODS = [
  { value: 'excel', label: 'Excel template (email)' },
  { value: 'webform', label: 'Web form (magic link)' },
  { value: 'both', label: 'Both' },
  { value: 'manual', label: 'Manual entry' },
] as const

export function VendorForm() {
  const router = useRouter()
  const utils = trpc.useUtils()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(createVendorSchema),
    defaultValues: {
      submissionMethod: 'excel',
    },
  })

  const createVendor = trpc.vendors.create.useMutation({
    onSuccess: (vendor) => {
      utils.vendors.list.invalidate()
      toast.success(`${vendor.name} added successfully`)
      router.push(`/vendors/${vendor.id}`)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  async function onSubmit(data: VendorFormValues) {
    await createVendor.mutateAsync(data)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Vendor name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Vendor name *</Label>
            <Input id="name" placeholder="Telstra Business" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Service type */}
          <div className="space-y-1.5">
            <Label>Service type *</Label>
            <Select
              onValueChange={(value) =>
                setValue('serviceType', value as VendorFormValues['serviceType'])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a service type" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.serviceType && (
              <p className="text-xs text-destructive">{errors.serviceType.message}</p>
            )}
          </div>

          {/* ABN */}
          <div className="space-y-1.5">
            <Label htmlFor="abn">
              ABN <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input id="abn" placeholder="12345678901" maxLength={11} {...register('abn')} />
            {errors.abn && <p className="text-xs text-destructive">{errors.abn.message}</p>}
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contactName">
                Contact name <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input id="contactName" placeholder="Jane Smith" {...register('contactName')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">
                Contact email <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="jane@vendor.com"
                {...register('contactEmail')}
              />
              {errors.contactEmail && (
                <p className="text-xs text-destructive">{errors.contactEmail.message}</p>
              )}
            </div>
          </div>

          {/* Submission email */}
          <div className="space-y-1.5">
            <Label htmlFor="submissionEmail">
              Submission email{' '}
              <span className="text-slate-400 font-normal">
                (where performance templates are sent)
              </span>
            </Label>
            <Input
              id="submissionEmail"
              type="email"
              placeholder="reporting@vendor.com.au"
              {...register('submissionEmail')}
            />
            {errors.submissionEmail && (
              <p className="text-xs text-destructive">{errors.submissionEmail.message}</p>
            )}
          </div>

          {/* Submission method */}
          <div className="space-y-1.5">
            <Label>Submission method</Label>
            <Select
              defaultValue="excel"
              onValueChange={(value) =>
                setValue('submissionMethod', value as VendorFormValues['submissionMethod'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBMISSION_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting || createVendor.isPending}>
              {(isSubmitting || createVendor.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add vendor
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
