import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export type AuditAction = 'create' | 'update' | 'delete';

export const auditTrail = sqliteTable('audit_trail', {
  id: text('id').primaryKey(),
  userId: text('user_id').default('system'),
  action: text('action', { enum: ['create', 'update', 'delete'] }).notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  changesJson: text('changes_json'),
  ip: text('ip'),
  createdAt: integer('created_at').notNull(),
});

export type AuditEntry = typeof auditTrail.$inferSelect;
export type NewAuditEntry = typeof auditTrail.$inferInsert;
