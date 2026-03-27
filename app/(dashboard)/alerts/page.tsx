'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, AlertTriangle } from 'lucide-react';
import { AlertRuleCard } from '@/components/alerts/AlertRuleCard';
import { AlertFormModal } from '@/components/alerts/AlertFormModal';

interface AlertRule {
  id: string;
  name: string;
  alertType: 'new_lead' | 'site_down' | 'kpi_threshold' | 'payment_received' | 'sla_breach';
  channel: 'email' | 'slack' | 'webhook';
  threshold: string;
  enabled: boolean;
  clientId: string | null;
  createdAt: number;
}

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/alerts');
      if (!res.ok) throw new Error('Erreur de chargement');
      const json = await res.json();
      setRules(json.data?.rules ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  async function handleToggle(rule: AlertRule) {
    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
      });
      if (!res.ok) throw new Error('Erreur de mise à jour');
      await fetchRules();
    } catch {
      // Silently fail — could add toast here
    }
  }

  function handleEdit(rule: AlertRule) {
    setEditingRule(rule);
    setShowForm(true);
  }

  function handleNew() {
    setEditingRule(null);
    setShowForm(true);
  }

  function handleModalClose() {
    setShowForm(false);
    setEditingRule(null);
  }

  function handleSaved() {
    handleModalClose();
    fetchRules();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-fuchsia-500/10 rounded-xl">
            <Bell className="w-5 h-5 text-fuchsia-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Alertes &amp; Notifications</h1>
            <p className="text-xs text-zinc-500">Configurez vos règles d&apos;alerte automatiques</p>
          </div>
        </div>

        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/25 text-fuchsia-300 rounded-xl text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouvelle règle
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && rules.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rules.map((rule) => (
            <AlertRuleCard
              key={rule.id}
              rule={rule}
              onEdit={() => handleEdit(rule)}
              onToggle={() => handleToggle(rule)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && rules.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 bg-white/[0.03] rounded-2xl mb-4">
            <Bell className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-sm font-medium text-zinc-400 mb-1">Aucune règle d&apos;alerte</h3>
          <p className="text-xs text-zinc-600 mb-4">
            Créez votre première règle pour recevoir des notifications automatiques.
          </p>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/25 text-fuchsia-300 rounded-xl text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Créer une règle
          </button>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <AlertFormModal
          rule={editingRule}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
