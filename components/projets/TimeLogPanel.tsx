'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, Clock } from 'lucide-react';
import type { TimeEntry, TimeCategory } from '@/lib/db/schema_projects';
import { CATEGORY_COLORS } from '@/lib/db/schema_projects';
import { CategoryBreakdown } from './CategoryBreakdown';

const CATEGORIES: TimeCategory[] = ['Design', 'Dev', 'QA', 'Réunion', 'Autre'];

interface TimeLogPanelProps {
  projectId: string;
  onHoursUpdated?: () => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function TimeLogPanel({ projectId, onHoursUpdated }: TimeLogPanelProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    description: '',
    hours: '',
    category: 'Dev' as TimeCategory,
    date: new Date().toISOString().split('T')[0],
  });

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/time-entries?projectId=${projectId}`);
      const data = await res.json();
      if (data.success) setEntries(data.data.entries);
    } catch {}
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() || !form.hours) return;
    setSubmitting(true);
    try {
      await fetch('/api/projects/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          description: form.description.trim(),
          hours: parseFloat(form.hours),
          category: form.category,
          date: new Date(form.date).getTime(),
        }),
      });
      setForm({ description: '', hours: '', category: 'Dev', date: new Date().toISOString().split('T')[0] });
      setShowForm(false);
      await fetchEntries();
      onHoursUpdated?.();
    } catch {}
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/projects/time-entries?id=${id}`, { method: 'DELETE' });
    await fetchEntries();
    onHoursUpdated?.();
  };

  const inputCls = "w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-fuchsia-500/60 focus:ring-1 focus:ring-fuchsia-500/20 transition-all";

  return (
    <div className="space-y-4">
      {/* Breakdown */}
      {entries.length > 0 && <CategoryBreakdown entries={entries} />}

      {/* Add button */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Entrées de temps
        </p>
        <button
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1 text-xs text-fuchsia-400 hover:text-fuchsia-300 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Loguer
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-700 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <input
              className={inputCls}
              placeholder="Description..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              required
            />
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              className={inputCls}
              placeholder="Heures (ex: 2.5)"
              value={form.hours}
              onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
              required
            />
            <select
              className={inputCls}
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as TimeCategory }))}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="date"
              className={inputCls}
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* Entries list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2].map(i => <div key={i} className="h-10 rounded-lg bg-zinc-800/50 animate-pulse" />)}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-xs text-zinc-600 italic text-center py-4">Aucune entrée — loguez vos premières heures.</p>
      ) : (
        <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
          {entries.map(entry => {
            const cat = entry.category as TimeCategory;
            return (
              <div key={entry.id} className="flex items-center gap-3 p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/60 group">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_COLORS[cat]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-300 truncate">{entry.description}</p>
                  <p className="text-[10px] text-zinc-600">{entry.category} · {formatDate(entry.date as number)}</p>
                </div>
                <span className="text-xs font-semibold text-zinc-300 flex-shrink-0">{entry.hours}h</span>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/10 text-zinc-600 hover:text-rose-400 rounded transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
