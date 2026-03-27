'use client';

import { Bell, Mail, Slack, Webhook, AlertTriangle, CreditCard, Activity, Globe, Shield } from 'lucide-react';

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

interface AlertRuleCardProps {
  rule: AlertRule;
  onEdit: () => void;
  onToggle: () => void;
}

const typeConfig: Record<AlertRule['alertType'], { label: string; color: string; icon: typeof Bell }> = {
  new_lead: { label: 'Nouveau lead', color: 'emerald', icon: Bell },
  site_down: { label: 'Site down', color: 'red', icon: Globe },
  kpi_threshold: { label: 'Seuil KPI', color: 'amber', icon: Activity },
  payment_received: { label: 'Paiement reçu', color: 'blue', icon: CreditCard },
  sla_breach: { label: 'Breach SLA', color: 'rose', icon: Shield },
};

const channelIcons: Record<AlertRule['channel'], { icon: typeof Mail; label: string }> = {
  email: { icon: Mail, label: 'Email' },
  slack: { icon: Slack, label: 'Slack' },
  webhook: { icon: Webhook, label: 'Webhook' },
};

export function AlertRuleCard({ rule, onEdit, onToggle }: AlertRuleCardProps) {
  const type = typeConfig[rule.alertType];
  const channel = channelIcons[rule.channel];
  const TypeIcon = type.icon;
  const ChannelIcon = channel.icon;

  return (
    <div
      className={`bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 transition-all hover:border-white/[0.15] ${
        !rule.enabled ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <button
            onClick={onEdit}
            className="text-sm font-semibold text-zinc-100 hover:text-fuchsia-300 transition-colors truncate block text-left"
          >
            {rule.name}
          </button>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {/* Type badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-${type.color}-500/10 border border-${type.color}-500/25 text-${type.color}-300 rounded-xl text-xs`}
            >
              <TypeIcon className="w-3 h-3" />
              {type.label}
            </span>

            {/* Channel badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-500/10 border border-zinc-500/25 text-zinc-300 rounded-xl text-xs">
              <ChannelIcon className="w-3 h-3" />
              {channel.label}
            </span>
          </div>

          {rule.threshold && (
            <p className="mt-2 text-xs text-zinc-500 truncate">
              Seuil : {rule.threshold}
            </p>
          )}
        </div>

        {/* Toggle switch */}
        <button
          onClick={onToggle}
          aria-label={rule.enabled ? 'Désactiver' : 'Activer'}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
            rule.enabled ? 'bg-fuchsia-500' : 'bg-zinc-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              rule.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
