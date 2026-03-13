import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export type InvoiceStatus = 'Brouillon' | 'Envoyée' | 'Payée' | 'En retard';
export type ExpenseCategory = 'Outils' | 'Freelance' | 'Pub' | 'Formation' | 'Autre';

export const INVOICE_STATUS_META: Record<InvoiceStatus, { color: string; bg: string }> = {
  'Brouillon': { color: 'text-zinc-400', bg: 'bg-zinc-800' },
  'Envoyée': { color: 'text-blue-400', bg: 'bg-blue-900/30' },
  'Payée': { color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
  'En retard': { color: 'text-rose-400', bg: 'bg-rose-900/30' },
};

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  clientName: text('client_name').notNull(),
  projectId: text('project_id'),
  amount: real('amount').notNull(),
  status: text('status', { enum: ['Brouillon', 'Envoyée', 'Payée', 'En retard'] }).notNull().default('Brouillon'),
  dueDate: integer('due_date'),
  paidAt: integer('paid_at'),
  sentAt: integer('sent_at'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  amount: real('amount').notNull(),
  category: text('category', { enum: ['Outils', 'Freelance', 'Pub', 'Formation', 'Autre'] }).notNull().default('Autre'),
  date: integer('date').notNull(),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
