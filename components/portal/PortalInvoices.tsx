'use client';
import { CreditCard, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import type { Invoice } from '@/lib/db/schema_finances';

interface Props {
  invoices: Invoice[];
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

const STATUS_STYLES: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  'Payée': { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  'Envoyée': { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'En retard': { icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  'Brouillon': { icon: Clock, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
};

export function PortalInvoices({ invoices }: Props) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-fuchsia-400" />
        Factures
      </h2>
      <div className="space-y-3">
        {invoices.map(inv => {
          const style = STATUS_STYLES[inv.status] ?? STATUS_STYLES['Brouillon'];
          const Icon = style.icon;
          return (
            <div key={inv.id} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.bg}`}>
                  <Icon className={`w-4 h-4 ${style.color}`} />
                </div>
                <div>
                  <div className="text-zinc-200 text-sm font-medium">{fmt(inv.amount)}</div>
                  <div className="text-zinc-400 text-xs">
                    {inv.dueDate ? `Échéance : ${new Date(inv.dueDate).toLocaleDateString('fr-FR')}` : 'Pas d\u2019échéance'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.color}`}>
                  {inv.status}
                </span>
                {inv.stripePaymentLinkUrl && inv.status !== 'Payée' && (
                  <a
                    href={inv.stripePaymentLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-1.5 rounded-lg bg-fuchsia-600 text-white text-xs font-medium hover:bg-fuchsia-500 transition-colors"
                  >
                    Payer
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
