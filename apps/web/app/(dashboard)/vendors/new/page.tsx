import type { Metadata } from 'next'
import { VendorForm } from '@/components/vendors/VendorForm'

export const metadata: Metadata = { title: 'Add vendor' }

export default function NewVendorPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Add vendor</h1>
        <p className="text-sm text-slate-500 mt-1">
          Add a managed service vendor to start tracking their performance
        </p>
      </div>
      <VendorForm />
    </div>
  )
}
