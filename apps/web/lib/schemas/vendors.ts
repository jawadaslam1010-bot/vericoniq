import { z } from 'zod'

export const createVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').max(200),
  abn: z
    .string()
    .regex(/^\d{11}$/, 'ABN must be 11 digits (no spaces)')
    .optional()
    .or(z.literal('')),
  serviceType: z.enum([
    'telco',
    'it',
    'cloud',
    'facilities',
    'security',
    'construction',
    'supply',
    'property',
    'custom',
  ]),
  contactName: z.string().max(200).optional().or(z.literal('')),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  submissionEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  submissionMethod: z.enum(['excel', 'webform', 'both', 'manual']).default('excel'),
})

export const updateVendorSchema = createVendorSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(['active', 'inactive', 'terminated']).optional(),
})

export type CreateVendorInput = z.infer<typeof createVendorSchema>
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>
