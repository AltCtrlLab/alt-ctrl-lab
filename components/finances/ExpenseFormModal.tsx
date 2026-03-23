'use client';
import { useState } from 'react';
import { AdaptiveModal } from '@/components/mobile/AdaptiveModal';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function ExpenseFormModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({ label: '', amount: '', category: 'Autre', date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expense',
          label: form.label,
          amount: parseFloat(form.amount),
          category: form.category,
          date: form.date ? new Date(form.date).getTime() : Date.now(),
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
    <AdaptiveModal isOpen={true} onClose={onClose} title="Nouvelle dépense" maxWidth="max-w-md">
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Libellé *</label>
            <input required value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Montant (€) *</label>
            <input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Catégorie</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none">
              {['Outils', 'Freelance', 'Pub', 'Formation', 'Autre'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              {saving ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
    </AdaptiveModal>
  );
}
