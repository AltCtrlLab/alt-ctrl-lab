'use client';

import { useState, useEffect, useCallback } from 'react';
import { Palette, Plus, Loader2, Eye } from 'lucide-react';

interface BrandKit {
  id: string;
  clientId: string;
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  tagline: string;
}

export function BrandKitManager() {
  const [kits, setKits] = useState<BrandKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/branding/kit');
      const json = await res.json();
      if (json.success) setKits(json.data?.kits ?? []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function viewKit(kitId: string) {
    try {
      const res = await fetch(`/api/branding/kit?id=${kitId}&format=html`);
      const json = await res.json();
      if (json.success && json.data?.html) setPreview(json.data.html);
    } catch { /* silent */ }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-fuchsia-400 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
        <Palette className="w-4 h-4 text-fuchsia-400" /> Brand Kits
      </h3>

      {kits.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-8">Aucun brand kit. Utilisez l'API pour en créer un.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {kits.map(kit => (
            <div key={kit.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-zinc-200">{kit.companyName}</p>
                <button onClick={() => viewKit(kit.id)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
                  <Eye className="w-3.5 h-3.5 text-zinc-500" />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                {[kit.primaryColor, kit.secondaryColor, kit.accentColor].filter(Boolean).map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border border-zinc-700" style={{ backgroundColor: c }} title={c} />
                ))}
              </div>
              <p className="text-[10px] text-zinc-500">{kit.fontHeading} / {kit.fontBody}</p>
              {kit.tagline && <p className="text-xs text-zinc-400 mt-1 italic">&ldquo;{kit.tagline}&rdquo;</p>}
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
