import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ⭐ R&D Proposals - Système d'Auto-Amélioration
export const proposals = sqliteTable('proposals', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  originalConcept: text('original_concept').notNull(),
  sourceUrl: text('source_url').notNull(),
  sourcePlatform: text('source_platform'), // 'reddit', 'github', 'x', 'hackernews'
  altCtrlMutation: text('alt_ctrl_mutation').notNull(),
  technicalArchitecture: text('technical_architecture'),
  impactAnalysis: text('impact_analysis'),
  discoveredBy: text('discovered_by').notNull().default('abdulkhabir'),
  elevatedBy: text('elevated_by').notNull().default('abdulbasir'),
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  decidedAt: integer('decided_at', { mode: 'timestamp' }),
  decisionBy: text('decision_by'), // CEO
  implementationTaskId: text('implementation_task_id'), // Lien vers task si approuvé
});

export type Proposal = typeof proposals.$inferSelect;
