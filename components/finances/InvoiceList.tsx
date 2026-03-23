'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Wallet, CreditCard, Copy, Loader2 } from 'lucide-react';
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

function StripeButton({ invoice }: { invoice: Invoice }) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(invoice.stripePaymentLinkUrl ?? null);

  const handleGenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (url) {
      navigator.clipboard.writeText(url);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const data = await res.json();
      if (data.url) {
        setUrl(data.url);
        navigator.clipboard.writeText(data.url);
      }
    } catch { setUrl(null); }
    setLoading(false);
  };

  if (invoice.status === 'Payée' || invoice.status === 'Brouillon') return null;

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-fuchsia-600/20 text-fuchsia-300 hover:bg-fuchsia-600/30 transition-colors disabled:opacity-50"
      title={url ? 'Copier le lien' : 'Générer lien de paiement Stripe'}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : url ? <Copy className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
      {url ? 'Copier' : 'Stripe'}
    </button>
  );
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
          <tr className="border-b border-zinc-800 text-zinc-400 text-xs">
            <th className="text-left px-4 py-3">Client</th>
            <th className="text-left px-4 py-3">Montant</th>
            <th className="text-left px-4 py-3">Statut</th>
            <th className="text-left px-4 py-3">Échéance</th>
            <th className="text-left px-4 py-3">Créée</th>
            <th className="text-left px-4 py-3">Paiement</th>
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
                tabIndex={0}
                onClick={() => onSelect(inv)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(inv); } }}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer transition-colors focus-visible:bg-white/[0.05] focus-visible:outline-none"
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
                <td className="px-4 py-3 text-zinc-400">{fmtDate(inv.createdAt)}</td>
                <td className="px-4 py-3"><StripeButton invoice={inv} /></td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
