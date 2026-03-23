'use client';
import { useState } from 'react';
import { AdaptiveModal } from '@/components/mobile/AdaptiveModal';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function FollowupFormModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({ clientName: '', type: 'Check-in', status: 'À faire', priority: 'Normale', scheduledAt: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).getTime() : null,
          notes: form.notes || null,
        }),
      });
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdaptiveModal isOpen={true} onClose={onClose} title="Nouveau suivi" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Client *</label>
          <input required value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none">
              {['Check-in', 'Upsell', 'NPS', 'Support', 'Renouvellement'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Priorite</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none">
              {['Haute', 'Normale', 'Basse'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Date planifiee</label>
          <input type="date" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none resize-none" />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm">Annuler</button>
          <button type="submit" disabled={saving} className="flex-1 px-3 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            {saving ? 'Creation...' : 'Creer'}
          </button>
        </div>
      </form>
    </AdaptiveModal>
  );
}
