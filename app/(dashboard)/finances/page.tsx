'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet } from 'lucide-react';
import type { Invoice } from '@/lib/db/schema_finances';
import type { Expense } from '@/lib/db/schema_finances';
import { exportCSV } from '@/lib/utils';
import { FinancesStatsBar } from '@/components/finances/FinancesStatsBar';
import { FinancesToolbar } from '@/components/finances/FinancesToolbar';
import { InvoiceList } from '@/components/finances/InvoiceList';
import { ExpenseList } from '@/components/finances/ExpenseList';
import { InvoiceFormModal } from '@/components/finances/InvoiceFormModal';
import { ExpenseFormModal } from '@/components/finances/ExpenseFormModal';
import { InvoiceDetailModal } from '@/components/finances/InvoiceDetailModal';

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
      console.error('Erreur chargement finances:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Wallet className="w-5 h-5 text-emerald-400" />
          <h1 className="text-sm font-semibold text-zinc-100">Finances & Facturation</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <FinancesStatsBar stats={stats} />
        <FinancesToolbar
          view={view}
          onViewChange={setView}
          onCreateInvoice={() => setCreateInvoiceOpen(true)}
          onCreateExpense={() => setCreateExpenseOpen(true)}
          onExport={() => {
            if (view === 'invoices') {
              exportCSV(invoices.map(i => ({
                Numero: i.invoiceNumber ?? '',
                Client: i.clientName ?? '',
                Montant: i.amount ?? 0,
                Statut: i.status ?? '',
                Echeance: i.dueDate ? new Date(i.dueDate).toLocaleDateString('fr-FR') : '',
                Date: i.createdAt ? new Date(i.createdAt).toLocaleDateString('fr-FR') : '',
              })), `factures-${new Date().toISOString().slice(0, 10)}.csv`);
            } else {
              exportCSV(expenses.map(e => ({
                Description: e.description ?? '',
                Montant: e.amount ?? 0,
                Categorie: e.category ?? '',
                Date: e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '',
              })), `depenses-${new Date().toISOString().slice(0, 10)}.csv`);
            }
          }}
        />

        {loading ? (
          <div className="text-center py-12 text-zinc-500 text-sm">Chargement...</div>
        ) : view === 'invoices' ? (
          <InvoiceList invoices={invoices} onSelect={setSelectedInvoice} />
        ) : (
          <ExpenseList expenses={expenses} />
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
