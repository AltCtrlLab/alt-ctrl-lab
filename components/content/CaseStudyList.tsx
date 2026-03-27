'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';

interface CaseStudy {
  id: string;
  title: string;
  subtitle: string;
  challenge: string;
  tags: string[];
  createdAt: number;
}

export function CaseStudyList() {
  const [studies, setStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/content/case-study');
      const json = await res.json();
      if (json.success) setStudies(json.data?.caseStudies ?? []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-fuchsia-400 animate-spin" /></div>;

  if (studies.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
        <p className="text-sm text-zinc-400">Aucune case study générée.</p>
        <p className="text-xs text-zinc-500 mt-1">Générez-en depuis le détail d'un projet livré.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {studies.map(cs => (
        <div key={cs.id} className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors">
          <h3 className="text-sm font-semibold text-zinc-100 mb-1">{cs.title}</h3>
          {cs.subtitle && <p className="text-xs text-zinc-400 mb-3">{cs.subtitle}</p>}
          {cs.challenge && <p className="text-xs text-zinc-500 line-clamp-3 mb-3">{cs.challenge}</p>}
          {cs.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {cs.tags.map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{tag}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
