'use client';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AdaptiveModal } from '@/components/mobile/AdaptiveModal';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function PortfolioFormModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({ title: '', clientName: '', projectType: 'Web', description: '', coverUrl: '', featured: false, published: false });
  const [metrics, setMetrics] = useState<{ key: string; val: string }[]>([{ key: '', val: '' }]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const results: Record<string, string> = {};
    metrics.forEach(m => { if (m.key && m.val) results[m.key] = m.val; });
    try {
      await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          results: Object.keys(results).length > 0 ? JSON.stringify(results) : null,
          coverUrl: form.coverUrl || null,
          description: form.description || null,
          featured: form.featured ? 1 : 0,
          published: form.published ? 1 : 0,
        }),
      });
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdaptiveModal isOpen={true} onClose={onClose} title="Nouveau projet portfolio" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        {([['Titre', 'title', true], ['Client', 'clientName', true], ['URL cover', 'coverUrl', false]] as [string, string, boolean][]).map(([label, key, required]) => (
          <div key={key}>
            <label className="text-xs text-zinc-400 mb-1 block">{label}{required ? ' *' : ''}</label>
            <input
              required={required}
              value={(form as any)[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
          </div>
        ))}
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Type</label>
          <select value={form.projectType} onChange={e => setForm(f => ({ ...f, projectType: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none">
            {['Web', 'Branding', 'IA', 'Marketing'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none resize-none" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-2 block">Resultats</label>
          {metrics.map((m, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input placeholder="Metrique" value={m.key} onChange={e => setMetrics(ms => ms.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none" />
              <input placeholder="Valeur" value={m.val} onChange={e => setMetrics(ms => ms.map((x, j) => j === i ? { ...x, val: e.target.value } : x))}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none" />
              {metrics.length > 1 && (
                <button type="button" onClick={() => setMetrics(ms => ms.filter((_, j) => j !== i))} className="text-zinc-400 hover:text-zinc-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setMetrics(ms => [...ms, { key: '', val: '' }])}
            className="text-xs text-zinc-400 hover:text-zinc-300 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Ajouter une metrique
          </button>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} className="rounded" />
            <span className="text-sm text-zinc-300">Featured</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} className="rounded" />
            <span className="text-sm text-zinc-300">Publie</span>
          </label>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm">Annuler</button>
          <button type="submit" disabled={saving} className="flex-1 px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            {saving ? 'Creation...' : 'Creer'}
          </button>
        </div>
      </form>
    </AdaptiveModal>
  );
}
