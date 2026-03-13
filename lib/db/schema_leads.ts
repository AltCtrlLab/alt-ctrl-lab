import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const leads = sqliteTable('leads', {
  id: text('id').primaryKey(),

  // Identity
  name: text('name').notNull(),
  company: text('company'),
  email: text('email'),
  phone: text('phone'),

  // Acquisition
  source: text('source', {
    enum: ['LinkedIn', 'Email', 'Instagram', 'GMB', 'Referral', 'Site'],
  }).notNull().default('Site'),

  // Pipeline status
  status: text('status', {
    enum: [
      'Nouveau',
      'Qualifié',
      'À creuser',
      'Low priority',
      'Discovery fait',
      'Proposition envoyée',
      'Relance 1',
      'Relance 2',
      'Signé',
      'Perdu',
    ],
  }).notNull().default('Nouveau'),

  // Score /10 + critères stockés en JSON
  score: integer('score').notNull().default(0),
  scoreCriteria: text('score_criteria'),

  // Budget range
  budget: text('budget', {
    enum: ['<2k', '2-5k', '5-10k', '>10k'],
  }),

  // Commercial
  propositionAmount: real('proposition_amount'),
  timeline: text('timeline'),
  notes: text('notes'),
  lostReason: text('lost_reason'),

  // Prospection / cold outreach
  website: text('website'),
  websiteScore: integer('website_score'),
  emailSentCount: integer('email_sent_count').default(0),
  lastContactedAt: integer('last_contacted_at'),

  // Key dates (INTEGER ms timestamps)
  propositionSentAt: integer('proposition_sent_at'),
  relance1SentAt: integer('relance1_sent_at'),
  relance2SentAt: integer('relance2_sent_at'),
  signedAt: integer('signed_at'),
  discoveryCallAt: integer('discovery_call_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export type LeadStatus =
  | 'Nouveau'
  | 'Qualifié'
  | 'À creuser'
  | 'Low priority'
  | 'Discovery fait'
  | 'Proposition envoyée'
  | 'Relance 1'
  | 'Relance 2'
  | 'Signé'
  | 'Perdu';

export type LeadSource = 'LinkedIn' | 'Email' | 'Instagram' | 'GMB' | 'Referral' | 'Site';
export type LeadBudget = '<2k' | '2-5k' | '5-10k' | '>10k';

export const LEAD_STATUSES: LeadStatus[] = [
  'Nouveau',
  'Qualifié',
  'À creuser',
  'Low priority',
  'Discovery fait',
  'Proposition envoyée',
  'Relance 1',
  'Relance 2',
  'Signé',
  'Perdu',
];

export const STATUS_META: Record<LeadStatus, { color: string; bg: string; border: string; dot: string }> = {
  'Nouveau':              { color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   dot: 'bg-blue-400' },
  'Qualifié':             { color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   dot: 'bg-cyan-400' },
  'À creuser':            { color: 'text-sky-400',    bg: 'bg-sky-500/10',    border: 'border-sky-500/30',    dot: 'bg-sky-400' },
  'Low priority':         { color: 'text-zinc-400',   bg: 'bg-zinc-500/10',   border: 'border-zinc-500/30',   dot: 'bg-zinc-500' },
  'Discovery fait':       { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', dot: 'bg-indigo-400' },
  'Proposition envoyée':  { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', dot: 'bg-violet-400' },
  'Relance 1':            { color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  dot: 'bg-amber-400' },
  'Relance 2':            { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  'Signé':                { color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',dot: 'bg-emerald-400' },
  'Perdu':                { color: 'text-rose-400',   bg: 'bg-rose-500/10',   border: 'border-rose-500/30',   dot: 'bg-rose-400' },
};
