'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import type { ContentItem, ContentStatus } from '@/lib/db/schema_content';
import { ContentStatusBadge } from './ContentStatusBadge';
import { PlatformIcon } from './PlatformIcon';

interface Props {
  item: ContentItem;
  onClose: () => void;
  onUpdated: () => void;
}

export function ContentDetailModal({ item, onClose, onUpdated }: Props) {
  const [tab, setTab] = useState<'content' | 'notes'>('content');
  const [status, setStatus] = useState<ContentStatus>(item.status as ContentStatus);
  const [saving, setSaving] = useState(false);

  const updateStatus = async (s: ContentStatus) => {
    setStatus(s);
    setSaving(true);
    const update: any = { status: s };
    if (s === 'Publié') update.publishedAt = Date.now();
    await fetch(`/api/content?id=${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    onUpdated();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer ce contenu ?')) return;
    await fetch(`/api/content?id=${item.id}`, { method: 'DELETE' });
    onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900">
          <div className="flex items-center gap-2">
            <PlatformIcon platform={item.platform as any} />
            <span className="text-sm font-semibold text-zinc-100 line-clamp-1">{item.title}</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <ContentStatusBadge status={status} />
            <span className="text-xs text-zinc-500">{item.type}</span>
            {item.agent !== 'manuel' && <span className="text-xs text-violet-400">{item.agent}</span>}
          </div>

          <div className="flex gap-1 mb-4 bg-zinc-800 rounded-lg p-1">
            {(['content', 'notes'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 px-3 py-1.5 rounded text-xs transition-colors ${tab === t ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {t === 'content' ? 'Contenu' : 'Notes'}
              </button>
            ))}
          </div>

          {tab === 'content' ? (
            <div className="space-y-3">
              {item.hook && <div><p className="text-xs text-zinc-500 mb-1">Hook</p><p className="text-sm text-zinc-300 bg-zinc-800/50 rounded-lg p-3">{item.hook}</p></div>}
              {item.body && <div><p className="text-xs text-zinc-500 mb-1">Contenu</p><p className="text-sm text-zinc-300 bg-zinc-800/50 rounded-lg p-3 whitespace-pre-wrap">{item.body}</p></div>}
              {item.cta && <div><p className="text-xs text-zinc-500 mb-1">CTA</p><p className="text-sm text-zinc-300 bg-zinc-800/50 rounded-lg p-3">{item.cta}</p></div>}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">{item.notes ?? 'Aucune note'}</p>
          )}

          <div className="mt-4">
            <p className="text-xs text-zinc-500 mb-2">Changer statut</p>
            <div className="flex flex-wrap gap-2">
              {(['Idée', 'Brouillon', 'Planifié', 'Publié', 'Archivé'] as ContentStatus[]).map(s => (
                <button key={s} onClick={() => updateStatus(s)} disabled={saving || s === status}
                  className={`px-2 py-1 rounded text-xs transition-colors ${s === status ? 'opacity-50 cursor-default bg-zinc-800 text-zinc-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleDelete} className="w-full mt-4 px-3 py-2 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 rounded-lg text-sm transition-colors">
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
