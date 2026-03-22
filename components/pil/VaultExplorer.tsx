'use client';

import React, { useState, useEffect } from 'react';
import { Database, Search, Code2, RefreshCw, Tag, RotateCcw, Copy, Check } from 'lucide-react';

interface VaultItem {
  id: string;
  briefText: string;
  codeContent: string;
  serviceId: string;
  createdAt: string;
  successRate: number;
  reuseCount: number;
}

export function VaultExplorer({ isDark }: { isDark: boolean }) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const copyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* clipboard non disponible */ }
  };

  const card = isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-neutral-200';
  const textH = isDark ? 'text-white' : 'text-neutral-900';
  const textM = isDark ? 'text-neutral-400' : 'text-neutral-500';

  const fetchVault = async (q?: string) => {
    setLoading(true);
    try {
      const url = q ? `/api/vault?q=${encodeURIComponent(q)}` : '/api/vault';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setItems(data.data?.items || []);
    } catch {
      // vault might not exist yet
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchVault(); }, []);

  const handleSearch = () => { if (query.trim()) fetchVault(query); else fetchVault(); };

  const serviceColors: Record<string, string> = {
    branding: 'bg-fuchsia-500/20 text-fuchsia-300',
    web_dev: 'bg-emerald-500/20 text-emerald-300',
    marketing: 'bg-amber-500/20 text-amber-300',
    data: 'bg-cyan-500/20 text-cyan-300',
    generic: 'bg-neutral-500/20 text-neutral-300',
  };

  return (
    <div className="h-full flex flex-col p-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Database size={22} className="text-[rgb(var(--accent-400))]" />
          <h1 className={`text-2xl font-bold ${textH}`}>The Vault</h1>
        </div>
        <button onClick={() => fetchVault()} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-neutral-500' : 'hover:bg-neutral-200 text-neutral-400'}`}>
          <RefreshCw size={16} />
        </button>
      </div>

      <p className={`text-sm mb-4 ${textM}`}>Mémoire sémantique RAG — Composants réutilisables générés par l'agence.</p>

      {/* Search */}
      <div className={`flex gap-2 mb-6 p-3 rounded-xl border ${card}`}>
        <Search size={16} className={textM} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Recherche sémantique dans la vault..."
          className={`flex-1 bg-transparent text-sm outline-none ${isDark ? 'text-white placeholder:text-neutral-500' : 'text-neutral-900 placeholder:text-neutral-400'}`}
        />
        <button onClick={handleSearch} className="px-3 py-1 rounded-lg bg-[rgb(var(--accent-500))] text-white text-xs font-medium">Chercher</button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw size={24} className="animate-spin text-neutral-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Database size={40} className="text-neutral-700" />
            <p className={textM}>Vault vide — les composants générés apparaîtront ici.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {items.map(item => (
              <div
                key={item.id}
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className={`rounded-2xl border p-4 cursor-pointer transition-all ${card} ${isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-neutral-50'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className={`text-sm font-medium ${textH} line-clamp-2`}>{item.briefText}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ml-2 ${serviceColors[item.serviceId] || serviceColors.generic}`}>
                    {item.serviceId}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={textM}><RotateCcw size={10} className="inline mr-1" />{item.reuseCount}x réutilisé</span>
                  <span className={textM}>{Math.round(item.successRate * 100)}% succès</span>
                </div>
                {expandedId === item.id && (
                  <div className="relative mt-3">
                    <button
                      onClick={e => { e.stopPropagation(); copyCode(item.codeContent, item.id); }}
                      className={`absolute top-2 right-2 p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-500'} transition-colors z-10`}
                    >
                      {copiedId === item.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                    <pre className={`p-3 rounded-xl text-xs font-mono overflow-x-auto max-h-60 ${isDark ? 'bg-black/40 text-emerald-300' : 'bg-neutral-100 text-neutral-800'}`}>
                      {item.codeContent?.substring(0, 2000) || 'Pas de contenu'}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
