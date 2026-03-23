'use client';

import { UserPlus, Phone, Send, Bell, BellRing, CheckCircle2, XCircle } from 'lucide-react';
import type { Lead } from '@/lib/db/schema_leads';

interface TimelineEvent {
  label: string;
  date: number;
  icon: React.ElementType;
  color: string;
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActivityTimeline({ lead }: { lead: Lead }) {
  const events: TimelineEvent[] = [];

  if (lead.createdAt) events.push({ label: 'Lead créé', date: lead.createdAt as number, icon: UserPlus, color: 'text-fuchsia-400 bg-fuchsia-500/15 border-fuchsia-500/30' });
  if (lead.discoveryCallAt) events.push({ label: 'Discovery Call', date: lead.discoveryCallAt as number, icon: Phone, color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' });
  if (lead.propositionSentAt) events.push({ label: 'Proposition envoyée', date: lead.propositionSentAt as number, icon: Send, color: 'text-fuchsia-400 bg-fuchsia-500/15 border-fuchsia-500/30' });
  if (lead.relance1SentAt) events.push({ label: 'Relance 1 envoyée', date: lead.relance1SentAt as number, icon: Bell, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' });
  if (lead.relance2SentAt) events.push({ label: 'Relance 2 envoyée', date: lead.relance2SentAt as number, icon: BellRing, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' });
  if (lead.signedAt) events.push({ label: 'Signé ✓', date: lead.signedAt as number, icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' });

  events.sort((a, b) => a.date - b.date);

  if (events.length === 0) {
    return <p className="text-xs text-zinc-400 italic">Aucun événement enregistré</p>;
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-4 bottom-4 w-px bg-zinc-800" />

      {events.map((evt, i) => {
        const Icon = evt.icon;
        return (
          <div key={i} className="relative flex items-start gap-3 pb-4 last:pb-0">
            <div className={`relative z-10 w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 ${evt.color}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="pt-1">
              <p className="text-xs font-semibold text-zinc-200">{evt.label}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{formatDateTime(evt.date)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
