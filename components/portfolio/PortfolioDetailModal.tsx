'use client';
import { useState } from 'react';
import { X, Star } from 'lucide-react';
import type { PortfolioItem } from '@/lib/db/schema_portfolio';
import { PortfolioTypeBadge } from './PortfolioTypeBadge';
import { ResultsDisplay } from './ResultsDisplay';

interface Props {
  item: PortfolioItem;
  onClose: () => void;
  onUpdated: () => void;
}

export function PortfolioDetailModal({ item, onClose, onUpdated }: Props) {
  const [saving, setSaving] = useState(false);

  const toggle = async (field: 'featured' | 'published') => {
    setSaving(true);
    await fetch(`/api/portfolio?id=${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: Boolean(item[field]) ? 0 : 1 }),
    });
    onUpdated();
    setSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer ce projet du portfolio ?')) return;
    await fetch(`/api/portfolio?id=${item.id}`, { method: 'DELETE' });
    onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-100">{item.title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          {item.coverUrl && <img src={item.coverUrl} alt={item.title} className="w-full h-48 object-cover rounded-lg" />}
          <div className="flex items-center gap-3">
            <PortfolioTypeBadge type={item.projectType as any} />
            <span className="text-sm text-zinc-400">{item.clientName}</span>
            {Boolean(item.featured) && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
          </div>
          {item.description && <p className="text-sm text-zinc-300">{item.description}</p>}
          {item.results && (
            <div>
              <p className="text-xs text-zinc-500 mb-2">Résultats</p>
              <ResultsDisplay results={item.results} />
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => toggle('featured')} disabled={saving}
              className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors">
              {Boolean(item.featured) ? '★ Retirer featured' : '☆ Mettre en featured'}
            </button>
            <button onClick={() => toggle('published')} disabled={saving}
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${Boolean(item.published) ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-amber-600 hover:bg-amber-500 text-white'}`}>
              {Boolean(item.published) ? 'Dépublier' : 'Publier'}
            </button>
          </div>
          <button onClick={handleDelete} className="w-full px-3 py-2 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 rounded-lg text-sm transition-colors">
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
