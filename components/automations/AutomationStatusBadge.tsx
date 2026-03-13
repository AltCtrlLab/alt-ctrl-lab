'use client';
import type { AutomationStatus } from '@/lib/db/schema_automations';

const META: Record<AutomationStatus, { color: string; bg: string; pulse?: boolean }> = {
  'Actif': { color: 'text-emerald-400', bg: 'bg-emerald-900/30', pulse: true },
  'Inactif': { color: 'text-zinc-400', bg: 'bg-zinc-800' },
  'Erreur': { color: 'text-rose-400', bg: 'bg-rose-900/30' },
};

export function AutomationStatusBadge({ status }: { status: AutomationStatus }) {
  const meta = META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${meta.color} ${meta.bg}`}>
      {meta.pulse ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
      ) : (
        <span className={`w-2 h-2 rounded-full ${status === 'Erreur' ? 'bg-rose-400' : 'bg-zinc-500'}`} />
      )}
      {status}
    </span>
  );
}
