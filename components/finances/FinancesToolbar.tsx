'use client';
import { Plus, FileText, Receipt } from 'lucide-react';

interface Props {
  view: 'invoices' | 'expenses';
  onViewChange: (v: 'invoices' | 'expenses') => void;
  onCreateInvoice: () => void;
  onCreateExpense: () => void;
}

export function FinancesToolbar({ view, onViewChange, onCreateInvoice, onCreateExpense }: Props) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        <button
          onClick={() => onViewChange('invoices')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
            view === 'invoices' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Factures
        </button>
        <button
          onClick={() => onViewChange('expenses')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
            view === 'expenses' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Dépenses
        </button>
      </div>
      <button
        onClick={view === 'invoices' ? onCreateInvoice : onCreateExpense}
        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        {view === 'invoices' ? 'Nouvelle facture' : 'Nouvelle dépense'}
      </button>
    </div>
  );
}
