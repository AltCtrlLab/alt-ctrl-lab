'use client';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { AdaptiveModal } from '@/components/mobile/AdaptiveModal';
import type { Followup } from '@/lib/db/schema_postvente';
import { FollowupTypeBadge } from './FollowupTypeBadge';
import { NpsScore } from './NpsScore';
import { OverdueAlert } from './OverdueAlert';

interface Props {
  followup: Followup;
  onClose: () => void;
  onUpdated: () => void;
}

export function FollowupDetailModal({ followup, onClose, onUpdated }: Props) {
  const [nps, setNps] = useState<string>(followup.scoreNps?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  const markDone = async () => {
    setSaving(true);
    await fetch(`/api/followups?id=${followup.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Fait', doneAt: Date.now(), scoreNps: nps ? parseInt(nps) : null }),
    });
    onUpdated();
    onClose();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer ce suivi ?')) return;
    await fetch(`/api/followups?id=${followup.id}`, { method: 'DELETE' });
    onUpdated();
    onClose();
  };

  return (
    <AdaptiveModal isOpen={true} onClose={onClose} title={followup.clientName} maxWidth="max-w-md">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <FollowupTypeBadge type={followup.type as any} />
          <span className="text-xs text-zinc-400">{followup.priority}</span>
          <OverdueAlert scheduledAt={followup.scheduledAt} status={followup.status} />
          <NpsScore score={followup.scoreNps} />
        </div>
        {followup.notes && (
          <div>
            <p className="text-xs text-zinc-400 mb-1">Notes</p>
            <p className="text-sm text-zinc-300 bg-zinc-800/50 rounded-lg p-3">{followup.notes}</p>
          </div>
        )}
        {followup.status === 'À faire' && (
          <div>
            <p className="text-xs text-zinc-400 mb-2">Score NPS (1-10)</p>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setNps(n === parseInt(nps) ? '' : n.toString())}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${parseInt(nps) === n ? (n < 6 ? 'bg-rose-500 text-white' : n < 8 ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white') : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
        {followup.status === 'À faire' && (
          <button onClick={markDone} disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            <CheckCircle2 className="w-4 h-4" />
            Marquer comme fait
          </button>
        )}
        <button onClick={handleDelete} className="w-full px-3 py-2 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 rounded-lg text-sm transition-colors">
          Supprimer
        </button>
      </div>
    </AdaptiveModal>
  );
}
