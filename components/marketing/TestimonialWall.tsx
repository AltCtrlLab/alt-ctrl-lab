'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, Check, X, Loader2 } from 'lucide-react';

interface Testimonial {
  id: string;
  clientName: string;
  company: string;
  role: string;
  rating: number;
  text: string;
  approved: number;
  featured: number;
  createdAt: number;
}

export function TestimonialWall() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/marketing/testimonial');
      const json = await res.json();
      if (json.success) setTestimonials(json.data?.testimonials ?? []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approve(id: string) {
    await fetch('/api/marketing/testimonial', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'approve' }),
    });
    load();
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-fuchsia-400 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-amber-400" /> Témoignages
        {testimonials.filter(t => !t.approved).length > 0 && (
          <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
            {testimonials.filter(t => !t.approved).length} en attente
          </span>
        )}
      </h3>

      {testimonials.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-6">Aucun témoignage reçu.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {testimonials.map(t => (
            <div key={t.id} className={`p-4 rounded-xl border ${t.approved ? 'border-zinc-800 bg-zinc-900/40' : 'border-amber-500/30 bg-amber-500/5'}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-zinc-200">{t.clientName}</p>
                  <p className="text-[10px] text-zinc-500">{t.role}{t.company ? ` · ${t.company}` : ''}</p>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-3 h-3 ${i < t.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3 mb-2">&ldquo;{t.text}&rdquo;</p>
              {!t.approved && (
                <button onClick={() => approve(t.id)} className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300">
                  <Check className="w-3 h-3" /> Approuver
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
