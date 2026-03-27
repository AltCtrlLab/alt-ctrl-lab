'use client';

import { useState } from 'react';
import { X, Pencil, Trash2, Tag, Calendar } from 'lucide-react';

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

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ArticleDetailProps {
  article: Article;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}

export function ArticleDetail({ article, onClose, onEdit, onDeleted }: ArticleDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const catStyle = CATEGORY_STYLE[article.category] ?? CATEGORY_STYLE.process;

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/knowledge?id=${article.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onDeleted();
      }
    } catch {
      // Silent fail — user can retry
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-zinc-950 border border-white/[0.08] rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-md border-b border-white/[0.06] px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-zinc-100 mb-1">{article.title}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-lg text-[10px] border ${catStyle.cls}`}>
                {catStyle.label}
              </span>
              {article.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onEdit}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
              title="Modifier"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`p-2 rounded-lg transition-colors ${
                confirmDelete
                  ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
              }`}
              title={confirmDelete ? 'Confirmer la suppression' : 'Supprimer'}
            >
              {deleting ? (
                <div className="w-4 h-4 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dates */}
        <div className="px-6 py-3 flex items-center gap-4 text-[10px] text-zinc-500 border-b border-white/[0.04]">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Cree le {formatDate(article.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Modifie le {formatDate(article.updatedAt)}
          </span>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {article.contentMd}
          </div>
        </div>

        {/* Delete confirmation banner */}
        {confirmDelete && !deleting && (
          <div className="sticky bottom-0 bg-rose-950/80 backdrop-blur-md border-t border-rose-500/20 px-6 py-3 flex items-center justify-between">
            <p className="text-xs text-rose-300">Confirmer la suppression de cet article ?</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg text-xs bg-rose-500/20 border border-rose-500/25 text-rose-300 hover:bg-rose-500/30 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
