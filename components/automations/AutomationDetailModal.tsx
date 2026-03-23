'use client';
import { useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { Automation, AutomationStatus } from '@/lib/db/schema_automations';
import { AutomationStatusBadge } from './AutomationStatusBadge';
import { ToolBadge } from './ToolBadge';

interface Props {
  automation: Automation;
  onClose: () => void;
  onUpdated: () => void;
}

export function AutomationDetailModal({ automation, onClose, onUpdated }: Props) {
  const trapRef = useFocusTrap(true, onClose);
  const [status, setStatus] = useState<AutomationStatus>(automation.status as AutomationStatus);
  const [saving, setSaving] = useState(false);

  const toggleStatus = async () => {
    const newStatus: AutomationStatus = status === 'Actif' ? 'Inactif' : 'Actif';
    setStatus(newStatus);
    setSaving(true);
    await fetch(`/api/automations?id=${automation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    onUpdated();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer cette automation ?')) return;
    await fetch(`/api/automations?id=${automation.id}`, { method: 'DELETE' });
    onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div ref={trapRef} role="dialog" aria-modal="true" aria-label="Détails de l'automation" tabIndex={-1} className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">{automation.name}</h2>
          <button onClick={onClose} aria-label="Fermer" className="text-zinc-400 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <AutomationStatusBadge status={status} />
            <ToolBadge tool={automation.tool as any} />
          </div>
          {automation.description && <p className="text-sm text-zinc-400">{automation.description}</p>}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[['Exécutions', automation.runCount ?? 0], ['Erreurs', automation.errorCount ?? 0], ['Trigger', automation.triggerType ?? '—']].map(([label, val]) => (
              <div key={label as string} className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-400 mb-1">{label}</p>
                <p className="text-sm font-medium text-zinc-200">{val}</p>
              </div>
            ))}
          </div>
          {automation.webhookUrl && (
            <div>
              <p className="text-xs text-zinc-400 mb-1">Webhook URL</p>
              <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg p-2">
                <p className="text-xs text-zinc-400 truncate flex-1">{automation.webhookUrl}</p>
                <a href={automation.webhookUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-300">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
          {automation.notes && (
            <div>
              <p className="text-xs text-zinc-400 mb-1">Notes</p>
              <p className="text-sm text-zinc-300 bg-zinc-800/50 rounded-lg p-3">{automation.notes}</p>
            </div>
          )}
          <button onClick={toggleStatus} disabled={saving}
            className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${status === 'Actif' ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
            {status === 'Actif' ? 'Désactiver' : 'Activer'}
          </button>
          <button onClick={handleDelete} className="w-full px-3 py-2 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 rounded-lg text-sm transition-colors">
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
