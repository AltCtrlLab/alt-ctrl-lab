'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, FileText, LayoutTemplate, ScrollText, GitBranch, Plus } from 'lucide-react';
import { StatsBar, type StatItem } from '@/components/ui/StatsBar';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { CategorySidebar } from '@/components/knowledge/CategorySidebar';
import { ArticleList } from '@/components/knowledge/ArticleList';
import { ArticleDetail } from '@/components/knowledge/ArticleDetail';
import { ArticleFormModal } from '@/components/knowledge/ArticleFormModal';

interface Article {
  id: string;
  title: string;
  contentMd: string;
  category: 'process' | 'template' | 'runbook' | 'decision';
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

const ALL_CATEGORIES = ['process', 'template', 'runbook', 'decision'] as const;

function formatRelativeDate(ts: number): string {
  if (!ts) return '-';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `il y a ${Math.max(1, mins)}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export default function KnowledgePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editArticle, setEditArticle] = useState<Article | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge');
      const data = await res.json();
      if (data.success) {
        setArticles(data.data.articles);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Derived data
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cat of ALL_CATEGORIES) {
      map[cat] = 0;
    }
    for (const a of articles) {
      map[a.category] = (map[a.category] ?? 0) + 1;
    }
    return map;
  }, [articles]);

  const filtered = useMemo(() => {
    let result = articles;
    if (activeCategory) {
      result = result.filter((a) => a.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)) ||
          a.contentMd.toLowerCase().includes(q)
      );
    }
    return result;
  }, [articles, activeCategory, search]);

  const lastUpdated = useMemo(() => {
    if (articles.length === 0) return 0;
    return Math.max(...articles.map((a) => a.updatedAt));
  }, [articles]);

  // Find top 2 categories by count
  const topCategories = useMemo(() => {
    return [...ALL_CATEGORIES]
      .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
      .slice(0, 2);
  }, [counts]);

  // Stats
  const statsItems: StatItem[] = [
    {
      label: 'Total articles',
      value: articles.length,
      icon: BookOpen,
      color: 'text-fuchsia-400',
    },
    {
      label: topCategories[0] ? topCategories[0].charAt(0).toUpperCase() + topCategories[0].slice(1) : 'Process',
      value: counts[topCategories[0]] ?? 0,
      icon: topCategories[0] === 'process' ? GitBranch : topCategories[0] === 'template' ? LayoutTemplate : topCategories[0] === 'runbook' ? ScrollText : FileText,
      color: 'text-emerald-400',
    },
    {
      label: topCategories[1] ? topCategories[1].charAt(0).toUpperCase() + topCategories[1].slice(1) : 'Template',
      value: counts[topCategories[1]] ?? 0,
      icon: topCategories[1] === 'process' ? GitBranch : topCategories[1] === 'template' ? LayoutTemplate : topCategories[1] === 'runbook' ? ScrollText : FileText,
      color: 'text-sky-400',
    },
    {
      label: 'Derniere MAJ',
      value: lastUpdated ? formatRelativeDate(lastUpdated) : '-',
      icon: BookOpen,
      color: 'text-amber-400',
    },
  ];

  function handleSaved() {
    setFormOpen(false);
    setEditArticle(null);
    fetchArticles();
  }

  function handleDeleted() {
    setSelectedArticle(null);
    fetchArticles();
  }

  function handleEdit() {
    if (selectedArticle) {
      setEditArticle(selectedArticle);
      setSelectedArticle(null);
      setFormOpen(true);
    }
  }

  function handleCreate() {
    setEditArticle(null);
    setFormOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-40">
        <div className="w-8 h-8 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/25">
            <BookOpen className="w-5 h-5 text-fuchsia-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Base de Connaissances</h1>
            <p className="text-xs text-zinc-500">Documentation interne et procedures</p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/25 text-fuchsia-300 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouvel article
        </button>
      </div>

      {/* Stats */}
      <StatsBar items={statsItems} columns={4} />

      {/* Toolbar */}
      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Rechercher un article...' }}
        count={{ value: filtered.length, label: 'articles' }}
      />

      {/* Layout: sidebar + list */}
      <div className="flex gap-6">
        {/* Sidebar — hidden on mobile */}
        <div className="hidden md:block">
          <CategorySidebar
            categories={[...ALL_CATEGORIES]}
            active={activeCategory}
            onChange={setActiveCategory}
            counts={counts}
          />
        </div>

        {/* Article grid */}
        <div className="flex-1 min-w-0">
          <ArticleList articles={filtered} onSelect={setSelectedArticle} />
        </div>
      </div>

      {/* Article detail */}
      {selectedArticle && (
        <ArticleDetail
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onEdit={handleEdit}
          onDeleted={handleDeleted}
        />
      )}

      {/* Create / Edit modal */}
      {formOpen && (
        <ArticleFormModal
          article={editArticle}
          onClose={() => {
            setFormOpen(false);
            setEditArticle(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
