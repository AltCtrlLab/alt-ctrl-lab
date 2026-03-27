'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Plus, Euro, Clock, TrendingDown, AlertTriangle, FileText, Receipt } from 'lucide-react';
import type { Invoice } from '@/lib/db/schema_finances';
import type { Expense } from '@/lib/db/schema_finances';
import { exportCSV, formatCurrency } from '@/lib/utils';
import { useNotifications } from '@/providers/NotificationProvider';
import { StatsBar } from '@/components/ui/StatsBar';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { InvoiceList } from '@/components/finances/InvoiceList';
import { ExpenseList } from '@/components/finances/ExpenseList';
import { InvoiceFormModal } from '@/components/finances/InvoiceFormModal';
import { ExpenseFormModal } from '@/components/finances/ExpenseFormModal';
import { InvoiceDetailModal } from '@/components/finances/InvoiceDetailModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ExpenseCategoryBreakdown } from '@/components/finances/ExpenseCategoryBreakdown';

interface FinancesStats {
  caEncaisse: number;
  caEnAttente: number;
  depensesMois: number;
  margeNette: number;
  facturesEnRetard: number;
}

export default function FinancesPage() {
  const [view, setView] = useState<'invoices' | 'expenses'>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<FinancesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [createExpenseOpen, setCreateExpenseOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const { push } = useNotifications();

  const fetchAll = useCallback(async () => {
    try {
      const [invRes, expRes, statsRes] = await Promise.all([
        fetch('/api/finances?type=invoices'),
        fetch('/api/finances?type=expenses'),
        fetch('/api/finances?stats=true'),
      ]);
      const invData = await invRes.json();
      const expData = await expRes.json();
      const statsData = await statsRes.json();
      if (invData.success) setInvoices(invData.data.invoices);
      if (expData.success) setExpenses(expData.data.expenses);
      if (statsData.success) setStats(statsData.data);
    } catch (err) {
      push('error', 'Erreur chargement finances', err instanceof Error ? err.message : 'Erreur reseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchAll();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Wallet className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xs md:text-sm font-semibold text-zinc-100">Finances & Facturation</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
        <StatsBar loading={!stats} items={stats ? [
          { label: 'CA encaissé', value: formatCurrency(stats.caEncaisse), icon: Euro, color: 'text-emerald-400' },
          { label: 'CA en attente', value: formatCurrency(stats.caEnAttente), icon: Clock, color: 'text-cyan-400', sub: stats.facturesEnRetard > 0 ? `${stats.facturesEnRetard} en retard` : undefined },
          { label: 'Dépenses / mois', value: formatCurrency(stats.depensesMois), icon: TrendingDown, color: 'text-amber-400' },
          { label: 'Marge nette', value: formatCurrency(stats.margeNette), icon: Euro, color: stats.margeNette >= 0 ? 'text-emerald-400' : 'text-rose-400' },
        ] : []} columns={4} className="mb-4 md:mb-6" />
        <PageToolbar
          viewToggle={{
            current: view,
            onChange: v => setView(v as 'invoices' | 'expenses'),
            options: [
              { key: 'invoices', label: 'Factures', icon: FileText },
              { key: 'expenses', label: 'Depenses', icon: Receipt },
            ],
          }}
          onExport={() => {
            if (view === 'invoices') {
              exportCSV(invoices.map(i => ({
                Numero: i.id ?? '',
                Client: i.clientName ?? '',
                Montant: i.amount ?? 0,
                Statut: i.status ?? '',
                Echeance: i.dueDate ? new Date(i.dueDate).toLocaleDateString('fr-FR') : '',
                Date: i.createdAt ? new Date(i.createdAt).toLocaleDateString('fr-FR') : '',
              })), `factures-${new Date().toISOString().slice(0, 10)}.csv`);
            } else {
              exportCSV(expenses.map(e => ({
                Description: e.label ?? '',
                Montant: e.amount ?? 0,
                Categorie: e.category ?? '',
                Date: e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '',
              })), `depenses-${new Date().toISOString().slice(0, 10)}.csv`);
            }
          }}
          createButton={{
            label: view === 'invoices' ? 'Nouvelle facture' : 'Nouvelle depense',
            icon: Plus,
            onClick: view === 'invoices' ? () => setCreateInvoiceOpen(true) : () => setCreateExpenseOpen(true),
            color: 'bg-emerald-600 hover:bg-emerald-500',
          }}
          className="sticky top-14 z-10 bg-zinc-950/80 backdrop-blur-xl py-2 -mx-4 px-4 md:static md:bg-transparent md:backdrop-blur-none md:py-0 md:mx-0 md:px-0 mb-4"
        />

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : view === 'invoices' && invoices.length === 0 ? (
          <EmptyState icon={Wallet} color="emerald" message="Aucune facture" submessage="Creez votre premiere facture pour commencer" ctaLabel="Creer une facture" onAction={() => setCreateInvoiceOpen(true)} />
        ) : view === 'expenses' && expenses.length === 0 ? (
          <EmptyState icon={Wallet} color="emerald" message="Aucune depense" submessage="Ajoutez vos depenses pour le suivi financier" ctaLabel="Ajouter une depense" onAction={() => setCreateExpenseOpen(true)} />
        ) : view === 'invoices' ? (
          <InvoiceList invoices={invoices} onSelect={setSelectedInvoice} />
        ) : (
          <>
            <ExpenseList expenses={expenses} />
            <ExpenseCategoryBreakdown />
          </>
        )}
      </main>

      <AnimatePresence>
        {createInvoiceOpen && (
          <InvoiceFormModal onClose={() => setCreateInvoiceOpen(false)} onCreated={fetchAll} />
        )}
        {createExpenseOpen && (
          <ExpenseFormModal onClose={() => setCreateExpenseOpen(false)} onCreated={fetchAll} />
        )}
        {selectedInvoice && (
          <InvoiceDetailModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            onUpdated={fetchAll}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
