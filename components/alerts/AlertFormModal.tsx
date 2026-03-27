'use client';

import { useState, useEffect } from 'react';
import { AdaptiveModal } from '@/components/mobile/AdaptiveModal';

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

interface AlertFormModalProps {
  rule?: AlertRule | null;
  onClose: () => void;
  onSaved: () => void;
}

const alertTypeOptions: { value: AlertRule['alertType']; label: string }[] = [
  { value: 'new_lead', label: 'Nouveau lead' },
  { value: 'site_down', label: 'Site down' },
  { value: 'kpi_threshold', label: 'Seuil KPI' },
  { value: 'payment_received', label: 'Paiement reçu' },
  { value: 'sla_breach', label: 'Breach SLA' },
];

const channelOptions: { value: AlertRule['channel']; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'slack', label: 'Slack' },
  { value: 'webhook', label: 'Webhook' },
];

export function AlertFormModal({ rule, onClose, onSaved }: AlertFormModalProps) {
  const isEditing = !!rule;

  const [name, setName] = useState('');
  const [alertType, setAlertType] = useState<AlertRule['alertType']>('new_lead');
  const [channel, setChannel] = useState<AlertRule['channel']>('email');
  const [threshold, setThreshold] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setAlertType(rule.alertType);
      setChannel(rule.channel);
      setThreshold(rule.threshold);
      setEnabled(rule.enabled);
    }
  }, [rule]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body = { name, alertType, channel, threshold, enabled };

    try {
      const res = isEditing
        ? await fetch('/api/alerts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: rule.id, ...body }),
          })
        : await fetch('/api/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Erreur lors de la sauvegarde');
      }

      onSaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500/50 transition-colors';

  return (
    <AdaptiveModal
      isOpen
      onClose={onClose}
      title={isEditing ? 'Modifier la règle' : 'Nouvelle règle d\'alerte'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Alerte nouveau lead"
            required
            className={inputClass}
          />
        </div>

        {/* Alert type */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Type d&apos;alerte</label>
          <select
            value={alertType}
            onChange={(e) => setAlertType(e.target.value as AlertRule['alertType'])}
            className={inputClass}
          >
            {alertTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Channel */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Canal</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as AlertRule['channel'])}
            className={inputClass}
          >
            {channelOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Threshold */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Seuil</label>
          <input
            type="text"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="Ex: > 5000€, < 90%, etc."
            className={inputClass}
          />
        </div>

        {/* Enabled */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-fuchsia-500 focus:ring-fuchsia-500/30"
          />
          <span className="text-sm text-zinc-300">Activée</span>
        </label>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-4 py-2 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/25 text-fuchsia-300 rounded-xl text-xs font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </form>
    </AdaptiveModal>
  );
}
