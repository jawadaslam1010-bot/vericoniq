export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'

// Documents live on the contract page — redirect to contracts tab
export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ vendorId: string }>
}) {
  const { vendorId } = await params
  redirect(`/vendors/${vendorId}/contracts`)
}
