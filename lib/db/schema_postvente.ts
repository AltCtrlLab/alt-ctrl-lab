import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export type FollowupType = 'Check-in' | 'Upsell' | 'NPS' | 'Support' | 'Renouvellement';
export type FollowupStatus = 'À faire' | 'Fait' | 'Annulé';
export type FollowupPriority = 'Haute' | 'Normale' | 'Basse';

export const followups = sqliteTable('followups', {
  id: text('id').primaryKey(),
  clientName: text('client_name').notNull(),
  projectId: text('project_id'),
  leadId: text('lead_id'),
  type: text('type', { enum: ['Check-in', 'Upsell', 'NPS', 'Support', 'Renouvellement'] }).notNull().default('Check-in'),
  status: text('status', { enum: ['À faire', 'Fait', 'Annulé'] }).notNull().default('À faire'),
  priority: text('priority', { enum: ['Haute', 'Normale', 'Basse'] }).notNull().default('Normale'),
  scheduledAt: integer('scheduled_at'),
  doneAt: integer('done_at'),
  scoreNps: integer('score_nps'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type Followup = typeof followups.$inferSelect;
export type NewFollowup = typeof followups.$inferInsert;
