import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export type AutomationStatus = 'Actif' | 'Inactif' | 'Erreur';
export type AutomationTool = 'n8n' | 'Make' | 'Zapier' | 'Custom';

export const automations = sqliteTable('automations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  tool: text('tool', { enum: ['n8n', 'Make', 'Zapier', 'Custom'] }).notNull().default('n8n'),
  status: text('status', { enum: ['Actif', 'Inactif', 'Erreur'] }).notNull().default('Inactif'),
  triggerType: text('trigger_type'),
  lastRunAt: integer('last_run_at'),
  runCount: integer('run_count').default(0),
  errorCount: integer('error_count').default(0),
  webhookUrl: text('webhook_url'),
  notes: text('notes'),
  n8nWorkflowId: text('n8n_workflow_id'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type Automation = typeof automations.$inferSelect;
export type NewAutomation = typeof automations.$inferInsert;
