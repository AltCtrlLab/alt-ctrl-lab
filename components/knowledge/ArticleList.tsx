'use client';

import { Tag, Clock } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  contentMd: string;
  category: 'process' | 'template' | 'runbook' | 'decision';
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

const CATEGORY_STYLE: Record<string, { label: string; cls: string }> = {
  process:  { label: 'Process',  cls: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300' },
  template: { label: 'Template', cls: 'bg-sky-500/10 border-sky-500/25 text-sky-300' },
  runbook:  { label: 'Runbook',  cls: 'bg-amber-500/10 border-amber-500/25 text-amber-300' },
  decision: { label: 'Decision', cls: 'bg-fuchsia-500/10 border-fuchsia-500/25 text-fuchsia-300' },
};

function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "a l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days}j`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
}

interface ArticleListProps {
  articles: Article[];
  onSelect: (article: Article) => void;
}

export function ArticleList({ articles, onSelect }: ArticleListProps) {
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <p className="text-sm">Aucun article trouve</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {articles.map((article) => {
        const catStyle = CATEGORY_STYLE[article.category] ?? CATEGORY_STYLE.process;

        return (
          <button
            key={article.id}
            onClick={() => onSelect(article)}
            className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 text-left hover:bg-white/[0.06] transition-colors group"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors line-clamp-2">
                {article.title}
              </h3>
              <span className={`shrink-0 px-2 py-0.5 rounded-lg text-[10px] border ${catStyle.cls}`}>
                {catStyle.label}
              </span>
            </div>

            {/* Preview */}
            <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
              {article.contentMd.slice(0, 120)}
            </p>

            {/* Footer: tags + date */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                {article.tags.length > 0 && <Tag className="w-3 h-3 text-zinc-600 shrink-0" />}
                {article.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-[10px] text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5 truncate max-w-[80px]">
                    {tag}
                  </span>
                ))}
                {article.tags.length > 3 && (
                  <span className="text-[10px] text-zinc-600">+{article.tags.length - 3}</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-zinc-600 shrink-0">
                <Clock className="w-3 h-3" />
                {relativeDate(article.updatedAt)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
