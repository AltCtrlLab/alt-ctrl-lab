import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatRelativeTime(date: string | number | Date): string {
  const d = typeof date === 'string' ? new Date(date) : typeof date === 'number' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'À l\'instant'
  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days < 7) return `Il y a ${days}j`
  return formatDate(date)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    Idle: 'text-zinc-400',
    Processing: 'text-amber-400',
    Pending_Validation: 'text-sky-400',
    Completed: 'text-emerald-400',
    Rejected: 'text-rose-400',
  }
  return colors[status] || 'text-zinc-400'
}

export function getStatusBg(status: string): string {
  const colors: Record<string, string> = {
    Idle: 'bg-zinc-500/10 border-zinc-500/20',
    Processing: 'bg-amber-500/10 border-amber-500/20',
    Pending_Validation: 'bg-sky-500/10 border-sky-500/20',
    Completed: 'bg-emerald-500/10 border-emerald-500/20',
    Rejected: 'bg-rose-500/10 border-rose-500/20',
  }
  return colors[status] || 'bg-zinc-500/10 border-zinc-500/20'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    Low: 'text-zinc-400',
    Medium: 'text-sky-400',
    High: 'text-amber-400',
    Critical: 'text-rose-400',
  }
  return colors[priority] || 'text-zinc-400'
}

/**
 * Format elapsed time from a unix timestamp (ms).
 * Returns compact strings like "12s", "5min", "2h".
 */
export function formatElapsed(createdAt: number): string {
  const secs = Math.floor((Date.now() - createdAt) / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}min`;
  return `${Math.floor(secs / 3600)}h`;
}

/**
 * Format currency (EUR, fr-FR).
 */
export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const csv = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
