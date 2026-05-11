'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const schema = z.object({
  name: z.string().min(1, 'Contract name is required'),
  contractNumber: z.string().optional(),
  perspective: z.enum(['buyer', 'vendor']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  noticePeriodDays: z.coerce.number().int().min(0).optional().or(z.literal('')),
  autoRenewal: z.boolean().default(false),
  autoRenewalMonths: z.coerce.number().int().min(1).optional().or(z.literal('')),
  annualValue: z.string().optional(),
  monthlyValue: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface ContractFormProps {
  vendorId: string
  vendorName: string
}

export function ContractForm({ vendorId, vendorName }: ContractFormProps) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      autoRenewal: false,
      perspective: 'buyer',
    },
  })

  const autoRenewal = watch('autoRenewal')

  const createMutation = api.contracts.create.useMutation({
    onSuccess: (data) => {
      toast.success('Contract created successfully')
      router.push(`/vendors/${vendorId}/contracts/${data.id}`)
    },
    onError: (error) => {
      toast.error(error.message ?? 'Failed to create contract')
    },
  })

  const onSubmit = (values: FormValues) => {
    createMutation.mutate({
      vendorId,
      name: values.name,
      contractNumber: values.contractNumber || undefined,
      perspective: values.perspective,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
      noticePeriodDays:
        values.noticePeriodDays === '' || values.noticePeriodDays === undefined
          ? undefined
          : Number(values.noticePeriodDays),
      autoRenewal: values.autoRenewal,
      autoRenewalMonths:
        values.autoRenewalMonths === '' || values.autoRenewalMonths === undefined
          ? undefined
          : Number(values.autoRenewalMonths),
      annualValue: values.annualValue || undefined,
      monthlyValue: values.monthlyValue || undefined,
    })
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>New Contract</CardTitle>
        <CardDescription>Create a contract for {vendorName}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Contract name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Contract name *</Label>
            <Input
              id="name"
              placeholder="e.g. Managed IT Services Agreement 2024"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Contract / PO number */}
          <div className="space-y-1.5">
            <Label htmlFor="contractNumber">Contract / PO number</Label>
            <Input
              id="contractNumber"
              placeholder="e.g. PO-2024-001"
              {...register('contractNumber')}
            />
          </div>

          {/* Perspective */}
          <div className="space-y-1.5">
            <Label htmlFor="perspective">Your role *</Label>
            <Select
              defaultValue="buyer"
              onValueChange={(val) =>
                setValue('perspective', val as 'buyer' | 'vendor', { shouldValidate: true })
              }
            >
              <SelectTrigger id="perspective">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer">Buyer — receiving services</SelectItem>
                <SelectItem value="vendor">Vendor — delivering services</SelectItem>
              </SelectContent>
            </Select>
            {errors.perspective && (
              <p className="text-sm text-destructive">{errors.perspective.message}</p>
            )}
          </div>

          {/* Start / end dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
            </div>
          </div>

          {/* Notice period */}
          <div className="space-y-1.5">
            <Label htmlFor="noticePeriodDays">Notice period (days)</Label>
            <Input
              id="noticePeriodDays"
              type="number"
              min={0}
              placeholder="e.g. 30"
              {...register('noticePeriodDays')}
            />
          </div>

          {/* Auto-renewal */}
          <div className="space-y-1.5">
            <Label htmlFor="autoRenewal">Auto-renewal clause</Label>
            <Select
              defaultValue="false"
              onValueChange={(val) =>
                setValue('autoRenewal', val === 'true', { shouldValidate: true })
              }
            >
              <SelectTrigger id="autoRenewal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">No</SelectItem>
                <SelectItem value="true">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Auto-renewal months (conditional) */}
          {autoRenewal && (
            <div className="space-y-1.5">
              <Label htmlFor="autoRenewalMonths">Auto-renewal term (months)</Label>
              <Input
                id="autoRenewalMonths"
                type="number"
                min={1}
                placeholder="e.g. 12"
                {...register('autoRenewalMonths')}
              />
              {errors.autoRenewalMonths && (
                <p className="text-sm text-destructive">
                  {errors.autoRenewalMonths.message as string}
                </p>
              )}
            </div>
          )}

          {/* Annual / monthly value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="annualValue">Annual contract value (AUD)</Label>
              <Input
                id="annualValue"
                type="number"
                min={0}
                step="0.01"
                placeholder="e.g. 120000"
                {...register('annualValue')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="monthlyValue">Monthly recurring cost (AUD)</Label>
              <Input
                id="monthlyValue"
                type="number"
                min={0}
                step="0.01"
                placeholder="e.g. 10000"
                {...register('monthlyValue')}
              />
            </div>
          </div>

          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? 'Creating…' : 'Create contract'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
