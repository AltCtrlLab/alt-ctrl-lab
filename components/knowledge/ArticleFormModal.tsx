'use client';

import { useState, useEffect } from 'react';
import { AdaptiveModal } from '@/components/mobile/AdaptiveModal';

interface Article {
  id: string;
  title: string;
  contentMd: string;
  category: 'process' | 'template' | 'runbook' | 'decision';
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

const CATEGORIES = ['process', 'template', 'runbook', 'decision'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  process: 'Process',
  template: 'Template',
  runbook: 'Runbook',
  decision: 'Decision',
};

interface ArticleFormModalProps {
  article?: Article | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ArticleFormModal({ article, onClose, onSaved }: ArticleFormModalProps) {
  const isEdit = !!article;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('process');
  const [tagsInput, setTagsInput] = useState('');
  const [contentMd, setContentMd] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setCategory(article.category);
      setTagsInput(article.tags.join(', '));
      setContentMd(article.contentMd);
    }
  }, [article]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }
    if (!contentMd.trim()) {
      setError('Le contenu est requis');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = { title: title.trim(), category, tags, contentMd: contentMd.trim() };

    setSaving(true);
    try {
      const url = isEdit ? `/api/knowledge?id=${article.id}` : '/api/knowledge';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        onSaved();
      } else {
        setError(data.error ?? 'Erreur inconnue');
      }
    } catch {
      setError('Erreur reseau');
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    'w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/20 transition-all';

  return (
    <AdaptiveModal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Modifier l\'article' : 'Nouvel article'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Titre</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de l'article"
            className={inputCls}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Categorie</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])}
            className={inputCls}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Tags (separes par des virgules)</label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="onboarding, client, process"
            className={inputCls}
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Contenu (Markdown)</label>
          <textarea
            value={contentMd}
            onChange={(e) => setContentMd(e.target.value)}
            rows={12}
            placeholder="Contenu de l'article en Markdown..."
            className={`${inputCls} resize-y min-h-[200px]`}
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-rose-400">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/25 text-fuchsia-300 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin" />
            )}
            {isEdit ? 'Enregistrer' : 'Creer'}
          </button>
        </div>
      </form>
    </AdaptiveModal>
  );
}
