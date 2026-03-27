'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Users, Loader2 } from 'lucide-react';

interface LeadMagnet {
  id: string;
  title: string;
  description: string;
  category: string;
  downloads: number;
  leadsCaptured: number;
  active: number;
}

export function LeadMagnets() {
  const [magnets, setMagnets] = useState<LeadMagnet[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/marketing/lead-magnet');
      const json = await res.json();
      if (json.success) setMagnets(json.data?.magnets ?? []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-fuchsia-400 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
        <FileText className="w-4 h-4 text-violet-400" /> Lead Magnets
      </h3>

      {magnets.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-6">Aucun lead magnet configuré.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {magnets.map(m => (
            <div key={m.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-zinc-200">{m.title}</p>
                <span className={`w-2 h-2 rounded-full ${m.active ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
              </div>
              {m.description && <p className="text-xs text-zinc-400 mb-3 line-clamp-2">{m.description}</p>}
              <div className="flex gap-4 text-[10px] text-zinc-400">
                <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {m.downloads}</span>
                <span className="flex items-center gap-1 text-emerald-400"><Users className="w-3 h-3" /> {m.leadsCaptured} leads</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
