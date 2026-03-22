'use client';
import { motion } from 'framer-motion';
import { AlertTriangle, Wallet } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Invoice } from '@/lib/db/schema_finances';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';

interface Props {
  invoices: Invoice[];
  onSelect: (inv: Invoice) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(ts: number | null | undefined) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('fr-FR');
}

export function InvoiceList({ invoices, onSelect }: Props) {
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        color="fuchsia"
        message="Aucune facture"
        submessage="Une facture est créée automatiquement quand un lead passe au statut Signé."
      />
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
            <th className="text-left px-4 py-3">Client</th>
            <th className="text-left px-4 py-3">Montant</th>
            <th className="text-left px-4 py-3">Statut</th>
            <th className="text-left px-4 py-3">Échéance</th>
            <th className="text-left px-4 py-3">Créée</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv, i) => {
            const overdue = inv.status === 'En retard';
            return (
              <motion.tr
                key={inv.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => onSelect(inv)}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {overdue && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
                    <span className={overdue ? 'text-rose-300' : 'text-zinc-200'}>{inv.clientName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-100 font-medium">{fmt(inv.amount)}</td>
                <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status as any} /></td>
                <td className="px-4 py-3 text-zinc-400">{fmtDate(inv.dueDate)}</td>
                <td className="px-4 py-3 text-zinc-500">{fmtDate(inv.createdAt)}</td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
