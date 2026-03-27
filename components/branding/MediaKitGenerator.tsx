'use client';

import { useState, useEffect, useCallback } from 'react';
import { Newspaper, Loader2, Eye, Download } from 'lucide-react';

interface MediaKit {
  id: string;
  companyName: string;
  type: string;
  createdAt: number;
}

export function MediaKitGenerator() {
  const [kits, setKits] = useState<MediaKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/branding/media-kit');
      const json = await res.json();
      if (json.success) setKits(json.data?.kits ?? []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch('/api/branding/media-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'agency' }),
      });
      const json = await res.json();
      if (json.success) { load(); if (json.data?.html) setPreview(json.data.html); }
    } catch { /* silent */ } finally { setGenerating(false); }
  }

  async function viewKit(id: string) {
    try {
      const res = await fetch(`/api/branding/media-kit?id=${id}&format=html`);
      const json = await res.json();
      if (json.success && json.data?.html) setPreview(json.data.html);
    } catch { /* silent */ }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-fuchsia-400 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-violet-400" /> Media Kits
        </h3>
        <button onClick={generate} disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/25 text-violet-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Newspaper className="w-3.5 h-3.5" />}
          Générer
        </button>
      </div>

      {kits.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-6">Aucun media kit. Cliquez sur &quot;Générer&quot; pour en créer un.</p>
      ) : (
        <div className="space-y-2">
          {kits.map(k => (
            <div key={k.id} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200">{k.companyName}</p>
                <p className="text-[10px] text-zinc-500">{k.type} · {new Date(k.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              <button onClick={() => viewKit(k.id)} className="p-1.5 rounded-lg hover:bg-zinc-800"><Eye className="w-3.5 h-3.5 text-zinc-500" /></button>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-xl max-w-2xl max-h-[80vh] overflow-auto w-full mx-4" onClick={e => e.stopPropagation()}>
            <div dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
        </div>
      )}
    </div>
  );
}
