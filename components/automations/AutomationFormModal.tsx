'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function AutomationFormModal({ onClose, onCreated }: Props) {
  const trapRef = useFocusTrap(true, onClose);
  const [form, setForm] = useState({ name: '', description: '', tool: 'n8n', triggerType: '', webhookUrl: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          status: 'Inactif',
          description: form.description || null,
          triggerType: form.triggerType || null,
          webhookUrl: form.webhookUrl || null,
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div ref={trapRef} role="dialog" aria-modal="true" aria-label="Nouvelle automation" tabIndex={-1} className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Nouvelle automation</h2>
          <button onClick={onClose} aria-label="Fermer" className="text-zinc-400 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {([['Nom *', 'name'], ['Description', 'description'], ['Type de trigger', 'triggerType'], ['Webhook URL', 'webhookUrl']] as [string, string][]).map(([label, key]) => (
            <div key={key}>
              <label className="text-xs text-zinc-400 mb-1 block">{label}</label>
              <input
                required={key === 'name'}
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Outil</label>
            <select value={form.tool} onChange={e => setForm(f => ({ ...f, tool: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none">
              {['n8n', 'Make', 'Zapier', 'Custom'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 px-3 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              {saving ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
