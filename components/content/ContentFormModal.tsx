'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function ContentFormModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    title: '', type: 'Post LinkedIn', platform: 'LinkedIn', status: 'Idée',
    agent: 'manuel', hook: '', body: '', cta: '', scheduledAt: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).getTime() : null,
          hook: form.hook || null,
          body: form.body || null,
          cta: form.cta || null,
          notes: form.notes || null,
        }),
      });
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof typeof form, type = 'text') => (
    <div>
      <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500" />
    </div>
  );

  const select = (label: string, key: keyof typeof form, opts: string[]) => (
    <div>
      <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
      <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none">
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-100">Nouveau contenu</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {field('Titre *', 'title')}
          <div className="grid grid-cols-2 gap-3">
            {select('Type', 'type', ['Post LinkedIn', 'Carousel', 'Reel', 'Newsletter', 'Article', 'Thread'])}
            {select('Plateforme', 'platform', ['LinkedIn', 'Instagram', 'Twitter', 'Email', 'Blog'])}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {select('Statut', 'status', ['Idée', 'Brouillon', 'Planifié', 'Publié', 'Archivé'])}
            {select('Agent', 'agent', ['manuel', 'khatib', 'fatah'])}
          </div>
          {field('Planifié le', 'scheduledAt', 'datetime-local')}
          {field('Hook', 'hook')}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Contenu</label>
            <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none resize-none" />
          </div>
          {field('CTA', 'cta')}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 px-3 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              {saving ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
