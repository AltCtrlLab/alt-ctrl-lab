'use client';
import { AlertTriangle } from 'lucide-react';

interface Props {
  scheduledAt: number | null | undefined;
  status: string;
}

export function OverdueAlert({ scheduledAt, status }: Props) {
  if (status !== 'À faire' || !scheduledAt || scheduledAt >= Date.now()) return null;
  const days = Math.floor((Date.now() - scheduledAt) / 86400000);
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-900/20 px-1.5 py-0.5 rounded">
      <AlertTriangle className="w-3 h-3" />
      {days}j de retard
    </span>
  );
}
