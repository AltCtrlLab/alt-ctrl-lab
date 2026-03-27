'use client';

import { useState, useEffect, useCallback } from 'react';
import { Layout, Loader2, Eye } from 'lucide-react';

interface Template {
  id: string;
  type: string;
  name: string;
  platform: string;
  previewHtml: string;
}

const TEMPLATE_TYPES = ['quote', 'stat', 'testimonial', 'before-after', 'listicle', 'story'];

export function SocialTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/content/social-template');
      const json = await res.json();
      if (json.success) setTemplates(json.data?.templates ?? []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? templates : templates.filter(t => t.type === filter);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-fuchsia-400 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === 'all' ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
          Tous
        </button>
        {TEMPLATE_TYPES.map(type => (
          <button key={type} onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === type ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
            {type}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Layout className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Aucun template social disponible.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(t => (
            <div key={t.id} className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors group cursor-pointer"
              onClick={() => t.previewHtml && setPreview(t.previewHtml)}>
              <div className="aspect-square bg-zinc-800 rounded-lg mb-2 flex items-center justify-center">
                <Layout className="w-8 h-8 text-zinc-600 group-hover:text-fuchsia-400 transition-colors" />
              </div>
              <p className="text-xs font-medium text-zinc-200 truncate">{t.name || t.type}</p>
              <p className="text-[10px] text-zinc-500 capitalize">{t.type} · {t.platform}</p>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="bg-zinc-900 rounded-xl max-w-lg max-h-[80vh] overflow-auto w-full mx-4 p-1" onClick={e => e.stopPropagation()}>
            <div dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
        </div>
      )}
    </div>
  );
}
