import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

// shadcn/ui utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date formatting ─────────────────────────────────────────────────────────

// All user-facing dates in DD MMM YYYY (e.g. "02 Jun 2025")
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), 'dd MMM yyyy')
}

// ─── Currency formatting ──────────────────────────────────────────────────────

// All credit amounts in AUD, no decimal places for whole dollars
export function formatAUD(amount: number | string | null | undefined): string {
  if (amount == null || amount === '') return '—'
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

// ─── Error helpers ────────────────────────────────────────────────────────────

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'An unexpected error occurred'
}
