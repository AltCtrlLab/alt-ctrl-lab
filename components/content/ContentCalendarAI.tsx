'use client';

import { useState } from 'react';
import { Calendar, Sparkles, Loader2, X } from 'lucide-react';
import { AdaptiveModal } from '@/components/mobile/AdaptiveModal';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

interface CalendarItem {
  date: string;
  title: string;
  type: string;
  platform: string;
  theme: string;
}

export function ContentCalendarAI({ onClose, onCreated }: Props) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 2).padStart(2, '0')}`;
  });
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/content-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, postsPerWeek }),
      });
      const json = await res.json();
      if (json.success && json.data?.items) setItems(json.data.items);
    } catch { /* silent */ } finally { setLoading(false); }
  }

  async function saveAll() {
    setSaving(true);
    try {
      const res = await fetch('/api/ai/content-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, postsPerWeek, save: true }),
      });
      const json = await res.json();
      if (json.success) { onCreated(); onClose(); }
    } catch { /* silent */ } finally { setSaving(false); }
  }

  return (
    <AdaptiveModal isOpen={true} onClose={onClose} title="Calendrier IA" maxWidth="max-w-2xl">
      <div className="p-5 space-y-4">
        <div className="flex gap-3">
          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Mois</label>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="px-3 py-2 text-xs bg-black/30 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Posts/semaine</label>
            <select value={postsPerWeek} onChange={e => setPostsPerWeek(Number(e.target.value))}
              className="px-3 py-2 text-xs bg-black/30 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none">
              {[1,2,3,4,5,7].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={generate} disabled={loading}
              className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg text-xs font-medium disabled:opacity-50">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : <Sparkles className="w-3.5 h-3.5 inline mr-1" />}
              Générer
            </button>
          </div>
        </div>

        {items.length > 0 && (
          <>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/40">
                  <span className="text-[10px] text-zinc-500 w-16 shrink-0">{item.date}</span>
                  <span className="text-xs text-zinc-200 flex-1 truncate">{item.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{item.platform}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-300">{item.type}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={onClose} className="flex-1 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-300">Annuler</button>
              <button onClick={saveAll} disabled={saving}
                className="flex-1 px-3 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg text-xs font-medium disabled:opacity-50">
                {saving ? 'Sauvegarde...' : `Sauvegarder ${items.length} contenus`}
              </button>
            </div>
          </>
        )}
      </div>
    </AdaptiveModal>
  );
}
