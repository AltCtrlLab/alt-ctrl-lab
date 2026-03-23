'use client';
import { useState } from 'react';
import { AdaptiveModal } from '@/components/mobile/AdaptiveModal';
import type { Invoice, InvoiceStatus } from '@/lib/db/schema_finances';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

interface Props {
  invoice: Invoice;
  onClose: () => void;
  onUpdated: () => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export function InvoiceDetailModal({ invoice, onClose, onUpdated }: Props) {
  const [status, setStatus] = useState<InvoiceStatus>(invoice.status as InvoiceStatus);
  const [saving, setSaving] = useState(false);

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    setStatus(newStatus);
    setSaving(true);
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'Payée') updateData.paidAt = Date.now();
      if (newStatus === 'Envoyée') updateData.sentAt = Date.now();
      await fetch(`/api/finances?id=${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer cette facture ?')) return;
    await fetch(`/api/finances?id=${invoice.id}&type=invoice`, { method: 'DELETE' });
    onUpdated();
    onClose();
  };

  return (
    <AdaptiveModal isOpen={true} onClose={onClose} title={invoice.clientName} maxWidth="max-w-md">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-zinc-100">{fmt(invoice.amount)}</span>
            <InvoiceStatusBadge status={status} />
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-2">Changer le statut</p>
            <div className="flex flex-wrap gap-2">
              {(['Brouillon', 'Envoyée', 'Payée', 'En retard'] as InvoiceStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={saving || s === status}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    s === status ? 'opacity-50 cursor-default bg-zinc-800 text-zinc-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {invoice.notes && (
            <div>
              <p className="text-xs text-zinc-400 mb-1">Notes</p>
              <p className="text-sm text-zinc-300 bg-zinc-800/50 rounded-lg p-3">{invoice.notes}</p>
            </div>
          )}
          <button onClick={handleDelete} className="w-full px-3 py-2 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 rounded-lg text-sm transition-colors">
            Supprimer
          </button>
        </div>
    </AdaptiveModal>
  );
}
