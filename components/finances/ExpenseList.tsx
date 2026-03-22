'use client';
import { motion } from 'framer-motion';
import type { Expense } from '@/lib/db/schema_finances';

interface Props {
  expenses: Expense[];
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('fr-FR');
}

const CAT_COLORS: Record<string, string> = {
  'Outils': 'text-fuchsia-400 bg-fuchsia-900/30',
  'Freelance': 'text-cyan-400 bg-cyan-900/30',
  'Pub': 'text-fuchsia-400 bg-fuchsia-900/30',
  'Formation': 'text-amber-400 bg-amber-900/30',
  'Autre': 'text-zinc-400 bg-zinc-800',
};

export function ExpenseList({ expenses }: Props) {
  if (expenses.length === 0) {
    return <p className="text-zinc-500 text-sm text-center py-12">Aucune dépense</p>;
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
              <th className="text-left px-4 py-3">Libellé</th>
              <th className="text-left px-4 py-3">Catégorie</th>
              <th className="text-left px-4 py-3">Montant</th>
              <th className="text-left px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp, i) => (
              <motion.tr
                key={exp.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
              >
                <td className="px-4 py-3 text-zinc-200">{exp.label}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CAT_COLORS[exp.category] || CAT_COLORS['Autre']}`}>
                    {exp.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-100 font-medium">{fmt(exp.amount)}</td>
                <td className="px-4 py-3 text-zinc-500">{fmtDate(exp.date)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end mt-2 text-sm text-zinc-400">
        Total : <span className="text-zinc-100 font-semibold ml-2">{fmt(total)}</span>
      </div>
    </div>
  );
}
