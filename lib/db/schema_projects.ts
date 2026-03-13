import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),

  clientName: text('client_name').notNull(),
  projectType: text('project_type', {
    enum: ['Web', 'Branding', 'IA', 'Marketing'],
  }).notNull(),

  phase: text('phase', {
    enum: ['Onboarding', 'Design', 'Dev', 'QA', 'Livraison', 'Terminé'],
  }).notNull().default('Onboarding'),

  status: text('status', {
    enum: ['Actif', 'En pause', 'Terminé', 'Annulé'],
  }).notNull().default('Actif'),

  budget: real('budget'),
  startDate: integer('start_date'),
  kickoffDate: integer('kickoff_date'),
  deadline: integer('deadline'),
  deliveredAt: integer('delivered_at'),

  hoursEstimated: real('hours_estimated').default(0),
  hoursActual: real('hours_actual').default(0),

  notes: text('notes'),
  teamAgents: text('team_agents'), // JSON array: string[]
  leadId: text('lead_id'),

  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const timeEntries = sqliteTable('time_entries', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  description: text('description').notNull(),
  hours: real('hours').notNull(),
  date: integer('date').notNull(),
  category: text('category', {
    enum: ['Design', 'Dev', 'QA', 'Réunion', 'Autre'],
  }).notNull().default('Autre'),
  createdAt: integer('created_at').notNull(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;

export type ProjectPhase = 'Onboarding' | 'Design' | 'Dev' | 'QA' | 'Livraison' | 'Terminé';
export type ProjectType = 'Web' | 'Branding' | 'IA' | 'Marketing';
export type ProjectStatus = 'Actif' | 'En pause' | 'Terminé' | 'Annulé';
export type TimeCategory = 'Design' | 'Dev' | 'QA' | 'Réunion' | 'Autre';

export const PROJECT_PHASES: ProjectPhase[] = ['Onboarding', 'Design', 'Dev', 'QA', 'Livraison', 'Terminé'];

export const TYPE_META: Record<ProjectType, { color: string; bg: string; border: string }> = {
  'Web':       { color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30' },
  'Branding':  { color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/30' },
  'IA':        { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
  'Marketing': { color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30' },
};

export const CATEGORY_COLORS: Record<TimeCategory, string> = {
  'Design':  'bg-pink-500',
  'Dev':     'bg-cyan-500',
  'QA':      'bg-amber-500',
  'Réunion': 'bg-violet-500',
  'Autre':   'bg-zinc-500',
};
